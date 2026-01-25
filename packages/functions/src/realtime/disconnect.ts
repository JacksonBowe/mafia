import { withActor } from '@mafia/core/actor';
import { Lobby } from '@mafia/core/lobby/index';
import { User } from '@mafia/core/user/index';

interface DisconnectEvent {
	userId: string;
}

export const handler = async (event: DisconnectEvent) => {
	// TODO: Add any cleanup logic here if needed

	const { userId } = event;


	const userPresence = await User.getPresence({ userId });

	if (userPresence.lobby?.id) {
		console.log('Removing user from lobby on disconnect');
		void withActor({ type: 'system' }, async () => {
			await Lobby.Member.remove({ lobbyId: userPresence.lobby!.id, userId });
		});
	}
};
