import { nodeConfig } from '../../eslint.config.base.mjs';

export default [
	{
		ignores: ['**/*.d.ts'],
	},
	...nodeConfig,
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
