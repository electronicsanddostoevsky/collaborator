CREATE TABLE `participation` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`note` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_participation_mission_user` ON `participation` (`mission`,`user_id`);