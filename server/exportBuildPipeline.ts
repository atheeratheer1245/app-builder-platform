import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { exportJobs, projectComponents, projectPages, type Project } from "../drizzle/schema";
import type { CloudBuildFormat } from "../shared/cloudBuild";
import { getOwnedProject, getRequiredDb } from "./appBuilderDb";
import { downloadCodemagicArtifact, getCodemagicBuild, isCodemagicBuildInProgress, selectArtifactForFormat, startCodemagicAndroidBuild } from "./codemagicBuild";
import { storageGetSignedUrl, storagePut } from "./storage";

const androidFormats = new Set<CloudBuildFormat>(["apk", "aab"]);

type BuildPage = { id: number; titleAr: string; titleEn: string; route: string };
type BuildComponent = { pageId: number; componentType: string; labelAr: string; labelEn: string; sortOrder: number };

function cleanText(value: string | null | undefined, maxLength: number) {
  return (value ?? "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, maxLength);
}

function readPrimaryColor(project: Project) {
  const settings = project.settings && typeof project.settings === "object" ? project.settings : {};
  const candidate = typeof settings.primaryColor === "string" ? settings.primaryColor.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : "#2563EB";
}

export function resolveClientApplicationId(ownerId: number, projectId: number) {
  return `sa.appbuilder.client.u${ownerId}.p${projectId}`;
}

export function exportConfigurationStorageKey(ownerId: number, projectId: number, exportJobId: number) {
  return `exports/config/${ownerId}/${projectId}/${exportJobId}.json`;
}

export function exportArtifactStorageKey(ownerId: number, projectId: number, exportJobId: number, safeFileName: string) {
  return `exports/artifacts/${ownerId}/${projectId}/${exportJobId}/${safeFileName}`;
}

type ArtifactReadyJob = { status: string; artifactKey: string | null; artifactUrl: string | null };

export function serializeExportJobForClient<T extends ArtifactReadyJob>(job: T, authorizedArtifactUrl: string | null) {
  const { artifactKey: _artifactKey, artifactUrl: _artifactUrl, ...publicJob } = job;
  return { ...publicJob, artifactUrl: authorizedArtifactUrl };
}

export async function getAuthorizedArtifactDownloadUrl(job: ArtifactReadyJob) {
  if (job.status !== "ready" || !job.artifactKey) return null;
  try {
    return await storageGetSignedUrl(job.artifactKey);
  } catch {
    return null;
  }
}

export async function serializeExportJobForOwner<T extends ArtifactReadyJob>(job: T) {
  return serializeExportJobForClient(job, await getAuthorizedArtifactDownloadUrl(job));
}

export function buildNativeExportConfiguration(input: {
  exportJobId: number;
  project: Project;
  pages: BuildPage[];
  components: BuildComponent[];
}) {
  const name = cleanText(input.project.name, 160) || "App Builder";
  const nameAr = cleanText(input.project.name, 160) || name;
  const nameEn = cleanText(input.project.name, 160) || name;
  const pages = input.pages.map(page => ({
    id: page.id,
    titleAr: cleanText(page.titleAr, 120) || nameAr,
    titleEn: cleanText(page.titleEn, 120) || nameEn,
    route: cleanText(page.route, 180),
    components: input.components
      .filter(component => component.pageId === page.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(component => ({
        type: cleanText(component.componentType, 80),
        labelAr: cleanText(component.labelAr, 160),
        labelEn: cleanText(component.labelEn, 160),
      })),
  }));
  return {
    schemaVersion: 1,
    exportJobId: input.exportJobId,
    name,
    nameAr,
    nameEn,
    category: input.project.category,
    language: input.project.language,
    primaryColor: readPrimaryColor(input.project),
    pages,
  };
}

async function getOwnedExportJob(ownerId: number, exportJobId: number) {
  const db = await getRequiredDb();
  const rows = await db.select().from(exportJobs).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, ownerId))).limit(1);
  return rows[0];
}

async function markExportFailed(ownerId: number, exportJobId: number, reason: string) {
  const db = await getRequiredDb();
  await db.update(exportJobs).set({ status: "failed", failureReason: reason, updatedAt: new Date() }).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, ownerId)));
  return getOwnedExportJob(ownerId, exportJobId);
}

