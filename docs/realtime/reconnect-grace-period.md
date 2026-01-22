# Realtime Reconnect + Grace Period

We currently avoid disconnect/reconnect flows because they trigger the MQTT will
message and can incorrectly remove users from lobbies/games. Reconnecting also
creates a gap where realtime events can be missed (no message history yet).

When we revisit this, the safer approach is to keep a long-lived connection and
introduce a serverless grace period for disconnects. A focused DynamoDB table
can track pending disconnects and active connections, and a TTL-based handler
can remove the user only if they do not reconnect within the grace window.

This is intentionally deferred until we need more robust presence handling.
