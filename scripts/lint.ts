import { $ } from 'bun';

import { pkgs, hasScript } from './index';

async function main() {
	for (const pkg of pkgs) {
		console.log(`\n🔎 Checking ${pkg}`);

		if (await hasScript(pkg, 'lint')) {
			console.log(`🧹 Linting ${pkg}`);
			await $`bun run --cwd ${pkg} lint`;
		}
	}
}

main();
