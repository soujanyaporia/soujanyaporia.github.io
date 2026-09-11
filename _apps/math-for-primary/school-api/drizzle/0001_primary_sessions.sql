CREATE TABLE `primary_sessions` (
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`session_id` text NOT NULL,
	`data` text NOT NULL,
	`rev` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `activity_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
