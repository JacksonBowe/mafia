# Realtime Messaging Plan

## Overview
- Implement realtime chat delivery only (no message history/persistence).
- Server is the only publisher; clients subscribe and consume events.
- Topics map to Menu/Game scopes and channels for access control.

## Plan
1. Shared message schema (core)
   - Move or mirror the existing frontend `Message` zod schema into core (ex: `packages/core/src/message.ts`).
   - Export the types + validation so API + realtime use the same contract as the UI.

2. Realtime chat events and topic map
   - Add `ChatEvents` in core using `defineRealtimeEvent` (ex: `chat.message`).
   - Topic mapping:
     - Menu global: `menu/global`
     - Menu lobby: `menu/lobby/{lobbyId}`
     - Menu private: `menu/private/{userId}` (or DM room id if needed)
     - Game global: `game/{gameId}/global`
     - Game team: `game/{gameId}/team/{teamId}`
     - Game private: `game/{gameId}/private/{userId}`
     - Game dead: `game/{gameId}/dead`

3. API endpoint to send messages
   - New Hono route (ex: `POST /chat/message`).
   - Validate with the core message schema + access rules:
     - Menu lobby requires lobby membership.
     - Game channels require game membership + team/dead checks.
   - Enrich sender fields (userId/displayName) on the server.
   - Publish via `realtime.publish(Resource.Realtime, ChatEvents.Message, { message })`.

4. Realtime authorizer (custom IoT authorizer)
   - Replace placeholder token validation with OpenAuth token verification.
   - Build per-user publish/subscribe permissions based on presence:
     - Always allow `menu/global` and `menu/private/{userId}`.
     - Allow `menu/lobby/{lobbyId}` only if the user is a member.
     - Allow game topics only when the user is a participant.
   - Keep publish permissions limited to server roles if required.

5. Client connection + subscriptions
   - Pass the real access token into the MQTT password field.
   - Auto-subscribe on connect:
     - `menu/global`
     - `menu/private/{userId}`
   - Subscribe/unsubscribe to `menu/lobby/{lobbyId}` based on presence.

6. Frontend event wiring
   - Add chat event schemas to the bus.
   - Add a hook (ex: `useMessageEvents`) that ingests `realtime.chat.message` and stores it.
   - Wire send button to call the new API endpoint.

## Implementation Order
1. Core message schema + chat realtime event definitions.
2. API send endpoint + server-side validation and publishing.
3. Realtime authorizer validation and permission rules.
4. Client realtime connect uses real token + default subscriptions.
5. Frontend bus wiring + message ingestion hook.
6. Menu chat UI send integration.
