import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useLobbyStore } from "src/stores/lobby";
import { computed } from "vue";
import { hostLobby, listLobbies } from "./api";


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

// export const useJoinLobby = () => {
//     const queryClient = useQueryClient();
//     const lStore = useLobbyStore();
//     // const { subscribe } = useRealtime(); // TODO
//     return useMutation({
//         mutationFn: joinLobby,
//         onMutate: () => {
//             lStore.setJoinLobbyPending();
//         },
//         onSuccess: (data, variables) => {
//             console.log('Join Success');
//             queryClient.invalidateQueries({ queryKey: ['lobbies'] });

//             console.log('Variables', variables);
            
//             // subscribe(variables.lobbyId); // TODO
//         },
//         onError: (e) => {
//             console.error('Join Error', e);
//             // TODO
//             // if (e instanceof AxiosError) {
//             //     if (e.response?.status === 404) {
//             //         warningNotify('Lobby not found');
//             //         queryClient.invalidateQueries({ queryKey: ['lobbies'] });
//             //     }
//             // }
//         },
//         onSettled: () => {
//             lStore.clearJoinLobbyPending();
//         },
//     });
// };

// export const useLeaveLobby = () => {
//     const queryClient = useQueryClient();
//     const lStore = useLobbyStore();
//     const cStore = useChatStore();
//     const { unsubscribe } = useRealtime();
//     return useMutation({
//         mutationFn: leaveLobby,
//         onMutate: () => {
//             console.log('Leave Mutate');
//             lStore.setLeaveLobbyPending();
//         },
//         onSuccess: () => {
//             console.log('Leave Success');
//             queryClient.invalidateQueries({ queryKey: ['lobbies'] });

//             queryClient.setQueryData(['me'], (oldData: User) =>
//                 oldData
//                     ? {
//                         ...oldData,
//                         lobby: null,
//                     }
//                     : oldData,
//             );

//             unsubscribe(lStore.selectedLobbyId);
//             lStore.clearSelectedLobbyId();

//             cStore.newInfoMessage('You have left the lobby');
//         },
//         onError: (e) => {
//             console.error('Leave Error', e);
//             queryClient.invalidateQueries({ queryKey: ['me'] });
//         },
//         onSettled: () => {
//             lStore.clearLeaveLobbyPending();
//         },
//     });
// };