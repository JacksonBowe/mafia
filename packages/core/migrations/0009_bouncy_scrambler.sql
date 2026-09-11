CREATE TABLE "engine_log" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"operation" text NOT NULL,
	"phase" text,
	"data" jsonb NOT NULL,
	"lines" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_log" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"phase" text,
	"actor_id" text,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engine_log" ADD CONSTRAINT "engine_log_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_log" ADD CONSTRAINT "game_log_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engine_log_game_created_idx" ON "engine_log" USING btree ("game_id","created_at","id");--> statement-breakpoint
CREATE INDEX "game_log_game_created_idx" ON "game_log" USING btree ("game_id","created_at","id");