ALTER TABLE "assignment" ADD COLUMN "modes" text[] DEFAULT '{"normal","flawless","time"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "trophy" ADD COLUMN "mistakes" integer DEFAULT 0 NOT NULL;