CREATE TABLE `mission_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`module` text NOT NULL,
	`member_id` text,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lead_module` ON `mission_leads` (`mission`,`module`);--> statement-breakpoint
CREATE TABLE `mission_members` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_member_account` ON `mission_members` (`mission`,`user_id`);