CREATE TABLE `community_missions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`outcome` text NOT NULL,
	`roles` text NOT NULL,
	`steps` text NOT NULL,
	`intent` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_missions_owner` ON `community_missions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_missions_created` ON `community_missions` (`created_at`);