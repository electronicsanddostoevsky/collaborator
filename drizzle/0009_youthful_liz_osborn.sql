CREATE TABLE `merge_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`base` text NOT NULL,
	`source_head` text NOT NULL,
	`target_head` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`reviewer` text,
	`merge_head` text,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_merge_target_status` ON `merge_requests` (`target`,`status`);--> statement-breakpoint
CREATE INDEX `idx_merge_source` ON `merge_requests` (`source`);--> statement-breakpoint
ALTER TABLE `git_commits` ADD `merge_parent` text;