import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['**/node_modules/**', '**/temp/**'],
		globalSetup: './tests/setup/global-setup.js',
		setupFiles: ['./tests/setup/localStorage-stub.js'],
		environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: './coverage',
			include: ['api/**/*.js', 'scripts/**/*.js', 'public/**/*.js'],
			exclude: ['**/sdk.js', '**/toolcool-range-slider.min.js', 'tests/**'],
			thresholds: { lines: 70, functions: 70, branches: 60 },
		},
	},
});
