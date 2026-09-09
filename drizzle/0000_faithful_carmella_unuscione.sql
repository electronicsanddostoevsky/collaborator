CREATE TABLE `claims` (
	`task_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`user_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`reviewer` text,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`revision` integer
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_task_status` ON `proposals` (`task_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_proposals_revision` ON `proposals` (`revision`);