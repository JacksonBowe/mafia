import type { Presence } from "@mafia/core/user/presence";
import { useQueryClient } from "@tanstack/vue-query";
import type { AppBus } from "src/boot/bus";
import { useRealtime } from "src/stores/realtime";
import { inject, onMounted, onUnmounted } from "vue";
import { z } from "zod";

// Frontend-duplicated schemas (mirror backend)
const ULID = z.string().min(26); // or your own isULID equivalent

export const LobbyEventSchemas = {
    // realtime.*
    "realtime.lobby.member.join": z.object({
        lobbyId: ULID,
        user: z.object({
            id: ULID,
            name: z.string(),
        }),
    }),

    "realtime.lobby.member.leave": z.object({
        lobbyId: ULID,
        userId: ULID,
    }),

    "realtime.lobby.member.promote": z.object({
        lobbyId: ULID,
        userId: ULID,
    }),

    "realtime.lobby.terminated": z.object({
        lobbyId: ULID,
    }),

    // app.* (optional)
    "app.lobby.toast": z.object({ message: z.string() }),
} as const;

export function useLobbyEvents() {
    const bus = inject<AppBus>("bus");
    if (!bus) throw new Error("Bus not provided");

    const queryClient = useQueryClient();
    // const { data: me } = useActor();

    const off: Array<() => void> = [];

    onMounted(() => {
        off.push(
            bus.on("realtime.lobby.member.join", (p) => {
                console.log("join", p.user.name);
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),

            bus.on("realtime.lobby.member.leave", (p) => {
                console.log("join", p);
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),

            bus.on("realtime.lobby.member.promote", (p) => {
                console.log("join", p);
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),

            bus.on("realtime.lobby.terminated", (p) => {
                console.log("lobby terminated", p);
                queryClient.setQueryData(['presence'], (old: Presence) => old ? { ...old, lobby: null } : old)
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
                void queryClient.invalidateQueries({ queryKey: ["actor", "presence"] });
                useRealtime().unsubscribe(`lobby/${p.lobbyId}`);
            }),
        );
    });

    onUnmounted(() => off.forEach((fn) => fn()));
}
