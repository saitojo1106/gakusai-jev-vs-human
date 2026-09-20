CREATE TABLE `decisions` (
	`shift_id` text NOT NULL,
	`idx` integer NOT NULL,
	`decision` text NOT NULL,
	PRIMARY KEY(`shift_id`, `idx`),
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`result_id` text PRIMARY KEY NOT NULL,
	`airport` text NOT NULL,
	`level` integer NOT NULL,
	`points` integer NOT NULL,
	`margin_over_jev` integer NOT NULL,
	`finished_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leaderboard_rank` ON `leaderboard` (`points`,`finished_at`);--> statement-breakpoint
CREATE INDEX `leaderboard_airport_rank` ON `leaderboard` (`airport`,`points`,`finished_at`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`seed` text NOT NULL,
	`airport` text NOT NULL,
	`finished_at` text NOT NULL,
	`reveals` text NOT NULL,
	`totals` text NOT NULL,
	`winner` text NOT NULL,
	`level` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`seed` text NOT NULL,
	`airport` text NOT NULL,
	`started_at` text NOT NULL,
	`jev` text NOT NULL,
	`jev_wall_ms` integer NOT NULL,
	`xray_used_on` integer,
	`result_id` text,
	`expires_at` integer NOT NULL
);
