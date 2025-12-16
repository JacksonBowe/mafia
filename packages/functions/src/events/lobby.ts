import { Lobby } from "@mafia/core/lobby/index";
import { bus } from "sst/aws/bus";


export const handler = bus.subscriber(
    [
        Lobby.Member.Events.MemberLeave
    ],
    async (evt) => {
        switch (evt.type) {
            case Lobby.Member.Events.MemberLeave.type: {

                const { lobbyId, userId } = evt.properties

                try {
                    const lobby = await Lobby.get({ lobbyId })

                    // If lobby already gone, treat as idempotent success
                    if (!lobby) return

                    // If nobody left, terminate (make terminate idempotent too)
                    if (lobby.members.length === 0) {
                        await Lobby.terminate({ lobbyId })
                        return
                    }

                    // If the leaver was host, promote a deterministic replacement
                    if (lobby.host?.id === userId) {
                        // Prefer a deterministic choice:
                        // - oldest joined member
                        // - or lowest userId
                        // - or some explicit "joinedAt" sort from Lobby.get()
                        const newHostUserId = lobby.members[0]!.id
                        await Lobby.Member.promote({ lobbyId, userId: newHostUserId })
                    }
                } catch (error) {
                    console.error("Error in MemberLeave handler:", error)
                    throw error
                }

                break;
            }

        }
    }
)