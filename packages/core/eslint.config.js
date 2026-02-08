import { nodeConfig } from '../../eslint.config.base.mjs';

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
];
