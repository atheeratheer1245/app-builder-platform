import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import {
  exportJobs,
  payments,
  projectAssets,
  projectComponents,
  projectPages,
  projects,
  templates,
} from "../../drizzle/schema";
import { templateCategories } from "../../shared/appBuilderCatalog";
import { getPaidExportPrice } from "../../shared/exportPricing";
import { builderComponentTypes, gameComponentTypes, gameModes, getAllowedComponentTypes, getDefaultComponentProperties } from "../../shared/componentCatalog";
import { getDescribedGameProject } from "../../shared/gameGenerator";
import { planGameNarrative } from "../gameNarrativePlanner";
import { premiumExampleCatalog } from "../../shared/premiumExamples";
import { isSupportedProjectAssetMimeType, normalizeProjectAssetMimeType } from "../../shared/projectAssetMime";
import { getOwnedProject, getProjectWorkspace, getRequiredDb, ensureTemplateCatalog } from "../appBuilderDb";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { storagePut } from "../storage";
import { createMoyasarInvoice, requestOrigin, verifyPaidExportInvoice } from "../moyasarPaid";
import { invokeLLM } from "../_core/llm";
import { getAuthorizedArtifactDownloadUrl, queueCloudBuildForExportJob, refreshCloudExportsForOwner, serializeExportJobForOwner } from "../exportBuildPipeline";

const categorySchema = z.enum(templateCategories);
const exportInput = z.object({ projectId: z.number().int().positive(), format: z.enum(["apk", "aab", "ipa"]) });
const paidExportInput = exportInput.extend({ estimatedSizeBytes: z.number().int().min(0).max(2 * 1024 * 1024 * 1024).optional() });
const projectSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  category: categorySchema,
  templateId: z.number().int().positive().optional(),
  language: z.enum(["ar", "en", "both"]).default("both"),
  exportFormat: z.enum(["apk", "aab", "ipa"]).default("apk"),
});
const aiSuggestionInput = z.object({
  projectId: z.number().int().positive(),
  kind: z.enum(["page", "card", "product"]),
  brief: z.string().trim().min(3).max(800),
  language: z.enum(["ar", "en", "both"]).default("both"),
});
const aiSuggestionResult = z.object({
  titleAr: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().min(1).max(120),
  descriptionAr: z.string().trim().min(1).max(700),
  descriptionEn: z.string().trim().min(1).max(700),
  route: z.string().trim().min(1).max(120),
});
const motionPromptInput = z.object({
  projectId: z.number().int().positive(),
  assetId: z.number().int().positive(),
  prompt: z.string().trim().min(3).max(800),
  language: z.enum(["ar", "en", "both"]).default("both"),
});
const motionPromptResult = z.object({ motionPrompt: z.string().trim().min(3).max(800) });
const gameGenerationInput = z.object({
  projectId: z.number().int().positive(),
  brief: z.string().trim().min(3).max(1200),
  imageAssetId: z.number().int().positive().nullable().default(null),
  playerImageAssetId: z.number().int().positive().nullable().default(null),
  enemyImageAssetId: z.number().int().positive().nullable().default(null),
  bossImageAssetId: z.number().int().positive().nullable().default(null),
  stageImageAssetId: z.number().int().positive().nullable().default(null),
  videoAssetId: z.number().int().positive().nullable().default(null),
  audioAssetId: z.number().int().positive().nullable().default(null),
});
const pageBackgroundSchema = z.object({
  type: z.enum(["none", "color", "image", "video", "audio"]).default("none"),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#ffffff"),
  assetId: z.number().int().positive().nullable().default(null),
});
const pageConfigurationSchema = z.object({ background: pageBackgroundSchema.optional() }).default({});

function generatedPackageName(projectName: string) {
  const fragment = projectName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 72) || "app";
  return `com.appbuilder.${fragment}`;
}

function normalizedSuggestedRoute(value: string, fallback: string) {
  const toRouteFragment = (candidate: string) => candidate.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return `/${toRouteFragment(value) || toRouteFragment(fallback) || "page"}`;
}

