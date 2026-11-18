CREATE TYPE "public"."purchase_kind" AS ENUM('collection', 'subscription');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"answer" varchar(255) NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"months" smallint NOT NULL,
	"price" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "subscription_plans_months_unique" UNIQUE("months")
);
--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "collection_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "collection_version" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "kind" "purchase_kind" DEFAULT 'collection' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "months" smallint;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "access_from" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "access_until" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "answer_key" varchar(255);--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attempts_user_task" ON "attempts" USING btree ("user_id","task_id");--> statement-breakpoint
-- Тарифы подписки: выключены, цены — черновые; включаются и правятся в админке.
INSERT INTO "subscription_plans" ("months", "price", "active") VALUES (1, 390, false), (3, 990, false), (12, 2490, false) ON CONFLICT ("months") DO NOTHING;
