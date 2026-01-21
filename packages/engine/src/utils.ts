export type Rng = {
	(): number;
	int: (min: number, max: number) => number;
	choice: <T>(items: T[]) => T;
	shuffle: <T>(items: T[]) => T[];
	choices: <T>(items: T[], weights: number[], k?: number) => T[];
};

const mulberry32 = (seed: number) => {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
};

export const createRng = (seed?: number): Rng => {
	const base = seed === undefined ? Math.random : mulberry32(seed);
	const rng = base as Rng;

	rng.int = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
	rng.choice = (items) => {
		if (items.length === 0) {
			throw new Error('Cannot choose from empty list');
		}
		return items[Math.floor(rng() * items.length)];
	};
	rng.shuffle = (items) => {
		const copy = [...items];
		for (let i = copy.length - 1; i > 0; i -= 1) {
			const j = Math.floor(rng() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	};
	rng.choices = (items, weights, k = 1) => {
		if (items.length !== weights.length) {
			throw new Error('weights length must match items length');
		}
		const total = weights.reduce((sum, w) => sum + w, 0);
		const cumulative = weights.reduce<number[]>((acc, w, idx) => {
			acc.push((acc[idx - 1] ?? 0) + w / total);
			return acc;
		}, []);
		const picks: typeof items = [];
		for (let i = 0; i < k; i += 1) {
			const r = rng();
			const index = cumulative.findIndex((c) => r <= c);
			picks.push(items[index === -1 ? items.length - 1 : index]);
		}
		return picks;
	};

	return rng;
};

export const toSnakeCase = (value: string) =>
	value
		.replace(/\s+/g, '_')
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.toLowerCase();
