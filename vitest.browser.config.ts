import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        include: ['test/browser.test.ts'],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', name: 'chromium', headless: true }],
        },
    },
});
