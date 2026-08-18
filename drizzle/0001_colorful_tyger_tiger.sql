CREATE TABLE `exportJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`format` enum('apk','aab','ipa') NOT NULL,
	`status` enum('draft','pending_payment','queued','building','ready','failed','cancelled') NOT NULL DEFAULT 'draft',
	`estimatedSizeBytes` bigint NOT NULL DEFAULT 0,
	`sizeUnits` int NOT NULL DEFAULT 1,
	`unitPriceHalalas` int NOT NULL,
	`totalPriceHalalas` int NOT NULL,
	`artifactKey` varchar(512),
	`artifactUrl` text,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `exportJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`exportJobId` int,
	`provider` enum('tap') NOT NULL DEFAULT 'tap',
	`status` enum('created','pending','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'created',
	`amountHalalas` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`providerChargeId` varchar(128),
	`checkoutUrl` text,
	`metadata` json NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_charge_unique` UNIQUE(`providerChargeId`)
);
--> statement-breakpoint
CREATE TABLE `projectAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`kind` enum('icon','image','font','document','other') NOT NULL DEFAULT 'image',
	`filename` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectComponents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`pageId` int NOT NULL,
	`componentType` varchar(80) NOT NULL,
	`labelAr` varchar(160) NOT NULL,
	`labelEn` varchar(160) NOT NULL,
	`sortOrder` int NOT NULL,
	`properties` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectComponents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectPages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sourcePageKey` varchar(80),
	`titleAr` varchar(120) NOT NULL,
	`titleEn` varchar(120) NOT NULL,
	`route` varchar(180) NOT NULL,
	`sortOrder` int NOT NULL,
	`configuration` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectPages_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_pages_route_unique` UNIQUE(`projectId`,`route`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`templateId` int,
	`name` varchar(160) NOT NULL,
	`description` text,
	`category` enum('ecommerce','education','games','music','podcasts','movies','services','custom') NOT NULL,
	`language` enum('ar','en','both') NOT NULL DEFAULT 'both',
	`status` enum('draft','ready','archived') NOT NULL DEFAULT 'draft',
	`appId` varchar(180),
	`versionName` varchar(32) NOT NULL DEFAULT '1.0.0',
	`packageName` varchar(180),
	`estimatedSizeBytes` bigint NOT NULL DEFAULT 0,
	`settings` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tapWebhookEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`paymentId` int,
	`payload` json NOT NULL,
	`processingStatus` enum('received','processed','failed') NOT NULL DEFAULT 'received',
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `tapWebhookEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `tap_webhook_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`category` enum('ecommerce','education','games','music','podcasts','movies','services') NOT NULL,
	`nameAr` varchar(120) NOT NULL,
	`nameEn` varchar(120) NOT NULL,
	`descriptionAr` text NOT NULL,
	`descriptionEn` text NOT NULL,
	`accentColor` varchar(16) NOT NULL DEFAULT '#4F46E5',
	`iconName` varchar(64) NOT NULL,
	`components` json NOT NULL,
	`suggestedStructure` json NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `exportJobs` ADD CONSTRAINT `exportJobs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exportJobs` ADD CONSTRAINT `exportJobs_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_exportJobId_exportJobs_id_fk` FOREIGN KEY (`exportJobId`) REFERENCES `exportJobs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD CONSTRAINT `projectAssets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD CONSTRAINT `projectAssets_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectComponents` ADD CONSTRAINT `projectComponents_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectComponents` ADD CONSTRAINT `projectComponents_pageId_projectPages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `projectPages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPages` ADD CONSTRAINT `projectPages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_templateId_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tapWebhookEvents` ADD CONSTRAINT `tapWebhookEvents_paymentId_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `export_jobs_owner_idx` ON `exportJobs` (`ownerId`);--> statement-breakpoint
CREATE INDEX `export_jobs_project_idx` ON `exportJobs` (`projectId`);--> statement-breakpoint
CREATE INDEX `export_jobs_status_idx` ON `exportJobs` (`status`);--> statement-breakpoint
CREATE INDEX `payments_owner_idx` ON `payments` (`ownerId`);--> statement-breakpoint
CREATE INDEX `payments_export_job_idx` ON `payments` (`exportJobId`);--> statement-breakpoint
CREATE INDEX `project_assets_project_idx` ON `projectAssets` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_assets_owner_idx` ON `projectAssets` (`ownerId`);--> statement-breakpoint
CREATE INDEX `project_components_page_sort_idx` ON `projectComponents` (`pageId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `project_components_project_idx` ON `projectComponents` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_pages_project_sort_idx` ON `projectPages` (`projectId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`ownerId`);--> statement-breakpoint
CREATE INDEX `projects_template_idx` ON `projects` (`templateId`);--> statement-breakpoint
CREATE INDEX `projects_owner_status_idx` ON `projects` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `tap_webhook_payment_idx` ON `tapWebhookEvents` (`paymentId`);--> statement-breakpoint
CREATE INDEX `templates_category_idx` ON `templates` (`category`);