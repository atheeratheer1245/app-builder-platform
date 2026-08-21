ALTER TABLE `exportJobs` ADD `buildProvider` varchar(64);--> statement-breakpoint
ALTER TABLE `exportJobs` ADD `providerBuildId` varchar(128);--> statement-breakpoint
CREATE INDEX `export_jobs_provider_build_idx` ON `exportJobs` (`buildProvider`,`providerBuildId`);