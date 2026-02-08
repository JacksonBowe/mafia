CREATE TABLE "user" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"microsoft_id" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"last_login_at" timestamp (3) with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_microsoft_id_unique" UNIQUE("microsoft_id")
);
