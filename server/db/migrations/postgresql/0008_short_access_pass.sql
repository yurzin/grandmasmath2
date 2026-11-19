ALTER TYPE "public"."purchase_kind" ADD VALUE 'pass';--> statement-breakpoint
CREATE TABLE "solution_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "months" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "days" smallint;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "daily_limit" smallint;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "days" smallint;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "daily_limit" smallint;--> statement-breakpoint
ALTER TABLE "solution_views" ADD CONSTRAINT "solution_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_views" ADD CONSTRAINT "solution_views_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_solution_views_user_time" ON "solution_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_days_unique" UNIQUE("days");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_period" CHECK (("subscription_plans"."months" IS NULL) <> ("subscription_plans"."days" IS NULL));--> statement-breakpoint
-- Заготовки короткого доступа (выключены; цены и лимит меняются в админке).
INSERT INTO "subscription_plans" ("days", "daily_limit", "price", "active") VALUES (1, 30, 99, false), (7, 30, 249, false) ON CONFLICT DO NOTHING;
