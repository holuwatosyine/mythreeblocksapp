import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [ 'dist/**', 'node_modules/**', 'public/**', '.three-blocks/**' ],
	},
	{
		files: [
			'src/**/*.ts',
			'vite.config.ts',
			'three-blocks.text.ts',
			'templates/**/*.ts',
		],
		languageOptions: {
			parser: tseslint.parser,
		},
		plugins: {
			'@stylistic': stylistic,
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'no-var': 'error',
			'prefer-const': [ 'error', { destructuring: 'all' } ],
			eqeqeq: [ 'error', 'smart' ],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' },
			],
			'@stylistic/indent': [ 'error', 'tab', { SwitchCase: 1 } ],
			'@stylistic/quotes': [ 'error', 'single', { avoidEscape: true } ],
			'@stylistic/semi': [ 'error', 'always' ],
			'@stylistic/space-in-parens': [ 'error', 'always' ],
			'@stylistic/array-bracket-spacing': [ 'error', 'always' ],
			'@stylistic/object-curly-spacing': [ 'error', 'always' ],
			'@stylistic/computed-property-spacing': [ 'error', 'always' ],
			'@stylistic/max-statements-per-line': [ 'error', { max: 1 } ],
			'@stylistic/padded-blocks': [ 'error', { classes: 'always' } ],
			'@stylistic/max-len': [
				'warn',
				{ code: 140, ignoreStrings: true, ignoreUrls: true },
			],
		},
	}
);
