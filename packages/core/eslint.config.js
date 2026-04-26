import { nodeConfig } from '../../eslint.config.base.mjs';

// Schema files must remain pure (browser-safe): no SST/AWS/Drizzle/Hono/Neon/ws.
// They may only import from `zod`, `@mafia/engine`, and other schema files.
const FORBIDDEN_IN_SCHEMAS = [
	{ name: 'sst', message: 'Schema files must not import sst.' },
	{ group: ['sst/*'], message: 'Schema files must not import sst.' },
	{ group: ['@aws-sdk/*'], message: 'Schema files must not import @aws-sdk/*.' },
	{ group: ['drizzle-orm', 'drizzle-orm/*'], message: 'Schema files must not import drizzle-orm.' },
	{ group: ['hono', 'hono/*', '@hono/*'], message: 'Schema files must not import hono.' },
	{ group: ['@neondatabase/*'], message: 'Schema files must not import @neondatabase/*.' },
	{ name: 'ws', message: 'Schema files must not import ws.' },
];

export default [
	...nodeConfig,
	{
		ignores: ['src/db/migrations/**'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		// Pure schema files: enforce browser-safe imports.
		files: ['src/**/schema.ts', 'src/**/schema/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: FORBIDDEN_IN_SCHEMAS.filter((p) => 'name' in p),
					patterns: FORBIDDEN_IN_SCHEMAS.filter((p) => 'group' in p),
				},
			],
		},
	},
];
