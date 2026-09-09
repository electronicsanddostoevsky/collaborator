CREATE TABLE `mission_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`parent_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_posts_mission_created` ON `mission_posts` (`mission`,`created_at`);