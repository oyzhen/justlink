import type { RemoteApi } from '@/core.ts';
import type { Impl } from './worker-impl.ts';

/**
 * Creates a RemoteApi that works everywhere:
 * - Real Web Worker when `typeof Worker !== 'undefined'`
 * - In-process via justlink/memory when Worker is unavailable (SSR, sandbox, etc.)
 */
export async function createUniversalWorker(): Promise<RemoteApi<Impl>> {
    if (typeof Worker !== 'undefined') {
        const { wrap } = await import('@/browser.ts');
        const { default: WorkerFactory } = await import('./worker-runner.ts?worker');
        return wrap<Impl>(new WorkerFactory());
    }

    const { createMemoryPair, expose, wrap } = await import('@/memory.ts');
    const { impl } = await import('./worker-impl.ts');
    const { host, worker } = createMemoryPair();
    expose(worker, impl);
    return wrap<Impl>(host);
}
