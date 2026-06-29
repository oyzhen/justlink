import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        environment: 'node',
        pool: 'threads',
        maxWorkers: 1,
        fileParallelism: false,
        include: ['test/node.test.ts', 'test/memory.test.ts'],
    },
});
