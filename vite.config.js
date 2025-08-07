import { defineConfig } from 'vite';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

export default defineConfig({
    build: {
        rollupOptions: {
            input: 'api/quiztimer.html',
        },
        outDir: 'dist'
    },
    plugins: [
        ViteMinifyPlugin({}),
    ],
});
