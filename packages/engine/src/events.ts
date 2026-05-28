import { EventIds } from './constants';

/**
 * Named tick durations for animation/timing of resolved event groups.
 * The runtime value is a plain `number` so groups can sum durations safely.
 */
export const Duration = {
	ZERO: 0,
	MAFIA_KILL: 3,
	SHOOTOUT: 3,
} as const;

export type GameEventTargets = string[];

export type GameEventDump = {
	eventId: string;
	targets: GameEventTargets;
	message: string;
};

export type GameEventGroupDump = {
	groupId: string | null;
	duration: number;
	events: Array<GameEventDump | GameEventGroupDump>;
};

export class GameEvent {
	constructor(
		public eventId: string,
		public targets: GameEventTargets,
		public message: string,
	) {}

	dump(): GameEventDump {
		return {
			eventId: this.eventId,
			targets: [...this.targets],
			message: this.message,
		};
	}
}

export type GameEventEntry = GameEvent | GameEventGroup;

export class GameEventGroup {
	public duration: number = Duration.ZERO;
	public events: GameEventEntry[] = [];

	constructor(public groupId: string | null = null) {}

	newEvent(event: GameEvent) {
		this.events.push(event);
	}

	newEventGroup(eventGroup: GameEventGroup) {
		this.duration += eventGroup.duration;
		this.events.push(eventGroup);
	}

	reset(newId?: string) {
		this.events = [];
		this.duration = Duration.ZERO;
		if (newId !== undefined) this.groupId = newId;
		return this;
	}

	clone(): GameEventGroup {
		const group = new GameEventGroup(this.groupId);
		group.duration = this.duration;
		group.events = this.events.map((event) =>
			event instanceof GameEventGroup
				? event.clone()
				: new GameEvent(event.eventId, [...event.targets], event.message),
		);
		return group;
	}

	dump(): GameEventGroupDump {
		return {
			groupId: this.groupId,
			duration: this.duration,
			events: this.events.map((event) => event.dump()),
		};
	}
}

/**
 * @deprecated Use {@link EventIds} from `@mafia/engine` directly.
 * Retained for backward compatibility with existing consumers.
 */
export const CommonEvents = {
	NIGHT_IMMUNE: EventIds.NIGHT_IMMUNE,
	KILLED_BY_MAFIA: EventIds.KILLED_BY_MAFIA,
} as const;
