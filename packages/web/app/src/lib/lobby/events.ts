// src/lib/lobby/events.ts
import { useQueryClient } from "@tanstack/vue-query";
import { inject, onMounted, onUnmounted } from "vue";
// import { useChatStore } from "src/stores/chat";

import { RealtimeEvents as LobbyMemberRealtime } from "@mafia/core/lobby/member";
import type { AppBus } from "src/boot/bus";
import type { z } from "zod";

export const LobbyEventSchemas = {
    "realtime.lobby.member.join": LobbyMemberRealtime.MemberJoin.schema,
    "realtime.lobby.member.leave": LobbyMemberRealtime.MemberLeave.schema,
    "realtime.lobby.member.promote": LobbyMemberRealtime.MemberPromote.schema,
} as const;

// No need for z.infer here; bus.on will infer payload from schemas if your bus is created
// with a merged schema registry that includes LobbyEventSchemas.
export function useLobbyEvents() {
    const bus = inject<AppBus>("bus");
    if (!bus) throw new Error("Bus not provided");

    const queryClient = useQueryClient();
    // const chat = useChatStore();
    // const { data: actor } = useActor();

    const off: Array<() => void> = [];

    onMounted(() => {
        off.push(
            bus.on("realtime.lobby.member.join", (p: z.infer<typeof LobbyMemberRealtime.MemberJoin.schema>) => {
                // const name = p.user.name;
                // if (me.value?.id === p.user.id) chat.newInfoMessage("You have joined the Lobby");
                // else chat.newInfoMessage(`${name} has joined the Lobby`);
                console.log(p)
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),

            bus.on("realtime.lobby.member.leave", (p: z.infer<typeof LobbyMemberRealtime.MemberLeave.schema>) => {
                // chat.newInfoMessage(`A user left the Lobby`);
                console.log(p)
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),

            bus.on("realtime.lobby.member.promote", (p: z.infer<typeof LobbyMemberRealtime.MemberPromote.schema>) => {
                // chat.newInfoMessage(`A user is the new Host`);
                console.log(p)
                void queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            }),
        );
    });

    onUnmounted(() => off.forEach((fn) => fn()));
}
