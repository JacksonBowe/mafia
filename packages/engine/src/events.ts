export const Duration = {
	ZERO: 0,
	MAFIA_KILL: 3,
	SHOOTOUT: 3,
} as const;

export type DurationValue = (typeof Duration)[keyof typeof Duration];

export type GameEventTargets = Array<string>;

export type GameEventDump = {
	eventId: string;
	targets: GameEventTargets;
	message: string;
};

export type GameEventGroupDump = {
	groupId: string | null;
	duration: DurationValue;
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
			targets: this.targets,
			message: this.message,
		};
	}
}

export type GameEventEntry = GameEvent | GameEventGroup;

export class GameEventGroup {
	public duration: DurationValue = Duration.ZERO;
	public events: GameEventEntry[] = [];

	constructor(public groupId: string | null = null) {}

	newEvent(event: GameEvent) {
		this.events.push(event);
	}

	newEventGroup(eventGroup: GameEventGroup) {
		this.duration = (this.duration + eventGroup.duration) as DurationValue;
		this.events.push(eventGroup);
	}

	reset(newId?: string) {
		this.events = [];
		this.duration = Duration.ZERO;
		if (newId) this.groupId = newId;
		return this;
	}

	getById(id: string) {
		for (const event of this.events) {
			if (event instanceof GameEventGroup && event.groupId === id) return event;
			if (event instanceof GameEvent && event.eventId === id) return event;
		}
		return undefined;
	}

	clone() {
		const group = new GameEventGroup(this.groupId ?? null);
		group.duration = this.duration;
		group.events = this.events.map((event) =>
			event instanceof GameEventGroup ? event.clone() : new GameEvent(event.eventId, [...event.targets], event.message),
		);
		return group;
	}

	dump(): GameEventGroupDump {
		return {
			groupId: this.groupId,
			duration: this.duration,
			events: this.events.map((event) =>
				event instanceof GameEventGroup ? event.dump() : event.dump(),
			),
		};
	}
}

export const CommonEvents = {
	INVALID_TARGET: 'invalid_target',
	NIGHT_IMMUNE: 'night_immune',
	KILLED_BY_MAFIA: 'killed_by_mafia',
	VISITED_BY: 'visited_by',
} as const;