export async function queueCloudBuildForExportJob(ownerId: number, exportJobId: number) {
  const currentJob = await getOwnedExportJob(ownerId, exportJobId);
  if (!currentJob) throw new Error("Export job not found");
  if (currentJob.status === "ready" || currentJob.status === "cancelled") return currentJob;
  if (!androidFormats.has(currentJob.format)) return markExportFailed(ownerId, exportJobId, "apple_signing_required");
  if (currentJob.providerBuildId) return currentJob;

  const project = await getOwnedProject(ownerId, currentJob.projectId);
  if (!project) return markExportFailed(ownerId, exportJobId, "project_not_found");
  const db = await getRequiredDb();
  const pages = await db.select().from(projectPages).where(eq(projectPages.projectId, project.id)).orderBy(asc(projectPages.sortOrder));
  const components = pages.length
    ? await db.select().from(projectComponents).where(inArray(projectComponents.pageId, pages.map(page => page.id))).orderBy(asc(projectComponents.sortOrder))
    : [];
  const configuration = buildNativeExportConfiguration({ exportJobId, project, pages, components });
  const serializedConfiguration = JSON.stringify(configuration);
  if (Buffer.byteLength(serializedConfiguration, "utf8") > 120 * 1024) return markExportFailed(ownerId, exportJobId, "project_configuration_too_large");

  try {
    const storedConfig = await storagePut(exportConfigurationStorageKey(ownerId, project.id, exportJobId), serializedConfiguration, "application/json");
    const configUrl = await storageGetSignedUrl(storedConfig.key);
    const appName = cleanText(project.name, 80) || "App Builder";
    const build = await startCodemagicAndroidBuild({
      exportJobId,
      environment: {
        APP_BUILDER_EXPORT_CONFIG_URL: configUrl,
        APP_BUILDER_APP_NAME: appName,
        APP_BUILDER_APPLICATION_ID: resolveClientApplicationId(ownerId, project.id),
        APP_BUILDER_VERSION_NAME: cleanText(project.versionName, 32) || "1.0.0",
        APP_BUILDER_VERSION_CODE: String(Math.max(1, exportJobId)),
      },
    });
    await db.update(exportJobs).set({ status: "building", buildProvider: "codemagic", providerBuildId: build.providerBuildId, failureReason: null, updatedAt: new Date() }).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, ownerId)));
    return getOwnedExportJob(ownerId, exportJobId);
  } catch {
    return markExportFailed(ownerId, exportJobId, "cloud_build_start_failed");
  }
}

export async function refreshCloudExportForJob(ownerId: number, exportJobId: number) {
  const job = await getOwnedExportJob(ownerId, exportJobId);
  if (!job || job.status === "ready" || job.status === "failed" || job.status === "cancelled" || !job.providerBuildId || job.buildProvider !== "codemagic") return job;
  try {
    const build = await getCodemagicBuild(job.providerBuildId);
    if (isCodemagicBuildInProgress(build.status)) {
      const db = await getRequiredDb();
      await db.update(exportJobs).set({ status: "building", updatedAt: new Date() }).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, ownerId)));
      return getOwnedExportJob(ownerId, exportJobId);
    }
    if (build.status !== "finished") return markExportFailed(ownerId, exportJobId, "cloud_build_failed");
    const artifact = selectArtifactForFormat(build.artifacts, job.format);
    if (!artifact) return markExportFailed(ownerId, exportJobId, "requested_artifact_missing");
    const downloaded = await downloadCodemagicArtifact(artifact.downloadUrl);
    const safeFileName = artifact.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160) || `app.${job.format}`;
    const storedArtifact = await storagePut(exportArtifactStorageKey(ownerId, job.projectId, exportJobId, safeFileName), downloaded.bytes, downloaded.contentType);
    const db = await getRequiredDb();
    await db.update(exportJobs).set({ status: "ready", artifactKey: storedArtifact.key, artifactUrl: storedArtifact.url, failureReason: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, ownerId)));
    return getOwnedExportJob(ownerId, exportJobId);
  } catch {
    return job;
  }
}

export async function refreshCloudExportsForOwner(ownerId: number) {
  const db = await getRequiredDb();
  const activeJobs = await db.select().from(exportJobs).where(and(eq(exportJobs.ownerId, ownerId), inArray(exportJobs.status, ["queued", "building"]))).orderBy(desc(exportJobs.createdAt)).limit(12);
  for (const job of activeJobs) await refreshCloudExportForJob(ownerId, job.id);
  const jobs = await db.select().from(exportJobs).where(eq(exportJobs.ownerId, ownerId)).orderBy(desc(exportJobs.createdAt));
  return Promise.all(jobs.map(job => serializeExportJobForOwner(job)));
}
