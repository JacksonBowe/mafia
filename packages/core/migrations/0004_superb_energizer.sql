CREATE TABLE "game_player" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"player_number" text NOT NULL,
	"alias" text NOT NULL,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phase" text DEFAULT 'day' NOT NULL,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"engine_state" jsonb NOT NULL,
	"engine_config" jsonb NOT NULL,
	"actors" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_player" ADD CONSTRAINT "game_player_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_player_game_idx" ON "game_player" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_player_user_idx" ON "game_player" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_status_idx" ON "game" USING btree ("status");--> statement-breakpoint
CREATE INDEX "game_created_at_idx" ON "game" USING btree ("created_at");