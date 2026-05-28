import { z } from 'zod';
import { DEFAULT_VESTS } from '../constants';
import { Actor, Neutral, type ActorContext, type ActorState } from './actor';
import { RoleTags } from './role';

export const SurvivorSettingsSchema = z.object({
	maxVests: z.number().int().min(0).default(DEFAULT_VESTS),
});

export type SurvivorSettings = z.infer<typeof SurvivorSettingsSchema>;
export type SurvivorSettingsInput = z.input<typeof SurvivorSettingsSchema>;

/**
 * Survivor is a Neutral Benign role. They win by being alive at the end of
 * the game alongside whichever faction also wins. They cannot trigger a game
 * end on their own — `checkForWin` always returns false; final win detection
 * in `Game.checkForWin` awards them as co-winners when another faction wins
 * or when they are the last actor alive.
 *
 * Night action: wear a self-vest (like Citizen), gaining night immunity for
 * the resolution cycle. Vest count is configurable via `maxVests`.
 */
export class Survivor extends Neutral {
	static override tags = [
		...super.tags,
		RoleTags.NeutralBenign,
	] as const;

	static override roleName = 'Survivor' as const;
	static override roleKey = 'survivor' as const;

	static override priority = 0;
	static settingsSchema = SurvivorSettingsSchema;
	static description = 'Neutral Benign role that wins by surviving to the end of the game.';

	private remainingVests = 0;

	constructor(
		input: ActorState,
		settings: SurvivorSettingsInput = {},
		context: ActorContext,
	) {
		super(input, context);
		this.alignment = 'Neutral';
		const parsed = SurvivorSettingsSchema.parse(settings);
		const fromActions = input.roleActions?.remainingVests;
		this.remainingVests =
			typeof fromActions === 'number' ? fromActions : parsed.maxVests;
	}

	override dumpState() {
		return {
			...super.dumpState(),
			roleActions: { remainingVests: this.remainingVests },
		};
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
			`${this.toString()} used vest on self. ${String(this.remainingVests)} remaining`,
		);
	}

	// Survivors that are alive are always 'winning' but they cannot trigger a game end
	override checkForWin(_actors: Actor[]): boolean {
		return this.alive;
	}
}