function unauthenticatedProject(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

function validateComponentProperties(componentType: string, properties: Record<string, unknown>) {
  if (componentType === "Background" && !["image", "video", "audio"].includes(typeof properties.mediaType === "string" ? properties.mediaType : "image")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Background media type is not supported" });
  }
  if ((gameComponentTypes as readonly string[]).includes(componentType) && properties.gameMode !== undefined && properties.gameMode !== "custom" && !(gameModes as readonly string[]).includes(properties.gameMode as string)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Game mode is not supported" });
  }
  if ((gameComponentTypes as readonly string[]).includes(componentType) && properties.layer !== undefined && (!Number.isInteger(properties.layer) || (properties.layer as number) < 0 || (properties.layer as number) > 100)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Game component layer must be an integer from 0 to 100" });
  }
  if (componentType === "GameScene") {
    if (properties.progressionMode !== undefined && !["linear", "branching", "endless"].includes(properties.progressionMode as string)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Game-scene progression mode is not supported" });
    }
    for (const key of ["showHud", "musicEnabled", "soundEffectsEnabled", "checkpointEnabled", "persistenceEnabled"]) {
      if (properties[key] !== undefined && typeof properties[key] !== "boolean") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Game-scene ${key} must be a boolean` });
      }
    }
  }
  if (componentType === "List") {
    const items = Array.isArray(properties.items) ? properties.items : [];
    for (const item of items) {
      const values = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const labelAr = typeof values.labelAr === "string" ? values.labelAr.trim() : "";
      const labelEn = typeof values.labelEn === "string" ? values.labelEn.trim() : "";
      if ((!labelAr && !labelEn) || typeof values.targetPageId !== "number" || !Number.isInteger(values.targetPageId) || values.targetPageId < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Every navigation item needs a name and destination page" });
      }
    }
  }
  if (componentType === "Product") {
    const supportedCurrencies = new Set(["SAR", "AED", "BHD", "EGP", "EUR", "GBP", "JOD", "KWD", "OMR", "QAR", "USD"]);
    const price = properties.price;
    const salePrice = properties.salePrice;
    const stock = properties.stock;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || (salePrice !== null && salePrice !== undefined && (typeof salePrice !== "number" || !Number.isFinite(salePrice) || salePrice < 0)) || typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || !supportedCurrencies.has(typeof properties.currency === "string" ? properties.currency : "SAR")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Product price, currency, and stock are invalid" });
    }
  }
  if (componentType === "PaymentPlatform") {
    const supportedCurrencies = new Set(["SAR", "AED", "BHD", "EGP", "EUR", "GBP", "JOD", "KWD", "OMR", "QAR", "USD"]);
    if ((properties.mode !== "product" && properties.mode !== "subscription") || typeof properties.amount !== "number" || !Number.isFinite(properties.amount) || properties.amount < 0 || !supportedCurrencies.has(typeof properties.currency === "string" ? properties.currency : "SAR")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Payment platform amount, currency, or mode is invalid" });
    }
  }
}

async function validateDestinationPages(projectId: number, componentType: string, properties: Record<string, unknown>) {
  const destinationIds = new Set<number>();
  const addDestination = (value: unknown) => { if (typeof value === "number" && Number.isInteger(value) && value > 0) destinationIds.add(value); };
  if (componentType === "Button") addDestination(properties.targetPageId);
  if (componentType === "Card") addDestination(properties.actionPageId);
  if (componentType === "List") for (const item of Array.isArray(properties.items) ? properties.items : []) addDestination(item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).targetPageId : undefined);
  if (componentType === "Condition") { addDestination(properties.successPageId); addDestination(properties.failurePageId); }
  if (componentType === "PaymentPlatform") addDestination(properties.successPageId);
  if (!destinationIds.size) return;
  const db = await getRequiredDb();
  const matches = await Promise.all(Array.from(destinationIds).map(pageId => db.select({ id: projectPages.id }).from(projectPages).where(and(eq(projectPages.id, pageId), eq(projectPages.projectId, projectId))).limit(1)));
  if (matches.some(rows => !rows[0])) throw new TRPCError({ code: "BAD_REQUEST", message: "Each destination page must belong to this project" });
}

async function getNextPageOrder(projectId: number) {
  const db = await getRequiredDb();
  const current = await db.select({ maxOrder: max(projectPages.sortOrder) }).from(projectPages).where(eq(projectPages.projectId, projectId));
  return (current[0]?.maxOrder ?? -1) + 1;
}

async function normalizeMediaProperties(input: { ownerId: number; projectId: number; componentType: string; properties: Record<string, unknown> }) {
  if (input.componentType === "Player") {
    const normalized = { ...input.properties };
    const playerMedia = [{ idKey: "imageAssetId", urlKey: "imageAssetUrl", mimePrefix: "image/" }, { idKey: "videoAssetId", urlKey: "videoAssetUrl", mimePrefix: "video/" }, { idKey: "audioAssetId", urlKey: "audioAssetUrl", mimePrefix: "audio/" }];
    const db = await getRequiredDb();
    for (const media of playerMedia) {
      const assetId = normalized[media.idKey];
      if (assetId === null || assetId === undefined || assetId === "") { normalized[media.idKey] = null; normalized[media.urlKey] = ""; continue; }
      if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid player media attachment from this project gallery" });
      const asset = (await db.select({ id: projectAssets.id, url: projectAssets.url, mimeType: projectAssets.mimeType }).from(projectAssets).where(and(eq(projectAssets.id, assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, input.ownerId))).limit(1))[0];
      if (!asset || !asset.mimeType.startsWith(media.mimePrefix)) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected player media does not match the required type" });
      normalized[media.idKey] = asset.id;
      normalized[media.urlKey] = asset.url;
    }
    return normalized;
  }
  const backgroundType = typeof input.properties.mediaType === "string" ? input.properties.mediaType : "image";
  const mimePrefix = input.componentType === "Image" || input.componentType === "ImageAnimation" ? "image/" : input.componentType === "Video" ? "video/" : input.componentType === "Audio" ? "audio/" : input.componentType === "PDFDocument" ? "application/pdf" : input.componentType === "Background" ? backgroundType === "video" ? "video/" : backgroundType === "audio" ? "audio/" : "image/" : null;
  if (!mimePrefix) return input.properties;
  const assetId = input.properties.assetId;
  if (assetId === null || assetId === undefined || assetId === "") return { ...input.properties, assetId: null, assetUrl: "" };
  if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid media attachment from this project gallery" });
  const db = await getRequiredDb();
  const asset = (await db.select({ id: projectAssets.id, url: projectAssets.url, mimeType: projectAssets.mimeType }).from(projectAssets).where(and(eq(projectAssets.id, assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, input.ownerId))).limit(1))[0];
  if (!asset || !asset.mimeType.startsWith(mimePrefix)) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected attachment does not match the required media type" });
  return { ...input.properties, assetId: asset.id, assetUrl: asset.url };
}

async function normalizePageConfiguration(input: { ownerId: number; projectId: number; configuration: { background?: z.infer<typeof pageBackgroundSchema> } }) {
  const background = input.configuration.background ?? { type: "none" as const, color: "#ffffff", assetId: null };
  if (background.type === "none" || background.type === "color") return { background: { type: background.type, color: background.color, assetId: null, assetUrl: "" } };
  if (!background.assetId) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a project asset for the page background" });
  const expectedPrefix = background.type === "image" ? "image/" : background.type === "video" ? "video/" : "audio/";
  const db = await getRequiredDb();
  const asset = (await db.select({ id: projectAssets.id, url: projectAssets.url, mimeType: projectAssets.mimeType }).from(projectAssets).where(and(eq(projectAssets.id, background.assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, input.ownerId))).limit(1))[0];
  if (!asset || !asset.mimeType.startsWith(expectedPrefix)) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected asset does not match the page background type" });
  return { background: { type: background.type, color: background.color, assetId: asset.id, assetUrl: asset.url } };
}

async function getOwnedGameGeneratorAsset(input: { ownerId: number; projectId: number; assetId: number | null; mimePrefix: string; label: string }) {
  if (!input.assetId) return null;
  const db = await getRequiredDb();
  const asset = (await db.select({ id: projectAssets.id, url: projectAssets.url, filename: projectAssets.filename, mimeType: projectAssets.mimeType }).from(projectAssets).where(and(
    eq(projectAssets.id, input.assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, input.ownerId),
  )).limit(1))[0];
  if (!asset || !asset.mimeType.startsWith(input.mimePrefix)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Select an owned ${input.label} asset from this project gallery` });
  }
  return { id: asset.id, url: asset.url, filename: asset.filename };
}

