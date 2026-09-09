CREATE TABLE `git_commits` (
	`oid` text PRIMARY KEY NOT NULL,
	`parent` text,
	`mission` text NOT NULL,
	`author` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`depth` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mission_repositories` (
	`mission` text PRIMARY KEY NOT NULL,
	`head` text NOT NULL,
	`fork_policy` text NOT NULL,
	`upstream` text,
	`fork_base` text
);
