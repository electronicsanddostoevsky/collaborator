CREATE TABLE `contributor_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`task_id` text,
	`task_revision` integer,
	`tool` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contributor_run_mission` ON `contributor_runs` (`mission`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contributor_run_user` ON `contributor_runs` (`user_id`,`status`,`created_at`);