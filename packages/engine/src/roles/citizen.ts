import { z } from 'zod';
import type { ActorState } from '../types';
import { Town, type ActorContext, type Actor } from './actor';

const CitizenSettingsSchema = z.object({
	maxVests: z.number().int().min(0).default(2),
});

export class Citizen extends Town {
	static override tags = ['any_random', 'town_random', 'town_government'];
	private remainingVests = 0;

	constructor(
		input: ActorState,
		settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(input, context);
		const parsed = CitizenSettingsSchema.parse(settings);
		const fromActions = input.roleActions?.remainingVests as number | undefined;
		this.remainingVests = typeof fromActions === 'number' ? fromActions : parsed.maxVests;
	}

	override dumpState() {
		return {
			...super.dumpState(),
			roleActions: { remainingVests: this.remainingVests },
		};
	}

	override checkForWin(actors: Actor[]) {
		const factionWin = super.checkForWin(actors);
		if (factionWin) return true;
		if (actors.length === 2 && actors.some((actor) => actor instanceof Citizen)) return true;
		return false;
	}

	override findPossibleTargets(_actors: Actor[] = []) {
		this.possibleTargets = [];
		if (this.remainingVests > 0) {
			this.possibleTargets = [[this]];
		}
		return this.possibleTargets;
	}

	override action() {
		if (this.remainingVests <= 0) {
			this.logger.critical(`${this.toString()} tried to use vest but has 0 remaining`);
			return;
		}
		this.remainingVests -= 1;
		const target = this.targets[0];
		if (!target) return;
		target.nightImmune = true;
		this.logger.info(
			`|${this.roleName}| ${this.alias}(${String(this.number)}) used vest on ${
				target === this ? 'self' : target.toString()
			}. ${String(this.remainingVests)} remaining`,
		);
	}
}
