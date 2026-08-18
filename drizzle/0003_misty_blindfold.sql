ALTER TABLE `payments` MODIFY COLUMN `provider` enum('tap','paylink') NOT NULL DEFAULT 'paylink';--> statement-breakpoint
ALTER TABLE `users` ADD `mobile` varchar(24);