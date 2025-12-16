import type { RelatedEntity } from "@mafia/core/db/types";
import type { LobbyInfo } from "@mafia/core/lobby/index";
import type { Presence } from "@mafia/core/user/presence";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/vue-query";
import { useLobbyStore } from "src/stores/lobby";
import { computed, type MaybeRef, unref } from "vue";
import { fetchLobby, hostLobby, joinLobby, leaveLobby, listLobbies } from "./api";


export const useHostLobby = () => {
    const queryClient = useQueryClient();
    const lStore = useLobbyStore();
    // const { subscripte } = useRealtime(); // TODO
    // const mStore = useMessageStore() // TODO
    return useMutation({
        mutationFn: hostLobby,
        onMutate: () => {
            lStore.setJoinLobbyPending();
        },
        onSuccess: async (data) => {
            console.log('Host Success')
            await queryClient.invalidateQueries({ queryKey: ["lobbies"] });
            await queryClient.invalidateQueries({ queryKey: ["presence"] });

            console.log('Lobby', data)

            lStore.setSelectedLobbyId(data.id);

            // cStore.newInfoMessage('You have created a Lobby'); // TODO
            // subscribe(lobby.id); // TODO
        },
        onError: (e) => {
            console.error('Host error', e);
        },
        onSettled: () => {
            lStore.clearJoinLobbyPending();
        },
    })
}

export const useLobbies = () => {
    return useQuery({
        queryKey: ["lobbies"],
        queryFn: listLobbies,
        retry: false,
        staleTime: Infinity,
    })
}

export const useLobby = (id: MaybeRef<string | null>, options?: Omit<
    UseQueryOptions,
    'queryKey' | 'queryFn'
>) => {
    const idRef = computed(() => unref(id));

    return useQuery({
        queryKey: computed(() => ['lobby', idRef.value ?? ''] as const),
        queryFn: () => fetchLobby(idRef.value!),
        enabled: computed(() => !!idRef.value),
        ...options,
    });
}

export const useSelectedLobby = () => {
    const { data: lobbies } = useLobbies();
    const lStore = useLobbyStore();

    const selectedLobby = computed(() => {
        if (!lobbies.value || !lStore.selectedLobbyId) return null;
        return lobbies.value.find(
            (lobby) => lobby.id === lStore.selectedLobbyId,
        );
    });

    return selectedLobby;
};

export const useJoinLobby = () => {
    const queryClient = useQueryClient();
    const lStore = useLobbyStore();
    // const { subscribe } = useRealtime(); // TODO
    return useMutation({
        mutationFn: joinLobby,
        onMutate: () => {
            lStore.setJoinLobbyPending();
        },
        onSuccess: async (_data, variables) => {
            console.log('Join Success');
            await queryClient.invalidateQueries({ queryKey: ['lobbies'] });
            await queryClient.invalidateQueries({ queryKey: ['presence'] });
            await queryClient.invalidateQueries({ queryKey: ['actor'] });

            console.log('Variables', variables);

            // subscribe(variables.lobbyId); // TODO
        },
        onError: (e) => {
            console.error('Join Error', e);
            // TODO
            // if (e instanceof AxiosError) {
            //     if (e.response?.status === 404) {
            //         warningNotify('Lobby not found');
            //         queryClient.invalidateQueries({ queryKey: ['lobbies'] });
            //     }
            // }
        },
        onSettled: () => {
            lStore.clearJoinLobbyPending();
        },
    });
};

export const useLeaveLobby = () => {
    const queryClient = useQueryClient()
    const lStore = useLobbyStore()

    return useMutation({
        mutationFn: leaveLobby,

        onMutate: () => {
            lStore.setLeaveLobbyPending()

            const presence = queryClient.getQueryData<{ lobby?: { id: string } | null; user?: { id: string } }>(['presence'])

            return {
                lobbyId: presence?.lobby?.id ?? null,
                userId: presence?.user?.id ?? null,
            }
        },

        onSuccess: async (_data, _vars, ctx) => {
            // Make UI correct immediately
            queryClient.setQueryData(['presence'], (old: Presence) => old ? { ...old, lobby: null } : old)

            // Optimistically update lobbies if we know ids
            if (ctx?.lobbyId && ctx?.userId) {
                queryClient.setQueryData(['lobbies'], (old: LobbyInfo[] | undefined) => {
                    if (!old) return old
                    return old
                        .map(l =>
                            l.id === ctx.lobbyId
                                ? { ...l, members: l.members.filter((m: RelatedEntity) => m.id !== ctx.userId) }
                                : l,
                        )
                        .filter(l => l.members.length > 0)
                })
            }

            // Reconcile with server (no timeout needed)
            await queryClient.invalidateQueries({ queryKey: ['presence'] })
            await queryClient.invalidateQueries({ queryKey: ['lobbies'] })

            lStore.clearSelectedLobbyId()
        },

        onError: (e) => {
            console.error('Leave Error', e)
        },

        onSettled: async () => {
            lStore.clearLeaveLobbyPending()
            await queryClient.invalidateQueries({ queryKey: ['actor'] })
        },
    })
}