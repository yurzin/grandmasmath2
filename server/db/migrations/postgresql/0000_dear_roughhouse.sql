CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_type_id" integer NOT NULL,
	"topic_id" integer,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"body" text NOT NULL,
	"image_url" varchar(500),
	"answer" varchar(255) NOT NULL,
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
