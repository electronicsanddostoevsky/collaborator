CREATE TABLE `action_events` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`url` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_events_revision` ON `action_events` (`action_id`,`revision`);--> statement-breakpoint
CREATE TABLE `mission_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`creator_id` text NOT NULL,
	`title` text NOT NULL,
	`brief` text NOT NULL,
	`done_when` text NOT NULL,
	`kind` text NOT NULL,
	`effort` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assignee_id` text,
	`assignee_name` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`last_event` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_actions_mission_status` ON `mission_actions` (`mission`,`status`);--> statement-breakpoint
CREATE INDEX `idx_actions_assignee` ON `mission_actions` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `mission_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`revision` integer NOT NULL,
	`author` text NOT NULL,
	`message` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mission_revisions_number` ON `mission_revisions` (`mission`,`revision`);