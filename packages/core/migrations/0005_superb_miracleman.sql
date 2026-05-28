ALTER TABLE "game_player" ADD COLUMN "vote" integer;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "verdict" text;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "on_trial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "poll_count" integer DEFAULT 0 NOT NULL;