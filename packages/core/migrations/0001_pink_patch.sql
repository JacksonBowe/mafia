ALTER TABLE "user" RENAME COLUMN "microsoft_id" TO "discord_id";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_microsoft_id_unique";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_discord_id_unique" UNIQUE("discord_id");