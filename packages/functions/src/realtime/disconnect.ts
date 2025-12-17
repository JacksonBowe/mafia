import { withActor } from "@mafia/core/actor";
import { Lobby } from "@mafia/core/lobby/index";
import { User } from "@mafia/core/user/index";

export const handler = async (event: any) => {
    // TODO: Add any cleanup logic here if needed
    console.log("Client disconnected:", { event });

    const { userId } = event;

    console.log("Fetching user presence on disconnect:", { userId });

    const userPresence = await User.getPresence({ userId });

    console.log("User presence on disconnect:", { userPresence });
    if (userPresence.lobby && userPresence.lobby.id) {
        console.log("Removing user from lobby on disconnect")
        withActor({ type: 'system' }, () => {
            Lobby.Member.remove({ lobbyId: userPresence.lobby!.id, userId });
        })

    }
}