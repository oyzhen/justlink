import type { EmitFn } from '@/core.ts';

/** Declared event map — drives type safety on both emit and $on/$off/$once. */
export type EventMap = {
    greeted: [data: { name: string; time: number }];
    computed: [data: { op: string; args: number[]; result: number }];
    tick: [data: { count: number; time: number }];
    'ticker-started': [data: { intervalMs: number }];
    'ticker-stopped': [data: { finalCount: number }];
};

/**
 * Event demo implementation — factory pattern.
 * The `emit` function is typed via EventMap, so calling
 * `emit('tick', ...)` enforces the correct argument types.
 */
export function createEventImpl(emit: EmitFn<EventMap>) {
    let ticker = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    return {
        greet(name: string) {
            emit('greeted', { name, time: Date.now() });
            return `Hello, ${name}!`;
        },
        add(a: number, b: number) {
            const result = a + b;
            emit('computed', { op: 'add', args: [a, b], result });
            return result;
        },
        // nested object
        math: {
            multiply(a: number, b: number) {
                const result = a * b;
                emit('computed', { op: 'multiply', args: [a, b], result });
                return result;
            },
        },
        // start ticker — emits periodic events
        startTicker(intervalMs: number) {
            if (intervalId) {
                clearInterval(intervalId);
            }
            ticker = 0;
            intervalId = setInterval(() => {
                ticker++;
                emit('tick', { count: ticker, time: Date.now() });
            }, intervalMs);
            emit('ticker-started', { intervalMs });
        },
        stopTicker() {
            if (intervalId) {
                clearInterval(intervalId);
            }
            intervalId = undefined;
            emit('ticker-stopped', { finalCount: ticker });
        },
        // returns object with methods
        createCounter(init: number) {
            let n = init;
            return {
                inc() {
                    return ++n;
                },
                dec() {
                    return --n;
                },
                get() {
                    return n;
                },
            };
        },
    };
}

export type EventImpl = ReturnType<typeof createEventImpl>;
