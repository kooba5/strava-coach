CREATE TABLE `athlete` (
	`id` text PRIMARY KEY NOT NULL,
	`vdot` real,
	`vdot_updated_at` text,
	`prefs` text,
	`goals_json` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `planned_session` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_id` text NOT NULL,
	`date` text NOT NULL,
	`weekday` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`target_distance_km` real,
	`target_pace_sec_per_km` integer,
	`structure_json` text,
	`notes` text,
	`phase` text,
	FOREIGN KEY (`athlete_id`) REFERENCES `athlete`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recovery_day` (
	`athlete_id` text NOT NULL,
	`date` text NOT NULL,
	`sleep_hours` real,
	`hrv_ms` real,
	`resting_hr` integer,
	`body_battery` integer,
	`readiness` text,
	PRIMARY KEY(`athlete_id`, `date`),
	FOREIGN KEY (`athlete_id`) REFERENCES `athlete`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session_result` (
	`id` text PRIMARY KEY NOT NULL,
	`planned_id` text,
	`strava_activity_id` text,
	`status` text NOT NULL,
	`actual_distance_km` real,
	`actual_pace_sec_per_km` integer,
	`actual_avg_hr` integer,
	`temp_celsius` real,
	`athlete_note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`planned_id`) REFERENCES `planned_session`(`id`) ON UPDATE no action ON DELETE no action
);
