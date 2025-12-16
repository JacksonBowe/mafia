CREATE TABLE "lobby_member" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"lobby_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lobby_member" ADD CONSTRAINT "lobby_member_lobby_id_lobby_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."lobby"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_member" ADD CONSTRAINT "lobby_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby" ADD CONSTRAINT "lobby_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lobby_member_lobby_idx" ON "lobby_member" USING btree ("lobby_id");--> statement-breakpoint
CREATE INDEX "lobby_member_user_idx" ON "lobby_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_member_lobby_user_uq" ON "lobby_member" USING btree ("lobby_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_member_user_uq" ON "lobby_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lobby_host_idx" ON "lobby" USING btree ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_name_uq" ON "lobby" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_host_uq" ON "lobby" USING btree ("host_id");