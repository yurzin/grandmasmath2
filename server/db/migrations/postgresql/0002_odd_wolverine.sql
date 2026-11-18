CREATE TYPE "public"."collection_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "collection_tasks" (
	"collection_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	CONSTRAINT "collection_tasks_collection_id_task_id_pk" PRIMARY KEY("collection_id","task_id"),
	CONSTRAINT "uq_collection_tasks_position" UNIQUE("collection_id","position")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" integer,
	"status" "collection_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"cover_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "collection_tasks" ADD CONSTRAINT "collection_tasks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_tasks" ADD CONSTRAINT "collection_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;