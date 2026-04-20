import { nodeConfig } from '../../eslint.config.base.mjs';

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
	},
];
