import { nodeConfig } from '../../eslint.config.base.mjs';

// SDK is consumed by the browser SPA. Restrict @mafia/core imports to pure
// schema/message paths to prevent leaking SST/AWS/Drizzle/Hono/Neon/ws.
// Allowed paths:
//   @mafia/core/message
//   @mafia/core/error/schema
//   @mafia/core/db/schema
//   @mafia/core/lobby/schema
//   @mafia/core/user/schema
//   @mafia/core/game/schema
//   @mafia/core/game/chat
const CORE_IMPORT_RESTRICTION = {
	regex:
		'^@mafia/core(?!/(message|error/schema|db/schema|lobby/schema|user/schema|game/schema|game/chat)$)(/.*)?$',
	message:
		'SDK may only import from pure @mafia/core schema paths (message, error/schema, db/schema, lobby/schema, user/schema, game/schema, game/chat).',
};

export default [
	...nodeConfig,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'no-restricted-imports': ['error', { patterns: [CORE_IMPORT_RESTRICTION] }],
		},
	},
];
