CREATE TABLE `dns_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`domain` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`ttl` integer
);
--> statement-breakpoint
CREATE INDEX `dns_records_domain_idx` ON `dns_records` (`domain`);--> statement-breakpoint
CREATE TABLE `do_domains` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `droplets` (
	`ip` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nc_domains` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text,
	`expires` text,
	`auto_renew` integer NOT NULL,
	`locked` integer NOT NULL,
	`whois_guard` integer NOT NULL,
	`using_nc_dns` integer NOT NULL,
	`nameservers` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file` text NOT NULL,
	`host` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`target` text NOT NULL,
	`port` integer,
	`enabled` integer,
	`listening` integer,
	`app` text
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`ok` integer NOT NULL,
	`items` integer DEFAULT 0 NOT NULL,
	`message` text
);
