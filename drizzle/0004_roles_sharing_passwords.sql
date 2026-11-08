CREATE TABLE "student_teacher" (
	"student_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "password_enc" text;--> statement-breakpoint
ALTER TABLE "teacher" ADD COLUMN "role" text DEFAULT 'teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE "teacher" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "student_teacher" ADD CONSTRAINT "student_teacher_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_teacher" ADD CONSTRAINT "student_teacher_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_teacher_uq" ON "student_teacher" USING btree ("student_id","teacher_id");--> statement-breakpoint
CREATE INDEX "student_teacher_teacher_idx" ON "student_teacher" USING btree ("teacher_id");
--> statement-breakpoint
UPDATE "teacher" SET "role" = 'admin' WHERE "id" = (SELECT "id" FROM "teacher" ORDER BY "created_at" ASC LIMIT 1);
