CREATE TABLE "trophy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"run_id" uuid,
	"kind" text NOT NULL,
	"mode" text NOT NULL,
	"set_name" text NOT NULL,
	"duration_ms" integer,
	"target_ms" integer,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "mode" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "trophy" ADD CONSTRAINT "trophy_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trophy" ADD CONSTRAINT "trophy_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trophy_student_idx" ON "trophy" USING btree ("student_id","earned_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trophy_run_uq" ON "trophy" USING btree ("run_id");