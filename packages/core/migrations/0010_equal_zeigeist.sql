DROP INDEX "game_log_game_created_idx";--> statement-breakpoint
ALTER TABLE "game_log" ADD COLUMN "sequence" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "audit_log_sequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "game_log_game_sequence_uq" ON "game_log" USING btree ("game_id","sequence");