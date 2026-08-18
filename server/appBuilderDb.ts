import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  exportJobs,
  projectComponents,
  projectPages,
  projects,
  templates,
  type Project,
} from "../drizzle/schema";
import { templateCatalog } from "../shared/appBuilderCatalog";
import { getDb } from "./db";

export async function getRequiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function ensureTemplateCatalog() {
  const db = await getRequiredDb();
  const current = await db.select({ id: templates.id }).from(templates).limit(1);
  if (current.length > 0) return db.select().from(templates).where(eq(templates.isActive, 1));

  await db.insert(templates).values(
    templateCatalog.map(template => ({
      ...template,
      components: template.components,
      suggestedStructure: template.suggestedStructure,
    })),
  );
  return db.select().from(templates).where(eq(templates.isActive, 1));
}

export async function getOwnedProject(ownerId: number, projectId: number): Promise<Project | undefined> {
  const db = await getRequiredDb();
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function getProjectWorkspace(ownerId: number, projectId: number) {
  const db = await getRequiredDb();
  const project = await getOwnedProject(ownerId, projectId);
  if (!project) return undefined;
  const pages = await db
    .select()
    .from(projectPages)
    .where(eq(projectPages.projectId, projectId))
    .orderBy(asc(projectPages.sortOrder));
  const components = pages.length
    ? await db
        .select()
        .from(projectComponents)
        .where(inArray(projectComponents.pageId, pages.map(page => page.id)))
        .orderBy(asc(projectComponents.sortOrder))
    : [];
  const jobs = await db
    .select()
    .from(exportJobs)
    .where(eq(exportJobs.projectId, projectId))
    .orderBy(desc(exportJobs.createdAt));
  return { project, pages, components, jobs };
}
