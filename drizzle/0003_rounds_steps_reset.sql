ALTER TABLE "answer_event" ADD COLUMN "round" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "answer_event" ADD COLUMN "step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "answer_event" ADD COLUMN "steps" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN "progress_reset_at" timestamp with time zone;