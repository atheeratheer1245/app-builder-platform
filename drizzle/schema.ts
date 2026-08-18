import {
  bigint,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  mobile: varchar("mobile", { length: 24 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export const passwordResetTokens = mysqlTable(
  "passwordResetTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("password_reset_user_idx").on(table.userId), index("password_reset_expiry_idx").on(table.expiresAt)],
);

export const templates = mysqlTable(
  "templates",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    category: mysqlEnum("category", [
      "ecommerce",
      "education",
      "games",
      "music",
      "podcasts",
      "movies",
      "services",
    ]).notNull(),
    nameAr: varchar("nameAr", { length: 120 }).notNull(),
    nameEn: varchar("nameEn", { length: 120 }).notNull(),
    descriptionAr: text("descriptionAr").notNull(),
    descriptionEn: text("descriptionEn").notNull(),
    accentColor: varchar("accentColor", { length: 16 }).notNull().default("#4F46E5"),
    iconName: varchar("iconName", { length: 64 }).notNull(),
    components: json("components").$type<string[]>().notNull(),
    suggestedStructure: json("suggestedStructure").$type<Array<{ key: string; titleAr: string; titleEn: string }>>().notNull(),
    isActive: int("isActive").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("templates_category_idx").on(table.category)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    templateId: int("templateId").references(() => templates.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    category: mysqlEnum("category", [
      "ecommerce",
      "education",
      "games",
      "music",
      "podcasts",
      "movies",
      "services",
      "custom",
    ]).notNull(),
    language: mysqlEnum("language", ["ar", "en", "both"]).notNull().default("both"),
    status: mysqlEnum("status", ["draft", "ready", "archived"]).notNull().default("draft"),
    appId: varchar("appId", { length: 180 }),
    versionName: varchar("versionName", { length: 32 }).notNull().default("1.0.0"),
    packageName: varchar("packageName", { length: 180 }),
    estimatedSizeBytes: bigint("estimatedSizeBytes", { mode: "number" }).notNull().default(0),
    settings: json("settings").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("projects_owner_idx").on(table.ownerId),
    index("projects_template_idx").on(table.templateId),
    index("projects_owner_status_idx").on(table.ownerId, table.status),
  ],
);

export const projectPages = mysqlTable(
  "projectPages",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    sourcePageKey: varchar("sourcePageKey", { length: 80 }),
    titleAr: varchar("titleAr", { length: 120 }).notNull(),
    titleEn: varchar("titleEn", { length: 120 }).notNull(),
    route: varchar("route", { length: 180 }).notNull(),
    sortOrder: int("sortOrder").notNull(),
    configuration: json("configuration").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("project_pages_route_unique").on(table.projectId, table.route),
    index("project_pages_project_sort_idx").on(table.projectId, table.sortOrder),
  ],
);

export const projectComponents = mysqlTable(
  "projectComponents",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    pageId: int("pageId").notNull().references(() => projectPages.id, { onDelete: "cascade" }),
    componentType: varchar("componentType", { length: 80 }).notNull(),
    labelAr: varchar("labelAr", { length: 160 }).notNull(),
    labelEn: varchar("labelEn", { length: 160 }).notNull(),
    sortOrder: int("sortOrder").notNull(),
    properties: json("properties").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("project_components_page_sort_idx").on(table.pageId, table.sortOrder),
    index("project_components_project_idx").on(table.projectId),
  ],
);

export const projectAssets = mysqlTable(
  "projectAssets",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["icon", "image", "font", "document", "other"]).notNull().default("image"),
    filename: varchar("filename", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    url: text("url").notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("project_assets_project_idx").on(table.projectId), index("project_assets_owner_idx").on(table.ownerId)],
);

export const exportJobs = mysqlTable(
  "exportJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    format: mysqlEnum("format", ["apk", "aab", "ipa"]).notNull(),
    status: mysqlEnum("status", ["draft", "pending_payment", "queued", "building", "ready", "failed", "cancelled"]).notNull().default("draft"),
    estimatedSizeBytes: bigint("estimatedSizeBytes", { mode: "number" }).notNull().default(0),
    sizeUnits: int("sizeUnits").notNull().default(1),
    unitPriceHalalas: int("unitPriceHalalas").notNull(),
    totalPriceHalalas: int("totalPriceHalalas").notNull(),
    artifactKey: varchar("artifactKey", { length: 512 }),
    artifactUrl: text("artifactUrl"),
    failureReason: text("failureReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  table => [
    index("export_jobs_owner_idx").on(table.ownerId),
    index("export_jobs_project_idx").on(table.projectId),
    index("export_jobs_status_idx").on(table.status),
  ],
);

/**
 * Historical payment ledger retained to prevent data loss. The no-payment web edition
 * has no runtime procedure that reads from or writes to this table.
 */
export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    exportJobId: int("exportJobId").references(() => exportJobs.id, { onDelete: "set null" }),
    provider: mysqlEnum("provider", ["tap", "paylink"]).notNull().default("paylink"),
    status: mysqlEnum("status", ["created", "pending", "paid", "failed", "cancelled", "refunded"]).notNull().default("created"),
    amountHalalas: int("amountHalalas").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    providerChargeId: varchar("providerChargeId", { length: 128 }),
    checkoutUrl: text("checkoutUrl"),
    metadata: json("metadata").$type<Record<string, unknown>>().notNull(),
    paidAt: timestamp("paidAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("payments_provider_charge_unique").on(table.providerChargeId),
    index("payments_owner_idx").on(table.ownerId),
    index("payments_export_job_idx").on(table.exportJobId),
  ],
);

/** Historical webhook evidence retained alongside legacy payment records; read-only in this edition. */
export const tapWebhookEvents = mysqlTable(
  "tapWebhookEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
    paymentId: int("paymentId").references(() => payments.id, { onDelete: "set null" }),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    processingStatus: mysqlEnum("processingStatus", ["received", "processed", "failed"]).notNull().default("received"),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  table => [uniqueIndex("tap_webhook_event_unique").on(table.providerEventId), index("tap_webhook_payment_idx").on(table.paymentId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectPage = typeof projectPages.$inferSelect;
export type ProjectComponent = typeof projectComponents.$inferSelect;
export type ProjectAsset = typeof projectAssets.$inferSelect;
export type ExportJob = typeof exportJobs.$inferSelect;
export type Payment = typeof payments.$inferSelect;
