CREATE TABLE `moyasarWebhookEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`paymentId` int,
	`payload` json NOT NULL,
	`processingStatus` enum('received','processed','failed') NOT NULL DEFAULT 'received',
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `moyasarWebhookEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `moyasar_webhook_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `provider` enum('tap','paylink','moyasar') NOT NULL DEFAULT 'moyasar';--> statement-breakpoint
ALTER TABLE `moyasarWebhookEvents` ADD CONSTRAINT `moyasarWebhookEvents_paymentId_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `moyasar_webhook_payment_idx` ON `moyasarWebhookEvents` (`paymentId`);