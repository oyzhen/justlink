import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    build: {
        lib: {
            entry: {
                core: resolve(import.meta.dirname, 'src/core.ts'),
                browser: resolve(import.meta.dirname, 'src/browser.ts'),
                node: resolve(import.meta.dirname, 'src/node.ts'),
                memory: resolve(import.meta.dirname, 'src/memory.ts'),
            },
            formats: ['es'],
            fileName: (_format, name) => `${name}.js`,
        },
        rollupOptions: {
            output: {
                preserveModules: true,
                preserveModulesRoot: 'src',
            },
        },
        minify: false,
        sourcemap: true,
        emptyOutDir: true,
    },
    publicDir: false,
});
