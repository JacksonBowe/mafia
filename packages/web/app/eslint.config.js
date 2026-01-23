import js from '@eslint/js';
import pluginQuasar from '@quasar/app-vite/eslint';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

/**
 * Web app ESLint config.
 * Uses Vue/Quasar tooling but aligns with the shared rules from the root config:
 * - @typescript-eslint/consistent-type-imports
 * - Prettier integration
 */
export default defineConfigWithVueTs(
	{
		/**
		 * Ignore the following files.
		 * Please note that pluginQuasar.configs.recommended() already ignores
		 * the "node_modules" folder for you (and all other Quasar project
		 * relevant folders and files).
		 *
		 * ESLint requires "ignores" key to be the only one in this object
		 */
		// ignores: []
	},

	pluginQuasar.configs.recommended(),
	js.configs.recommended,

	/**
	 * https://eslint.vuejs.org
	 *
	 * pluginVue.configs.base
	 *   -> Settings and rules to enable correct ESLint parsing.
	 * pluginVue.configs[ 'flat/essential']
	 *   -> base, plus rules to prevent errors or unintended behavior.
	 * pluginVue.configs["flat/strongly-recommended"]
	 *   -> Above, plus rules to considerably improve code readability and/or dev experience.
	 * pluginVue.configs["flat/recommended"]
	 *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
	 */
	pluginVue.configs['flat/essential'],

	{
		files: ['**/*.ts', '**/*.vue'],
		rules: {
			// Shared rule: enforce type-only imports (aligned with root config)
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
		},
	},
	// https://github.com/vuejs/eslint-config-typescript
	vueTsConfigs.recommendedTypeChecked,

	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',

			globals: {
				...globals.browser,
				...globals.node, // SSR, Electron, config files
				process: 'readonly', // process.env.*
				ga: 'readonly', // Google Analytics
				cordova: 'readonly',
				Capacitor: 'readonly',
				chrome: 'readonly', // BEX related
				browser: 'readonly', // BEX related
			},
		},

		rules: {
			// Shared rules (aligned with root config)
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-misused-promises': 'warn',

			// Vue/Quasar-specific rules
			'prefer-promise-reject-errors': 'off',
			'vue/multi-word-component-names': 'off',
			// allow debugger during development only
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-ignore': true,
					'ts-nocheck': false, // allow it
					'ts-check': true,
					minimumDescriptionLength: 0,
				},
			],
		},
	},

	{
		files: ['src-pwa/custom-service-worker.ts'],
		languageOptions: {
			globals: {
				...globals.serviceworker,
			},
		},
	},

	prettierSkipFormatting,
);
