CREATE TABLE "game_phase_transition" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"expected_phase_version" integer NOT NULL,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "phase_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_phase_transition" ADD CONSTRAINT "game_phase_transition_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_phase_transition_game_key_uq" ON "game_phase_transition" USING btree ("game_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "game_phase_transition_game_idx" ON "game_phase_transition" USING btree ("game_id");