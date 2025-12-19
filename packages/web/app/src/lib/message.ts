// core/message/models.ts
import { z } from "zod";

/**
 * Message = UI artifact shown in one single chat list.
 * Text-only forever.
 *
 * scope is top-level so "menu vs game" is never ambiguous.
 * channel is validated based on scope.
 */

// ---------------------------------
// Enums
// ---------------------------------

export const MessageKindSchema = z.enum(["USER", "SYSTEM", "INFO"]);
export type MessageKind = z.infer<typeof MessageKindSchema>;

export const MessageScopeSchema = z.enum(["app", "menu", "game"]);
export type MessageScope = z.infer<typeof MessageScopeSchema>;

export const AppChannelSchema = z.enum(["FEEDBACK"]);
export type AppChannel = z.infer<typeof AppChannelSchema>;

export const MenuChannelSchema = z.enum(["GLOBAL", "LOBBY", "PRIVATE"]);
export type MenuChannel = z.infer<typeof MenuChannelSchema>;

export const GameChannelSchema = z.enum(["GLOBAL", "TEAM", "PRIVATE", "DEAD"]);
export type GameChannel = z.infer<typeof GameChannelSchema>;

// ---------------------------------
// Sender
// ---------------------------------

export const MessageSenderSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("USER"),
        userId: z.string().min(1),
        displayName: z.string().min(1).optional(),
    }),
    z.object({
        type: z.literal("SYSTEM"),
        label: z.string().min(1).optional(),
    }),
]);
export type MessageSender = z.infer<typeof MessageSenderSchema>;

// ---------------------------------
// Message
// ---------------------------------

export const MessageSchema = z
    .object({
        id: z.string().min(1),
        createdAt: z.number().int().nonnegative(),

        kind: MessageKindSchema,
        sender: MessageSenderSchema,

        text: z.string().min(1).max(2000),

        /**
         * Domain (menu/game/app)
         */
        scope: MessageScopeSchema,

        /**
         * Sub-category within a scope.
         * (Validated against `scope` in superRefine)
         */
        channel: z.string().min(1),

        /**
         * Optional metadata (only used/valid for some scopes/channels)
         */
        lobbyId: z.string().min(1).optional(),
        gameId: z.string().min(1).optional(),
        teamId: z.string().min(1).optional(),

        /**
         * Optional lifecycle helpers (useful for INFO feedback)
         */
        ttlMs: z.number().int().positive().optional(),
        ephemeral: z.boolean().optional(),
    })
    .superRefine((m, ctx) => {
        // Validate channel by scope
        if (m.scope === "app") {
            if (!AppChannelSchema.safeParse(m.channel).success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Invalid app channel: ${m.channel}`,
                    path: ["channel"],
                });
            }
            if (m.lobbyId !== undefined || m.gameId !== undefined || m.teamId !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "app messages should not include lobbyId/gameId/teamId",
                    path: ["scope"],
                });
            }
            return;
        }

        if (m.scope === "menu") {
            if (!MenuChannelSchema.safeParse(m.channel).success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Invalid menu channel: ${m.channel}`,
                    path: ["channel"],
                });
                return;
            }

            if (m.gameId !== undefined || m.teamId !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "menu messages should not include gameId/teamId",
                    path: ["scope"],
                });
            }

            // not every menu user is in a lobby
            if (m.channel === "LOBBY" && m.lobbyId === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "menu:LOBBY messages should include lobbyId",
                    path: ["lobbyId"],
                });
            }

            return;
        }

        // game
        if (!GameChannelSchema.safeParse(m.channel).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Invalid game channel: ${m.channel}`,
                path: ["channel"],
            });
            return;
        }

        if (m.gameId === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "game messages should include gameId",
                path: ["gameId"],
            });
        }

        if (m.channel === "TEAM" && m.teamId === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "game:TEAM messages should include teamId",
                path: ["teamId"],
            });
        }
    });

export type Message = z.infer<typeof MessageSchema>;

export const MessageListSchema = z.array(MessageSchema);
export type MessageList = z.infer<typeof MessageListSchema>;

/**
 * Optional: strongly-typed channel helpers (nice in TS code)
 */
export type MessageChannel =
    | { scope: "app"; channel: AppChannel }
    | { scope: "menu"; channel: MenuChannel; lobbyId?: string }
    | { scope: "game"; channel: GameChannel; gameId: string; teamId?: string };
