ALTER TABLE "game" ADD COLUMN "events" jsonb;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "vote_target_actor_id" text;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "target_actor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "game_player"
SET "actor_id" = "user_id"
WHERE "actor_id" IS NULL;--> statement-breakpoint
UPDATE "game_player" gp
SET "vote_target_actor_id" = target."actor_id"
FROM "game_player" target
WHERE gp."game_id" = target."game_id"
  AND gp."vote" IS NOT NULL
  AND gp."vote"::text = target."player_number";--> statement-breakpoint
ALTER TABLE "game_player"
ALTER COLUMN "player_number" TYPE integer USING "player_number"::integer;--> statement-breakpoint
ALTER TABLE "game_player"
ALTER COLUMN "actor_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "game_player_game_actor_uq"
ON "game_player" USING btree ("game_id","actor_id");--> statement-breakpoint
ALTER TABLE "game_player" DROP COLUMN "alias";--> statement-breakpoint
ALTER TABLE "game_player" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "game_player" DROP COLUMN "vote";