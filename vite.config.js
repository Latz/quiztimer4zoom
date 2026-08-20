import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

import path from 'node:path';

export default defineConfig({
	build: {
		target: 'node22',
		rollupOptions: {
			input: 'api/index.js',
			output: {
				entryFileNames: `api/[name].js`,
				chunkFileNames: `api/[name].js`,
				assetFileNames: `api/[name].[ext]`,
			},
		},
		assetsDir: 'api',
		emptyOutDir: true,
	},
	assetsInclude: ['**/images/**'],
	framework: 'vite',

	plugins: [
		ViteMinifyPlugin({}),
		viteStaticCopy({
			targets: [
				{
					src: path.resolve(__dirname, 'quiztimer*'),
					dest: './',
				},
				{
					src: path.resolve(__dirname, 'images/*'),
					dest: './images',
				},
				{
					src: path.resolve(__dirname, 'scripts/*'),
					dest: './scripts',
				},
				{
					src: path.resolve(__dirname, 'api/quiztimer.html'),
					dest: 'api/',
				},
			],
		}),
	],
});
