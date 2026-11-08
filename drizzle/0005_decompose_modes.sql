-- decomposition modes: "fill" is now "equation" (new equation), "show" is now "boxes" (boxes below the number).
-- Old answers of "show" tasks were single-step, so their snapshot just loses the setting.
UPDATE "task" SET "content" = jsonb_set("content", '{decompose}', '"equation"') WHERE "content"->>'decompose' = 'fill';--> statement-breakpoint
UPDATE "task" SET "content" = jsonb_set("content", '{decompose}', '"boxes"') WHERE "content"->>'decompose' = 'show';--> statement-breakpoint
UPDATE "answer_event" SET "task_snapshot" = jsonb_set("task_snapshot", '{decompose}', '"equation"') WHERE "task_snapshot"->>'decompose' = 'fill';--> statement-breakpoint
UPDATE "answer_event" SET "task_snapshot" = "task_snapshot" - 'decompose' WHERE "task_snapshot"->>'decompose' = 'show';
