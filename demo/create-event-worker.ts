import type { RemoteApi } from '@/core.ts';
import type { EventImpl, EventMap } from './worker-event-impl.ts';

/**
 * Creates an event-capable RemoteApi that works everywhere:
 * - Real Web Worker when Worker is available
 * - In-process via justlink/memory fallback
 *
 * In Worker mode, events flow through the real postMessage channel.
 * In memory mode, the factory's `emit` is captured directly.
 */
export async function createEventWorker(): Promise<{
    api: RemoteApi<EventImpl, EventMap>;
    emit?: (eventName: string, ...args: unknown[]) => void;
}> {
    if (typeof Worker !== 'undefined') {
        const { wrap } = await import('@/browser.ts');
        const { default: WorkerFactory } = await import('./worker-event-runner.ts?worker');
        return { api: wrap<EventImpl, EventMap>(new WorkerFactory()) };
    }

    const { createMemoryPair, expose, wrap } = await import('@/memory.ts');
    const { createEventImpl } = await import('./worker-event-impl.ts');
    const { host, worker } = createMemoryPair();
    const emit = expose(worker, emit => createEventImpl(emit));
    return { api: wrap<EventImpl, EventMap>(host), emit };
}
