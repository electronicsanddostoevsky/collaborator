CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`object_key` text NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_artifacts_user` ON `artifacts` (`user_id`);--> statement-breakpoint
ALTER TABLE `proposals` ADD `artifact_id` text;--> statement-breakpoint
ALTER TABLE `proposals` ADD `parent_id` text;