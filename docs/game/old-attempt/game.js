import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { useMafiaStore } from './mafia';
import { IoT } from 'src/boot/iot';
import { Loading, QSpinnerGears } from 'quasar';
import { ROLES } from 'src/components/utils/roles';

const decoder = new TextDecoder('utf-8');

export const useGameStore = defineStore('Game', {
	state: () => ({
		actor: null,
		game: null,
		vote: null,
		votes: {},
		lynch: null,
		targets: [],
		stage: {},
		playerOnTrial: null,
		messages: [],
		deaths: [],
		winners: [],
	}),

	getters: {
		gamePlayersSorted(state) {
			try {
				return state.game.state.players.sort((a, b) => a.number - b.number);
			} catch {
				return [];
			}
		},
		gameGraveyardGrouped(state) {
			try {
				return state.game.state.graveyard.reduce((group, record) => {
					const { deathDay } = record;
					group[deathDay] = group[deathDay] ?? [];
					group[deathDay].push(record);
					return group;
				}, {});
			} catch (e) {
				console.log('gameGraveyardGrouped error', e);
				return null;
			}
		},
		gameConfigTags(state) {
			try {
				return state.game.config.tags;
			} catch {
				return null;
			}
		},
		playerByNumber(state) {
			try {
				return (number) =>
					state.game.state.players.find((player) => player.number == number);
			} catch {
				return {};
			}
		},
		playerByAlias(state) {
			try {
				return (alias) => state.game.state.players.find((player) => player.alias == alias);
			} catch {
				return {};
			}
		},
		playerById(state) {
			try {
				return (id) => state.game.state.players.find((player) => player.id == id);
			} catch {
				return {};
			}
		},
		votesForPlayerByAlias(state) {
			return (alias) =>
				Object.entries(state.votes)
					.filter((vote) => vote[1] == alias)
					.map((arr) => arr[0]);
		},
		stageName(state) {
			try {
				return state.stage.name;
			} catch {
				return null;
			}
		},
		stageNameSplit(state) {
			try {
				return state.stage.name.split(' ')[0];
			} catch {
				return null;
			}
		},
		stageDuration(state) {
			return state.stage.duration ?? 0;
		},
		day(state) {
			try {
				return state.game.state.day;
			} catch {
				return null;
			}
		},
		roleConfig(state) {
			try {
				return state.game.config.roles[this.roleName];
			} catch {
				return {};
			}
		},
		roleName(state) {
			try {
				return state.actor.role;
			} catch {
				null;
			}
		},
		possibleTargets(state) {
			try {
				return state.actor.possible_targets;
			} catch {
				return null;
			}
		},
	},

	actions: {
		async _gameEventsHandler(topic, payload, dup, qos, retain) {
			const message = JSON.parse(decoder.decode(payload));
			console.log('Game IoT update', message);
			const mStore = useMafiaStore();

			let voter, target;
			switch (message.type) {
				case 'GAME:ACTOR':
					this.actor = message.data;
					console.log(`Setting actor ${this.actor}`);

					// Subscribe to faction if applicable
					console.log('Role', this.roleName);
					console.log('Roles', ROLES);
					// if (['mafia'].indexOf(ROLES[this.roleName].faction) > 0) {
					// 	IoT.connection.subscribe(`mafia/game/${gameId}/chat/${ROLES[this.roleName].faction}`, IoT.mqtt.QoS.AtLeastOnce, this._messageHandler) // Chat messages
					// }
					break;
				case 'GAME:NEWSTAGE':
					console.log('Updating stage', message.data);
					this.stage = message.data;
					break;
				case 'GAME:VOTE':
					voter = this.playerByNumber(message.data.voter);
					target = this.playerByNumber(message.data.target);
					console.log(`${voter.alias} has voted for ${target.alias}`);

					if (voter == this.actor.id) break;

					this.votes[voter.alias] = target.alias;
					break;
				case 'GAME:VOTECANCEL':
					voter = this.playerByNumber(message.data.voter);
					target = this.playerByNumber(message.data.target);
					console.log(`${voter.alias} has cancelled their vote`);

					if (voter == this.actor.id) break;

					delete this.votes[voter.alias];
					break;
				case 'GAME:TRIAL':
					this.playerOnTrial = this.playerByNumber(message.data.player);
					console.log(`The town has voted to place ${this.playerOnTrial.alias} on trial`);
					break;
				case 'GAME:TRIAL_OVER':
					this.playerOnTrial = null;
					console.log(`The trial is over`);
					break;
				case 'GAME:LYNCH':
					this.playerOnTrial = this.playerByNumber(message.data.player);
					console.log(`The town has voted to lynch ${this.playerOnTrial.alias}`);
					this.vote = null;
					this.votes = {};
					break;
				case 'GAME:STATE':
					this.game.state = message.data;
					console.log(`Updating game state`);
					break;
				case 'GAME:EVENT':
					console.log('New event');
					break;
				case 'GAME:DEATHS':
					console.log('Deaths for previous night', message.data);
					this.deaths = message.data;
					break;
				case 'GAME:OVER':
					console.log('GAME OVER. Winners:', message.data);
					this.winners = message.data;
					break;
				default:
					console.log('Unhandled GAME action type', message);
					break;
			}
		},
		async startGame(gameId) {
			const mStore = useMafiaStore();
			mStore.me.game = gameId;
			console.log(
				'Subscribing to',
				`mafia/game/${gameId}`,
				`mafia/game/${gameId}/actor/${mStore.me.id}`,
			);
			IoT.connection.subscribe(
				`mafia/game/${gameId}`,
				IoT.mqtt.QoS.AtLeastOnce,
				this._gameEventsHandler,
			); // Public updates
			IoT.connection.subscribe(
				`mafia/game/${gameId}/actor/${mStore.me.id}`,
				IoT.mqtt.QoS.AtLeastOnce,
				this._gameEventsHandler,
			); // Private updates
			IoT.connection.subscribe(
				`mafia/game/${gameId}/chat/all`,
				IoT.mqtt.QoS.AtLeastOnce,
				this._messageHandler,
			); // Chat messages

			let loading = Loading.show({
				spinner: QSpinnerGears,
				message: 'Loading Game details',
				boxClass: 'font-risque text-weight-bold',
			});
			await this.getGame();
			loading({
				spinner: QSpinnerGears,
				message: 'Assigning roles',
				boxClass: 'font-risque text-weight-bold',
			});
			await this.actor;
			loading();
		},
		async getActor(userId) {
			return api.get('/game/actor').then((response) => {
				this.actor = response.data;
			});
		},
		async getGame() {
			return api.get(`/game`).then((response) => {
				this.game = response.data;
			});
		},
		submitVote(targetNumber) {
			// Do an API post to submit the vote
			let target = this.playerByNumber(targetNumber);
			api.post('/game/vote', { target: targetNumber });

			// Remove the vote locally
			this.vote = targetNumber;
			this.votes[this.actor.alias] == target.alias;
		},
		cancelVote(targetNumber) {
			// Do an API post to submit the vote
			api.post('/game/vote', { target: targetNumber });

			// Remove the vote locally
			this.vote = null;
			delete this.votes[this.actor.alias];
		},
		submitVerdict(verdict) {
			api.post('/game/verdict', { verdict });
		},
		submitTarget(target, idx) {
			this.targets[idx] = target;
			api.post('/game/targets', { targets: this.targets });
		},
		cancelTarget(target, idx) {
			this.targets[idx] = 0;
			api.post('/game/targets', { targets: this.targets });
		},
		_messageHandler(topic, payload, dup, qos, retain) {
			const message = JSON.parse(decoder.decode(payload));
			this.messages.push(message);
		},
		sendMessage(msg) {
			api.post('/game/chat', msg);
		},
	},
});
