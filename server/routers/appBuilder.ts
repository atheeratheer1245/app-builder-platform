import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import {
  exportJobs,
  projectAssets,
  projectComponents,
  projectPages,
  projects,
  templates,
} from "../../drizzle/schema";
import { templateCategories } from "../../shared/appBuilderCatalog";
import { getOwnedProject, getProjectWorkspace, getRequiredDb, ensureTemplateCatalog } from "../appBuilderDb";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { storagePut } from "../storage";

const categorySchema = z.enum(templateCategories);
const exportInput = z.object({ projectId: z.number().int().positive(), format: z.enum(["apk", "aab", "ipa"]) });
const projectSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  category: categorySchema,
  templateId: z.number().int().positive().optional(),
  language: z.enum(["ar", "en", "both"]).default("both"),
  packageName: z.string().trim().max(180).optional(),
});

function unauthenticatedProject(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

async function getNextPageOrder(projectId: number) {
  const db = await getRequiredDb();
  const current = await db.select({ maxOrder: max(projectPages.sortOrder) }).from(projectPages).where(eq(projectPages.projectId, projectId));
  return (current[0]?.maxOrder ?? -1) + 1;
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
        packageName: input.packageName || null,
        settings: { theme: "system", primaryColor: selectedTemplate?.accentColor ?? "#2563EB" },
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
    update: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), data: projectSchema.partial() })).mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.user.id, input.projectId);
      if (!project) unauthenticatedProject();
      const db = await getRequiredDb();
      const data = input.data;
      await db.update(projects).set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.packageName !== undefined ? { packageName: data.packageName || null } : {}),
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
    addPage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), titleAr: z.string().min(1).max(120), titleEn: z.string().min(1).max(120), route: z.string().min(1).max(180) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      const sortOrder = await getNextPageOrder(input.projectId);
      const result = await db.insert(projectPages).values({ ...input, sortOrder, configuration: {} });
      return { id: Number(result[0]?.insertId ?? 0) };
    }),
    updatePage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive(), titleAr: z.string().min(1).max(120), titleEn: z.string().min(1).max(120), route: z.string().min(1).max(180) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await db.update(projectPages).set({ titleAr: input.titleAr, titleEn: input.titleEn, route: input.route, updatedAt: new Date() }).where(and(eq(projectPages.id, input.pageId), eq(projectPages.projectId, input.projectId)));
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
    addComponent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), pageId: z.number().int().positive(), componentType: z.string().min(1).max(80), labelAr: z.string().min(1).max(160), labelEn: z.string().min(1).max(160), properties: z.record(z.string(), z.unknown()).default({}) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      const current = await db.select({ maxOrder: max(projectComponents.sortOrder) }).from(projectComponents).where(eq(projectComponents.pageId, input.pageId));
      const result = await db.insert(projectComponents).values({ ...input, sortOrder: (current[0]?.maxOrder ?? -1) + 1 });
      return { id: Number(result[0]?.insertId ?? 0) };
    }),
    updateComponent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), componentId: z.number().int().positive(), componentType: z.string().min(1).max(80), labelAr: z.string().min(1).max(160), labelEn: z.string().min(1).max(160) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const db = await getRequiredDb();
      await db.update(projectComponents).set({ componentType: input.componentType, labelAr: input.labelAr, labelEn: input.labelEn, updatedAt: new Date() }).where(and(eq(projectComponents.id, input.componentId), eq(projectComponents.projectId, input.projectId)));
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
  assets: router({
    list: protectedProcedure.input(z.number().int().positive()).query(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input)) unauthenticatedProject();
      const db = await getRequiredDb();
      return db.select().from(projectAssets).where(and(eq(projectAssets.projectId, input), eq(projectAssets.ownerId, ctx.user.id))).orderBy(desc(projectAssets.createdAt));
    }),
    upload: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), filename: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), kind: z.enum(["icon", "image", "font", "document", "other"]), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (!await getOwnedProject(ctx.user.id, input.projectId)) unauthenticatedProject();
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Asset must be no larger than 5 MB" });
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { key, url } = await storagePut(`app-builder/${ctx.user.id}/${input.projectId}/${Date.now()}-${safeName}`, bytes, input.mimeType);
      const db = await getRequiredDb();
      const result = await db.insert(projectAssets).values({ projectId: input.projectId, ownerId: ctx.user.id, kind: input.kind, filename: input.filename, storageKey: key, url, mimeType: input.mimeType, sizeBytes: bytes.length });
      return { id: Number(result[0]?.insertId ?? 0), url };
    }),
  }),
  exports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getRequiredDb();
      return db.select().from(exportJobs).where(eq(exportJobs.ownerId, ctx.user.id)).orderBy(desc(exportJobs.createdAt));
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
      return { exportJobId, status: "queued" as const };
    }),
  }),
});
