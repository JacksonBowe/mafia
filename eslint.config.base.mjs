import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/**
 * Shared base ESLint configuration for all packages.
 * Individual packages extend this and add package-specific rules.
 */
export const baseConfig = [
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	prettierConfig,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			// Enforce type-only imports across all packages
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			// Allow unused vars with underscore prefix
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			// Relax some strict rules that are often too noisy
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-misused-promises': 'warn',
		},
	},
];

/**
 * Node.js-specific config for backend packages (core, functions, engine)
 */
export const nodeConfig = [
	...baseConfig,
	{
		languageOptions: {
			globals: {
				console: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				module: 'readonly',
				require: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				setImmediate: 'readonly',
				clearImmediate: 'readonly',
			},
		},
	},
];

export default baseConfig;
