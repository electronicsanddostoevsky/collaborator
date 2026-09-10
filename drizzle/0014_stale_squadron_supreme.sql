CREATE TABLE `mission_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`mission` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`brief` text NOT NULL,
	`model` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`feedback` text NOT NULL,
	`reviewer` text,
	`head` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planned_tasks` (
	`action_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`task_key` text NOT NULL,
	`module` text NOT NULL,
	`dependencies` text NOT NULL
);
