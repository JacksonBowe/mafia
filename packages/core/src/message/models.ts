// core/message/models.ts
import { z } from "zod";

/**
 * NOTE:
 * - This schema is designed to be shared: backend uses it to validate/build realtime payloads,
 *   frontend imports types (and can optionally validate local/remote payloads too).
 * - No `any`.
 */

// -----------------------------
// Enums / primitives
// -----------------------------

export const MessageContextSchema = z.enum(["app", "menu", "game"]);
export type MessageContext = z.infer<typeof MessageContextSchema>;

export const MessageKindSchema = z.enum(["USER", "SYSTEM", "INFO"]);
export type MessageKind = z.infer<typeof MessageKindSchema>;

/**
 * Where the message originated.
 * - REMOTE: authored via API and published to realtime
 * - LOCAL: created on the frontend only (eg UI feedback)
 */
export const MessageSourceSchema = z.enum(["REMOTE", "LOCAL"]);
export type MessageSource = z.infer<typeof MessageSourceSchema>;

/**
 * Optional delivery/lifecycle helpers (useful for frontend INFO feedback)
 */
export const MessageLifecycleSchema = z.object({
    /**
     * If set, consumers may auto-remove the message after this duration from `createdAt`.
     */
    ttlMs: z.number().int().positive().optional(),

    /**
     * Hint: can be hidden/collapsed by default in the UI.
     */
    ephemeral: z.boolean().optional(),
});
export type MessageLifecycle = z.infer<typeof MessageLifecycleSchema>;

// -----------------------------
// Channels
// -----------------------------

export const AppChannelSchema = z.enum(["FEEDBACK"]);
export type AppChannel = z.infer<typeof AppChannelSchema>;

export const MenuChannelSchema = z.enum(["GLOBAL", "LOBBY", "PRIVATE"]);
export type MenuChannel = z.infer<typeof MenuChannelSchema>;

export const GameChannelSchema = z.enum(["GLOBAL", "TEAM", "DEAD", "PRIVATE"]);
export type GameChannel = z.infer<typeof GameChannelSchema>;

/**
 * Channel is a UI grouping (tabs/buckets). Visibility is controlled by `audience`.
 */
export const MessageChannelSchema = z.discriminatedUnion("context", [
    z.object({
        context: z.literal("app"),
        channel: AppChannelSchema,
    }),
    z.object({
        context: z.literal("menu"),
        channel: MenuChannelSchema,
    }),
    z.object({
        context: z.literal("game"),
        channel: GameChannelSchema,
    }),
]);
export type MessageChannel = z.infer<typeof MessageChannelSchema>;

// -----------------------------
// Audience (visibility / routing)
// -----------------------------

export const MessageAudienceSchema = z.discriminatedUnion("type", [
    /**
     * Generic broadcast (useful for app feedback)
     */
    z.object({ type: z.literal("BROADCAST") }),

    /**
     * Visible to all lobby members
     */
    z.object({ type: z.literal("LOBBY") }),

    /**
     * Visible to all game players
     */
    z.object({ type: z.literal("GAME") }),

    /**
     * Visible to players on a team (server should derive teamId, don’t trust client)
     */
    z.object({
        type: z.literal("TEAM"),
        teamId: z.string().min(1),
    }),

    /**
     * Visible to a single user (DM inbox). Backend can publish to both sender + receiver inbox.
     */
    z.object({
        type: z.literal("DIRECT"),
        toUserId: z.string().min(1),
    }),
]);
export type MessageAudience = z.infer<typeof MessageAudienceSchema>;

// -----------------------------
// Sender
// -----------------------------

export const MessageSenderSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("USER"),
        userId: z.string().min(1),
        displayName: z.string().min(1),
    }),
    z.object({
        type: z.literal("SYSTEM"),
    }),
]);
export type MessageSender = z.infer<typeof MessageSenderSchema>;

// -----------------------------
// Body
// -----------------------------

export const TextBodySchema = z.object({
    type: z.literal("TEXT"),
    text: z.string().min(1).max(2000),
});
export type TextBody = z.infer<typeof TextBodySchema>;

/**
 * Future-proof: you can add other body types later (eg. emotes, images, game events).
 */
export const MessageBodySchema = z.discriminatedUnion("type", [TextBodySchema]);
export type MessageBody = z.infer<typeof MessageBodySchema>;

// -----------------------------
// Message
// -----------------------------

export const MessageSchema = z.object({
    /**
     * Unique id. Strongly recommended: client generates and sends to API so server reuses it
     * (perfect dedupe between optimistic local + remote realtime delivery).
     */
    id: z.string().min(1),

    /**
     * Unix milliseconds.
     */
    createdAt: z.number().int().nonnegative(),
    editedAt: z.number().int().nonnegative().optional(),

    source: MessageSourceSchema,
    kind: MessageKindSchema,

    /**
     * UI grouping (tab/bucket)
     */
    channel: MessageChannelSchema,

    /**
     * Visibility / routing rule
     */
    audience: MessageAudienceSchema,

    /**
     * Scope ids:
     * - app: both should be null
     * - menu: lobbyId required; gameId null
     * - game: gameId required; lobbyId optional (if you still want to reference lobby)
     *
     * (We keep these as nullable + enforce via refinements below.)
     */
    lobbyId: z.string().min(1).nullable(),
    gameId: z.string().min(1).nullable(),

    sender: MessageSenderSchema,
    body: MessageBodySchema,

    /**
     * Optional UX lifecycle helpers (ttl/ephemeral)
     */
    lifecycle: MessageLifecycleSchema.optional(),
})
    // Enforce scope rules based on channel.context
    .superRefine((m, ctx) => {
        if (m.channel.context === "app") {
            if (m.lobbyId !== null || m.gameId !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "app messages must have lobbyId and gameId as null",
                    path: ["lobbyId"],
                });
            }
        }

        if (m.channel.context === "menu") {
            if (m.lobbyId === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "menu messages require lobbyId",
                    path: ["lobbyId"],
                });
            }
            if (m.gameId !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "menu messages must have gameId as null",
                    path: ["gameId"],
                });
            }
        }

        if (m.channel.context === "game") {
            if (m.gameId === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "game messages require gameId",
                    path: ["gameId"],
                });
            }
        }

        // Channel/audience sanity checks (optional but catches mistakes)
        if (m.channel.context === "menu" && m.channel.channel === "PRIVATE") {
            if (m.audience.type !== "DIRECT") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "menu PRIVATE channel requires DIRECT audience",
                    path: ["audience"],
                });
            }
        }

        if (m.channel.context === "game" && m.channel.channel === "TEAM") {
            if (m.audience.type !== "TEAM") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "game TEAM channel requires TEAM audience",
                    path: ["audience"],
                });
            }
        }

        if (m.channel.channel === "PRIVATE" && m.audience.type !== "DIRECT") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "PRIVATE channel requires DIRECT audience",
                path: ["audience"],
            });
        }
    });

export type Message = z.infer<typeof MessageSchema>;

// Convenience array schema for realtime batches
export const MessageListSchema = z.array(MessageSchema);
export type MessageList = z.infer<typeof MessageListSchema>;
