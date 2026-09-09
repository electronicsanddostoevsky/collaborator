CREATE TABLE `mission_follows` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mission_follows_membership` ON `mission_follows` (`mission`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mission_follows_user` ON `mission_follows` (`user_id`);