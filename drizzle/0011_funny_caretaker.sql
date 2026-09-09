CREATE TABLE `workshop_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`prompt` text NOT NULL,
	`model` text NOT NULL,
	`object_key` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workshop_mission` ON `workshop_artifacts` (`mission`);--> statement-breakpoint
CREATE INDEX `idx_workshop_user` ON `workshop_artifacts` (`user_id`);