import { join } from 'path';
import { readFile } from 'fs/promises';

export const pkgs = ['packages/core', 'packages/functions', 'packages/engine', 'packages/web/app'];

export async function hasScript(pkgDir: string, scriptName: string): Promise<boolean> {
	try {
		const pkgJsonPath = join(pkgDir, 'package.json');
		const pkgJsonRaw = await readFile(pkgJsonPath, 'utf-8');
		const pkgJson = JSON.parse(pkgJsonRaw);
		return pkgJson.scripts?.[scriptName] !== undefined;
	} catch {
		return false;
	}
}
