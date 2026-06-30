import type { EmitFn } from '@/core.ts';

/**
 * Event test implementation — factory pattern.
 *
 * The `emitManually` method lets tests emit arbitrary events from the
 * main-thread side (via $exec), making event tests deterministic without
 * relying on timers or internal state.
 */
export function createEventImpl(emit: EmitFn) {
    return {
        add(a: number, b: number) {
            return a + b;
        },
        emitManually(eventName: string, ...args: unknown[]) {
            emit(eventName, ...args);
        },
    };
}

export type EventImpl = ReturnType<typeof createEventImpl>;
