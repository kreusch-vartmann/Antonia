CREATE TABLE "set_heading" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'class' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_group_member" (
	"group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_set" ADD COLUMN "heading" text;--> statement-breakpoint
ALTER TABLE "task_set" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "teacher" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trophy" ADD COLUMN "scenario" text DEFAULT 'race' NOT NULL;--> statement-breakpoint
ALTER TABLE "set_heading" ADD CONSTRAINT "set_heading_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_group" ADD CONSTRAINT "student_group_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_group_member" ADD CONSTRAINT "student_group_member_group_id_student_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."student_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_group_member" ADD CONSTRAINT "student_group_member_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "set_heading_teacher_idx" ON "set_heading" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "student_group_teacher_idx" ON "student_group" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_group_member_uq" ON "student_group_member" USING btree ("group_id","student_id");--> statement-breakpoint
CREATE INDEX "student_group_member_student_idx" ON "student_group_member" USING btree ("student_id");