export const appBuilderRouter = router({
  templates: router({
    list: publicProcedure.query(async () => ensureTemplateCatalog()),
    getById: publicProcedure.input(z.number().int().positive()).query(async ({ input }) => {
      await ensureTemplateCatalog();
      const db = await getRequiredDb();
      const rows = await db.select().from(templates).where(eq(templates.id, input)).limit(1);
      return rows[0] ?? null;
    }),
  }),
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getRequiredDb();
      return db.select().from(projects).where(eq(projects.ownerId, ctx.user.id)).orderBy(desc(projects.updatedAt));
    }),
    getWorkspace: protectedProcedure.input(z.number().int().positive()).query(async ({ ctx, input }) => {
      const workspace = await getProjectWorkspace(ctx.user.id, input);
      if (!workspace) unauthenticatedProject();
      return workspace;
    }),
    create: protectedProcedure.input(projectSchema).mutation(async ({ ctx, input }) => {
      const db = await getRequiredDb();
      await ensureTemplateCatalog();
      const selectedTemplate = input.templateId
        ? (await db.select().from(templates).where(eq(templates.id, input.templateId)).limit(1))[0]
        : undefined;
      if (input.templateId && !selectedTemplate) throw new TRPCError({ code: "BAD_REQUEST", message: "Template not found" });
      if (selectedTemplate && selectedTemplate.category !== input.category) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template category mismatch" });
      }
      const result = await db.insert(projects).values({
        ownerId: ctx.user.id,
        templateId: selectedTemplate?.id,
        name: input.name,
        description: input.description || null,
        category: input.category,
        language: input.language,
        packageName: generatedPackageName(input.name),
        settings: { theme: "system", primaryColor: selectedTemplate?.accentColor ?? "#2563EB", exportFormat: input.exportFormat },
      });
      const projectId = Number(result[0]?.insertId ?? 0);
      if (!projectId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project creation failed" });
      const structure = selectedTemplate?.suggestedStructure ?? [];
      if (structure.length) {
        await db.insert(projectPages).values(
          structure.map((page, sortOrder) => ({
            projectId,
            sourcePageKey: page.key,
            titleAr: page.titleAr,
            titleEn: page.titleEn,
            route: `/${page.key}`,
            sortOrder,
            configuration: {},
          })),
        );
      }
      return { id: projectId };
    }),
    createFromExample: protectedProcedure.input(z.object({ slug: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => {
      const example = premiumExampleCatalog.find(item => item.slug === input.slug);
      if (!example) throw new TRPCError({ code: "NOT_FOUND", message: "Example not found" });
      const db = await getRequiredDb();
      const result = await db.insert(projects).values({
        ownerId: ctx.user.id,
        name: example.nameAr,
        description: example.descriptionAr,
        category: example.category,
        language: "both",
        settings: { theme: "system", primaryColor: example.accentColor, source: "premium-example", exampleSlug: example.slug, exportFormat: "apk" },
      });
      const projectId = Number(result[0]?.insertId ?? 0);
      if (!projectId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Example project creation failed" });
      const pageIdsByKey: Record<string, number> = {};
      for (let sortOrder = 0; sortOrder < example.pages.length; sortOrder += 1) {
        const page = example.pages[sortOrder];
        const pageResult = await db.insert(projectPages).values({
          projectId,
          sourcePageKey: page.key,
          titleAr: page.titleAr,
          titleEn: page.titleEn,
          route: `/${page.key}`,
          sortOrder,
          configuration: { source: "premium-example", exampleSlug: example.slug },
        });
        const pageId = Number(pageResult[0]?.insertId ?? 0);
        if (!pageId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Example page creation failed" });
        pageIdsByKey[page.key] = pageId;
      }
      for (let sortOrder = 0; sortOrder < example.components.length; sortOrder += 1) {
        const component = example.components[sortOrder];
        const properties = JSON.parse(JSON.stringify(component.properties)) as Record<string, unknown>;
        if (typeof properties.targetPageKey === "string") { properties.targetPageId = pageIdsByKey[properties.targetPageKey]; delete properties.targetPageKey; }
        if (typeof properties.actionPageKey === "string") { properties.actionPageId = pageIdsByKey[properties.actionPageKey]; delete properties.actionPageKey; }
        if (typeof properties.contextPageKey === "string") { properties.contextPageId = pageIdsByKey[properties.contextPageKey]; delete properties.contextPageKey; }
        if (typeof properties.successPageKey === "string") { properties.successPageId = pageIdsByKey[properties.successPageKey]; delete properties.successPageKey; }
        if (typeof properties.failurePageKey === "string") { properties.failurePageId = pageIdsByKey[properties.failurePageKey]; delete properties.failurePageKey; }
        if (Array.isArray(properties.items)) properties.items = properties.items.map(item => {
          const navItem = item && typeof item === "object" ? { ...(item as Record<string, unknown>) } : {};
          if (typeof navItem.targetPageKey === "string") { navItem.targetPageId = pageIdsByKey[navItem.targetPageKey]; delete navItem.targetPageKey; }
          return navItem;
        });
        await db.insert(projectComponents).values({
          projectId,
          pageId: pageIdsByKey[component.pageKey],
          componentType: component.componentType,
          labelAr: component.labelAr,
          labelEn: component.labelEn,
          sortOrder,
          properties: { ...properties, source: "premium-example", exampleSlug: example.slug },
        });
      }
      return { id: projectId, nameAr: example.nameAr, nameEn: example.nameEn };
    }),
    update: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), data: projectSchema.partial() })).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const db = await getRequiredDb();
      const data = input.data;
      await db.update(projects).set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.language ? { language: data.language } : {}),
        updatedAt: new Date(),
      }).where(eq(projects.id, input.projectId));
      return { success: true };
    }),
    remove: protectedProcedure.input(z.number().int().positive()).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input);
      if (!project) unauthenticatedProject();
      const db = await getRequiredDb();
      await db.delete(projects).where(eq(projects.id, input));
      return { success: true };
    }),
  }),
  editor: router({
    updateAppIcon: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), assetId: z.number().int().positive().nullable() })).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const db = await getRequiredDb();
      let appIconAssetId: number | null = null;
      let appIconUrl = "";
      if (input.assetId) {
        const asset = (await db.select({ id: projectAssets.id, url: projectAssets.url, mimeType: projectAssets.mimeType }).from(projectAssets).where(and(eq(projectAssets.id, input.assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, ctx.user.id))).limit(1))[0];
        if (!asset || !asset.mimeType.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an image asset owned by this project for the app icon" });
        appIconAssetId = asset.id;
        appIconUrl = asset.url;
      }
      await db.update(projects).set({ settings: { ...(project.settings ?? {}), appIconAssetId, appIconUrl }, updatedAt: new Date() }).where(eq(projects.id, input.projectId));
      return { success: true, appIconAssetId, appIconUrl };
    }),
    addPage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), titleAr: z.string().min(1).max(120), titleEn: z.string().min(1).max(120), route: z.string().min(1).max(180) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      const sortOrder = await getNextPageOrder(input.projectId);
      const result = await db.insert(projectPages).values({ ...input, sortOrder, configuration: {} });
      return { id: Number(result[0]?.insertId ?? 0) };
    }),
    updatePage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive(), titleAr: z.string().min(1).max(120), titleEn: z.string().min(1).max(120), route: z.string().min(1).max(180), configuration: pageConfigurationSchema })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      const configuration = await normalizePageConfiguration({ ownerId: ctx.user.id, projectId: input.projectId, configuration: input.configuration });
      await db.update(projectPages).set({ titleAr: input.titleAr, titleEn: input.titleEn, route: input.route, configuration, updatedAt: new Date() }).where(and(eq(projectPages.id, input.pageId), eq(projectPages.projectId, input.projectId)));
      return { success: true };
    }),
    deletePage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await db.delete(projectPages).where(and(eq(projectPages.id, input.pageId), eq(projectPages.projectId, input.projectId)));
      return { success: true };
    }),
    reorderPages: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await Promise.all(input.pageIds.map((pageId, sortOrder) => db.update(projectPages).set({ sortOrder, updatedAt: new Date() }).where(and(eq(projectPages.id, pageId), eq(projectPages.projectId, input.projectId)))));
      return { success: true };
    }),
    generateGame: protectedProcedure.input(gameGenerationInput).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      if (project.category !== "games") throw new TRPCError({ code: "BAD_REQUEST", message: "Game generation is available only for game projects" });
      const db = await getRequiredDb();
      const [image, playerImage, enemyImage, bossImage, stageImage, video, audio] = await Promise.all([
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.imageAssetId, mimePrefix: "image/", label: "image" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.playerImageAssetId, mimePrefix: "image/", label: "player image" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.enemyImageAssetId, mimePrefix: "image/", label: "enemy image" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.bossImageAssetId, mimePrefix: "image/", label: "boss image" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.stageImageAssetId, mimePrefix: "image/", label: "stage image" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.videoAssetId, mimePrefix: "video/", label: "video" }),
        getOwnedGameGeneratorAsset({ ownerId: ctx.user.id, projectId: input.projectId, assetId: input.audioAssetId, mimePrefix: "audio/", label: "audio" }),
      ]);
      const narrative = await planGameNarrative(input.brief);
      const blueprint = getDescribedGameProject({ brief: input.brief, image, playerImage, enemyImage, bossImage, stageImage, video, audio, narrative });
      const existing = await db.select({ id: projectComponents.id, componentType: projectComponents.componentType, properties: projectComponents.properties }).from(projectComponents).where(eq(projectComponents.projectId, input.projectId));
      const generatedIds = existing.filter(component => (component.properties as Record<string, unknown> | null)?.generatedBy === "game-generator").map(component => component.id);
      if (generatedIds.length) await Promise.all(generatedIds.map(id => db.delete(projectComponents).where(and(eq(projectComponents.id, id), eq(projectComponents.projectId, input.projectId)))));
      const projectPagesRows = await db.select({ id: projectPages.id, sourcePageKey: projectPages.sourcePageKey, sortOrder: projectPages.sortOrder }).from(projectPages).where(eq(projectPages.projectId, input.projectId));
      const pageIds = new Map<string, number>();
      for (let index = 0; index < blueprint.pages.length; index += 1) {
        const page = blueprint.pages[index];
        const existingPage = projectPagesRows.find(row => row.sourcePageKey === page.key);
        if (existingPage) {
          await db.update(projectPages).set({ titleAr: page.titleAr, titleEn: page.titleEn, route: page.route, sortOrder: index, configuration: { source: "game-generator", generatorVersion: 3, generatorBrief: input.brief }, updatedAt: new Date() }).where(and(eq(projectPages.id, existingPage.id), eq(projectPages.projectId, input.projectId)));
          pageIds.set(page.key, existingPage.id);
        } else {
          const inserted = await db.insert(projectPages).values({ projectId: input.projectId, sourcePageKey: page.key, titleAr: page.titleAr, titleEn: page.titleEn, route: page.route, sortOrder: index, configuration: { source: "game-generator", generatorVersion: 3, generatorBrief: input.brief } });
          const pageId = Number(inserted[0]?.insertId ?? 0);
          if (!pageId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Game page creation failed" });
          pageIds.set(page.key, pageId);
        }
      }
      const generatedComponents = [] as Array<{ projectId: number; pageId: number; componentType: string; labelAr: string; labelEn: string; properties: Record<string, unknown>; sortOrder: number }>;
      for (const page of blueprint.pages) {
        const pageId = pageIds.get(page.key);
        if (!pageId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Generated game page is unavailable" });
        const current = await db.select({ maxOrder: max(projectComponents.sortOrder) }).from(projectComponents).where(eq(projectComponents.pageId, pageId));
        for (let index = 0; index < page.components.length; index += 1) {
          const component = page.components[index];
          const rawProperties = JSON.parse(JSON.stringify(component.properties)) as Record<string, unknown>;
          if (typeof rawProperties.targetPageKey === "string") { rawProperties.targetPageId = pageIds.get(rawProperties.targetPageKey) ?? null; delete rawProperties.targetPageKey; }
          if (typeof rawProperties.actionPageKey === "string") { rawProperties.actionPageId = pageIds.get(rawProperties.actionPageKey) ?? null; delete rawProperties.actionPageKey; }
          if (typeof rawProperties.successPageKey === "string") { rawProperties.successPageId = pageIds.get(rawProperties.successPageKey) ?? null; delete rawProperties.successPageKey; }
          const properties = await normalizeMediaProperties({ ownerId: ctx.user.id, projectId: input.projectId, componentType: component.componentType, properties: { ...getDefaultComponentProperties(component.componentType, "games"), ...rawProperties, generatedBy: "game-generator", generatorVersion: 3 } });
          validateComponentProperties(component.componentType, properties);
          await validateDestinationPages(input.projectId, component.componentType, properties);
          generatedComponents.push({ projectId: input.projectId, pageId, componentType: component.componentType, labelAr: component.labelAr, labelEn: component.labelEn, properties, sortOrder: (current[0]?.maxOrder ?? -1) + index + 1 });
        }
      }
      await db.insert(projectComponents).values(generatedComponents);
      return { pageCount: blueprint.pages.length, componentCount: generatedComponents.length, titleAr: blueprint.titleAr, titleEn: blueprint.titleEn, multimedia: { image: Boolean(image), video: Boolean(video), audio: Boolean(audio), brief: true } };
    }),
    addComponent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive(), componentType: z.enum(builderComponentTypes), labelAr: z.string().trim().max(160).default(""), labelEn: z.string().trim().max(160).default(""), properties: z.record(z.string(), z.unknown()).default({}) })).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const categoryForDefaults = project.category === "custom" ? "services" : project.category;
      if (!getAllowedComponentTypes(categoryForDefaults).includes(input.componentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Component is not available for this template category" });
      const properties = await normalizeMediaProperties({ ownerId: ctx.user.id, projectId: input.projectId, componentType: input.componentType, properties: { ...getDefaultComponentProperties(input.componentType, categoryForDefaults), ...input.properties } });
      validateComponentProperties(input.componentType, properties);
      await validateDestinationPages(input.projectId, input.componentType, properties);
      const db = await getRequiredDb();
      const current = await db.select({ maxOrder: max(projectComponents.sortOrder) }).from(projectComponents).where(eq(projectComponents.pageId, input.pageId));
      const result = await db.insert(projectComponents).values({ ...input, properties, sortOrder: (current[0]?.maxOrder ?? -1) + 1 });
      return { id: Number(result[0]?.insertId ?? 0) };
    }),
    updateComponent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), componentId: z.number().int().positive(), componentType: z.enum(builderComponentTypes), labelAr: z.string().trim().max(160).default(""), labelEn: z.string().trim().max(160).default(""), properties: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const categoryForDefaults = project.category === "custom" ? "services" : project.category;
      if (!getAllowedComponentTypes(categoryForDefaults).includes(input.componentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Component is not available for this template category" });
      const properties = input.properties ? await normalizeMediaProperties({ ownerId: ctx.user.id, projectId: input.projectId, componentType: input.componentType, properties: input.properties }) : undefined;
      if (properties) validateComponentProperties(input.componentType, properties);
      if (properties) await validateDestinationPages(input.projectId, input.componentType, properties);
      const db = await getRequiredDb();
      await db.update(projectComponents).set({ componentType: input.componentType, labelAr: input.labelAr, labelEn: input.labelEn, ...(properties ? { properties } : {}), updatedAt: new Date() }).where(and(eq(projectComponents.id, input.componentId), eq(projectComponents.projectId, input.projectId)));
      return { success: true };
    }),
    reorderComponents: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive(), componentIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await Promise.all(input.componentIds.map((componentId, sortOrder) => db.update(projectComponents).set({ sortOrder, updatedAt: new Date() }).where(and(eq(projectComponents.id, componentId), eq(projectComponents.projectId, input.projectId), eq(projectComponents.pageId, input.pageId)))));
      return { success: true };
    }),
    deleteComponent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), componentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await db.delete(projectComponents).where(and(eq(projectComponents.id, input.componentId), eq(projectComponents.projectId, input.projectId)));
      return { success: true };
    }),
  }),
  ai: router({
    suggest: protectedProcedure.input(aiSuggestionInput).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const requestLabel = input.kind === "page" ? "mobile application page" : input.kind === "card" ? "information card" : "product listing";
      try {
        const response = await invokeLLM({
          model: "gemini-3-flash-preview",
          maxTokens: 900,
          messages: [
            {
              role: "system",
              content: "You write concise, original app content. Never reproduce copyrighted passages, lyrics, book text, or distinctive trademarks. Do not assist with illegal, hateful, sexual, or deceptive content. Return only the JSON object required by the response schema. Provide clear Modern Standard Arabic and natural English, even if one language is requested, because the editor stores bilingual fields.",
            },
            {
              role: "user",
              content: `Create copy for a ${requestLabel} in an App Builder project. Project category: ${project.category}. Requested interface language: ${input.language}. User brief: ${input.brief}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "app_builder_content_suggestion",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  titleAr: { type: "string" }, titleEn: { type: "string" }, descriptionAr: { type: "string" }, descriptionEn: { type: "string" }, route: { type: "string" },
                },
                required: ["titleAr", "titleEn", "descriptionAr", "descriptionEn", "route"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message.content;
        const parsed = typeof content === "string" ? aiSuggestionResult.safeParse(JSON.parse(content)) : { success: false as const };
        if (!parsed.success) throw new Error("Invalid AI response");
        return { ...parsed.data, route: normalizedSuggestedRoute(parsed.data.route, parsed.data.titleEn) };
      } catch (error) {
        console.error("[App Builder AI] Suggestion failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI suggestion could not be generated" });
      }
    }),
    improveMotionPrompt: protectedProcedure.input(motionPromptInput).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const db = await getRequiredDb();
      const asset = (await db.select({ id: projectAssets.id }).from(projectAssets).where(and(
        eq(projectAssets.id, input.assetId), eq(projectAssets.projectId, input.projectId), eq(projectAssets.ownerId, ctx.user.id),
      )).limit(1))[0];
      if (!asset) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an image asset owned by this project" });
      try {
        const response = await invokeLLM({
          model: "gemini-3-flash-preview",
          maxTokens: 400,
          messages: [
            { role: "system", content: "You improve concise image-to-video motion prompts for a mobile game. Keep the subject identity stable, describe only visible natural motion and subtle camera motion, avoid copyrighted characters or franchises, unsafe acts, sexual content, and text overlays. Return only JSON with a single motionPrompt field. Use the language requested by the user." },
            { role: "user", content: `Project category: ${project.category}. Requested language: ${input.language}. User motion idea: ${input.prompt}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "motion_prompt_suggestion",
              strict: true,
              schema: { type: "object", properties: { motionPrompt: { type: "string" } }, required: ["motionPrompt"], additionalProperties: false },
            },
          },
        });
        const content = response.choices[0]?.message.content;
        let parsed: ReturnType<typeof motionPromptResult.safeParse> | { success: false } = { success: false };
        if (typeof content === "string") {
          try { parsed = motionPromptResult.safeParse(JSON.parse(content)); } catch { parsed = { success: false }; }
        }
        if (!parsed.success) throw new Error("Invalid motion prompt response");
        return parsed.data;
      } catch (error) {
        console.error("[App Builder AI] Motion prompt refinement failed", error);
        return { motionPrompt: input.prompt };
      }
    }),
  }),
  assets: router({
    list: protectedProcedure.input(z.number().int().positive()).query(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input)) unauthenticatedProject();
      const db = await getRequiredDb();
      return db.select().from(projectAssets).where(and(eq(projectAssets.projectId, input), eq(projectAssets.ownerId, ctx.user.id))).orderBy(desc(projectAssets.createdAt));
    }),
    upload: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), filename: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), kind: z.enum(["icon", "image", "font", "document", "other"]), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const mimeType = normalizeProjectAssetMimeType(input.filename, input.mimeType);
      if (!isSupportedProjectAssetMimeType(mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported asset type. Upload an image, video, audio, PDF, or font file." });
      const bytes = Buffer.from(input.dataBase64, "base64");
      const supportsExpandedMedia = mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType === "application/pdf";
      const byteLimit = supportsExpandedMedia ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
      if (!bytes.length || bytes.length > byteLimit) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: supportsExpandedMedia ? "Audio, video, and PDF assets must be no larger than 25 MB" : "Asset must be no larger than 5 MB" });
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { key, url } = await storagePut(`app-builder/${ctx.user.id}/${input.projectId}/${Date.now()}-${safeName}`, bytes, mimeType);
      const db = await getRequiredDb();
      const result = await db.insert(projectAssets).values({ projectId: input.projectId, ownerId: ctx.user.id, kind: input.kind, filename: input.filename, storageKey: key, url, mimeType, sizeBytes: bytes.length });
      return { id: Number(result[0]?.insertId ?? 0), url };
    }),
  }),
  exports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getRequiredDb();
      const jobs = await db.select().from(exportJobs).where(eq(exportJobs.ownerId, ctx.user.id)).orderBy(desc(exportJobs.createdAt));
      return Promise.all(jobs.map(job => serializeExportJobForOwner(job)));
    }),
    create: protectedProcedure.input(exportInput).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      if (project.category === "custom") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a supported template category before export" });
      const db = await getRequiredDb();
      const result = await db.insert(exportJobs).values({
        projectId: project.id,
        ownerId: ctx.user.id,
        format: input.format,
        status: "queued",
        estimatedSizeBytes: project.estimatedSizeBytes,
        sizeUnits: 1,
        unitPriceHalalas: 0,
        totalPriceHalalas: 0,
      });
      const exportJobId = Number(result[0]?.insertId ?? 0);
      if (!exportJobId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create export request" });
      const job = await queueCloudBuildForExportJob(ctx.user.id, exportJobId);
      return { exportJobId, status: job?.status ?? "queued" };
    }),
    quotePaid: protectedProcedure.input(paidExportInput).query(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      if (project.category === "custom") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a supported template category before export" });
      const estimatedSizeBytes = input.estimatedSizeBytes ?? project.estimatedSizeBytes;
      return { ...getPaidExportPrice(project.category, estimatedSizeBytes), format: input.format, estimatedSizeBytes };
    }),
    createPaidInvoice: protectedProcedure.input(paidExportInput).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      if (project.category === "custom") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a supported template category before export" });
      const estimatedSizeBytes = input.estimatedSizeBytes ?? project.estimatedSizeBytes;
      const quote = getPaidExportPrice(project.category, estimatedSizeBytes);
      const db = await getRequiredDb();
      const jobResult = await db.insert(exportJobs).values({
        projectId: project.id,
        ownerId: ctx.user.id,
        format: input.format,
        status: "pending_payment",
        estimatedSizeBytes,
        sizeUnits: quote.sizeUnits,
        unitPriceHalalas: quote.unitPriceHalalas,
        totalPriceHalalas: quote.totalPriceHalalas,
      });
      const exportJobId = Number(jobResult[0]?.insertId ?? 0);
      if (!exportJobId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to prepare paid export" });
      try {
        const invoice = await createMoyasarInvoice({
          amountHalalas: quote.totalPriceHalalas,
          description: `App Builder ${input.format.toUpperCase()} export · ${project.name}`,
          origin: requestOrigin(ctx.req),
          exportJobId,
          projectId: project.id,
        });
        const paymentResult = await db.insert(payments).values({
          ownerId: ctx.user.id,
          exportJobId,
          provider: "moyasar",
          status: invoice.status === "paid" ? "paid" : "pending",
          amountHalalas: quote.totalPriceHalalas,
          currency: "SAR",
          providerChargeId: invoice.id,
          checkoutUrl: invoice.url,
          metadata: { kind: "paid_export", invoiceStatus: invoice.status, format: input.format, category: project.category },
          ...(invoice.status === "paid" ? { paidAt: new Date() } : {}),
        });
        const paymentId = Number(paymentResult[0]?.insertId ?? 0);
        if (!paymentId) throw new Error("Unable to record paid export invoice");
        if (invoice.status === "paid") {
          const verification = await verifyPaidExportInvoice({ paymentId, ownerId: ctx.user.id });
          if (verification.paid && verification.exportJobId) await queueCloudBuildForExportJob(ctx.user.id, verification.exportJobId);
        }
        return { exportJobId, paymentId, checkoutUrl: invoice.url, quote };
      } catch (cause) {
        await db.update(exportJobs).set({ status: "cancelled", failureReason: "Unable to create Moyasar invoice", updatedAt: new Date() }).where(eq(exportJobs.id, exportJobId));
        throw new TRPCError({ code: "BAD_GATEWAY", message: cause instanceof Error ? cause.message : "Unable to create payment invoice" });
      }
    }),
    verifyPaidInvoice: protectedProcedure.input(z.object({ paymentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await verifyPaidExportInvoice({ paymentId: input.paymentId, ownerId: ctx.user.id });
      if (result.paid && result.exportJobId) await queueCloudBuildForExportJob(ctx.user.id, result.exportJobId);
      if (!result.paid) return result;
      return result;
    }),
    refresh: protectedProcedure.mutation(async ({ ctx }) => refreshCloudExportsForOwner(ctx.user.id)),
    download: protectedProcedure.input(z.number().int().positive()).query(async ({ ctx, input }) => {
      const db = await getRequiredDb();
      const rows = await db.select().from(exportJobs).where(and(eq(exportJobs.id, input), eq(exportJobs.ownerId, ctx.user.id))).limit(1);
      const job = rows[0];
      if (!job) unauthenticatedProject();
      const artifactUrl = await getAuthorizedArtifactDownloadUrl(job);
      if (!artifactUrl) {
        return { available: false as const, status: job.status, artifactUrl: null };
      }
      return { available: true as const, status: job.status, artifactUrl };
    }),
  }),
});
