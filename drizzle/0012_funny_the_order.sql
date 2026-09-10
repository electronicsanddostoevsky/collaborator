ALTER TABLE `workshop_artifacts` ADD `feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workshop_artifacts` ADD `reviewer` text;--> statement-breakpoint
ALTER TABLE `workshop_artifacts` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `workshop_artifacts` ADD `preview_key` text;