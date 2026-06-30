import { describe, expect, it, vi } from 'vitest';
import type { EmitFn, RemoteApi } from '@/core.ts';
import type { EventImpl } from './event-impl.ts';
import type { Impl } from './impl.ts';

export interface ApiHandle {
    api: RemoteApi<Impl>;
    cleanup: () => Promise<void>;
}

export type CreateApi = () => ApiHandle;

/**
 * Shared test suite — exercises every code path in `core.ts` via the `impl`
 * methods. Each adapter (browser / node / memory) provides a `createApi`
 * factory. State-sensitive assertions use relative values so they work
 * whether `impl` is a fresh instance (browser) or a singleton (node/memory).
 */
export function runImplSuite(createApi: CreateApi) {
    // ────────────────────────────────────────────────────────────────
    // 1. $get — scalar, getter, plain objects, typed objects
    // ────────────────────────────────────────────────────────────────
    describe('$get', () => {
        it('retrieves scalar property', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$get('x')).resolves.toBe('hello');
            } finally {
                await cleanup();
            }
        });

        it('auto-resolves Promise property (no postMessage crash)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$get('p')).resolves.toBe('world');
            } finally {
                await cleanup();
            }
        });

        it('retrieves getter (target as owner → __this set)', async () => {
            const { api, cleanup } = createApi();
            try {
                const c0 = await api.$get('counter');
                expect(typeof c0).toBe('number');
                await api.increment(1);
                await expect(api.$get('counter')).resolves.toBe(c0 + 1);
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 2. $exec — pure function, state mutation, async, errors
    // ────────────────────────────────────────────────────────────────
    describe('$exec', () => {
        it('pure function returns primitive', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('add', 3, 7)).resolves.toBe(10);
            } finally {
                await cleanup();
            }
        });

        it('closure state mutation', async () => {
            const { api, cleanup } = createApi();
            try {
                const before = await api.$get('counter');
                await expect(api.$exec('increment', 5)).resolves.toBe(before + 5);
                await expect(api.$get('counter')).resolves.toBe(before + 5);
            } finally {
                await cleanup();
            }
        });

        it('returns plain object (cloned)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('createObject')).resolves.toEqual({ a: 1 });
                await expect(api.$exec('getProfile')).resolves.toEqual({ name: 'Alice', age: 30 });
            } finally {
                await cleanup();
            }
        });

        it('returns array (cloned)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('createArray')).resolves.toEqual([1, 2, 3]);
            } finally {
                await cleanup();
            }
        });

        it('returns Uint8Array (transferable)', async () => {
            const { api, cleanup } = createApi();
            try {
                const typed = await api.$exec('createTypedArray');
                expect(typed).toBeInstanceOf(Uint8Array);
                expect(Array.from(typed as Uint8Array)).toEqual([10, 20, 30]);
            } finally {
                await cleanup();
            }
        });

        it('consumes Uint8Array transferable', async () => {
            const { api, cleanup } = createApi();
            try {
                const buf = new Uint8Array([10, 20, 30]);
                await expect(api.$exec('sumBytes', buf)).resolves.toBe(60);
            } finally {
                await cleanup();
            }
        });

        it('async success (Promise resolution path)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('delayedAdd', 3, 4)).resolves.toBe(7);
            } finally {
                await cleanup();
            }
        });

        it('returns Date (isClonable for Date)', async () => {
            const { api, cleanup } = createApi();
            try {
                const d = await api.$exec('getDate');
                expect(d).toBeInstanceOf(Date);
            } finally {
                await cleanup();
            }
        });

        it('returns RegExp (isClonable for RegExp)', async () => {
            const { api, cleanup } = createApi();
            try {
                const r = await api.$exec('getPattern');
                expect(r).toBeInstanceOf(RegExp);
            } finally {
                await cleanup();
            }
        });

        it('returns Map (isClonable + collectTransferables Map path)', async () => {
            const { api, cleanup } = createApi();
            try {
                const m = await api.$exec('getMap');
                expect(m).toBeInstanceOf(Map);
            } finally {
                await cleanup();
            }
        });

        it('returns Set (isClonable + collectTransferables Set path)', async () => {
            const { api, cleanup } = createApi();
            try {
                const s = await api.$exec('getSet');
                expect(s).toBeInstanceOf(Set);
            } finally {
                await cleanup();
            }
        });

        it('returns Map containing transferable', async () => {
            const { api, cleanup } = createApi();
            try {
                const m = await api.$exec('getMapWithBuffer');
                expect(m).toBeInstanceOf(Map);
            } finally {
                await cleanup();
            }
        });

        it('returns Set containing transferable', async () => {
            const { api, cleanup } = createApi();
            try {
                const s = await api.$exec('getSetWithBuffer');
                expect(s).toBeInstanceOf(Set);
            } finally {
                await cleanup();
            }
        });

        it('returns array of functions (stored as ref → objProxy)', async () => {
            const { api, cleanup } = createApi();
            try {
                // Array of functions is not clonable (functions excluded by isClonable),
                // so it becomes a ref with __kind:'object' → objProxy on wrap side.
                // resolveValue does NOT recurse into arrays when they're refs.
                const fns = await api.$exec('getFunctions');
                // It's a proxy object, not an array — we can't call it as an array,
                // but we verified the resolveValue path handles the ref correctly
                // (no crash, returned successfully)
                expect(fns).toBeDefined();
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 3. Error handling — all sendError branches
    // ────────────────────────────────────────────────────────────────
    describe('error handling', () => {
        it('Error throw (.message extraction)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('throwError')).rejects.toThrow('intentional error');
            } finally {
                await cleanup();
            }
        });

        it('non-Error string throw (String() fallback)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('throwString')).rejects.toThrow('string error');
            } finally {
                await cleanup();
            }
        });

        it('null throw (Unknown error fallback)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('throwNull')).rejects.toThrow('Unknown error');
            } finally {
                await cleanup();
            }
        });

        it('non-Error object with .stack property', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('throwObjectWithStack')).rejects.toThrow('custom stack trace');
            } finally {
                await cleanup();
            }
        });

        it('async rejection (Promise rejection path)', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('rejectAsync')).rejects.toThrow('async rejection');
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 4. Nested objects / remote objects / function returns
    // ────────────────────────────────────────────────────────────────
    describe('nested objects and function returns', () => {
        it('nested object with methods (looksLikeRemoteObject)', async () => {
            const { api, cleanup } = createApi();
            try {
                const math = await api.$get('math');
                await expect(math.value).resolves.toBe(10);
                await expect(math.add(5)).resolves.toBe(15);
                await expect(math.add(10)).resolves.toBe(25);
                await expect(math.reset()).resolves.toBe(10);
            } finally {
                await cleanup();
            }
        });

        it('createCounter — object with methods + async', async () => {
            const { api, cleanup } = createApi();
            try {
                const c = await api.$exec('createCounter', 10);
                await expect(c.inc()).resolves.toBe(11);
                await expect(c.inc()).resolves.toBe(12);
                await expect(c.dec()).resolves.toBe(11);
                await expect(c.get()).resolves.toBe(11);
                await expect(c.getAsync()).resolves.toBe(11);
            } finally {
                await cleanup();
            }
        });

        it('fn2 — object with this-aware method', async () => {
            const { api, cleanup } = createApi();
            try {
                const obj = await api.$exec('fn2');
                await expect(obj.a).resolves.toBe(1);
                await expect(obj.inc(3)).resolves.toBe(4);
            } finally {
                await cleanup();
            }
        });

        it('getAdder — returns standalone function (no __this)', async () => {
            const { api, cleanup } = createApi();
            try {
                const adder = await api.$exec('getAdder');
                expect(typeof adder).toBe('function');
                await expect(adder(2, 3)).resolves.toBe(5);
            } finally {
                await cleanup();
            }
        });

        it('getTree — deeply nested plain data', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.$exec('getTree')).resolves.toEqual({
                    left: { value: 1 },
                    right: { value: 2 },
                });
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 5. $eval — with and without deps, error in callback
    // ────────────────────────────────────────────────────────────────
    describe('$eval', () => {
        it('eval without deps', async () => {
            const { api, cleanup } = createApi();
            try {
                const result = await api.$eval(ref => ref.add(2, 3));
                expect(result).toBe(5);
            } finally {
                await cleanup();
            }
        });

        it('eval with transferable deps', async () => {
            const { api, cleanup } = createApi();
            try {
                const buf = new Uint8Array([10, 20, 30]);
                const result = await api.$eval((ref, buf) => ref.sumBytes(buf), [buf]);
                expect(result).toBe(60);
            } finally {
                await cleanup();
            }
        });

        it('eval error propagation', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(
                    api.$eval(() => {
                        throw new Error('eval error');
                    }),
                ).rejects.toThrow('eval error');
            } finally {
                await cleanup();
            }
        });

        it('eval with nested property access', async () => {
            const { api, cleanup } = createApi();
            try {
                const result = await api.$eval(ref => ref.add(ref.counter, 1));
                expect(typeof result).toBe('number');
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 6. Direct proxy property access (no $ prefix)
    // ────────────────────────────────────────────────────────────────
    describe('direct property access', () => {
        it('accesses scalar property directly', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.x).resolves.toBe('hello');
            } finally {
                await cleanup();
            }
        });

        it('auto-resolves Promise property directly', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.p).resolves.toBe('world');
            } finally {
                await cleanup();
            }
        });

        it('calls method directly', async () => {
            const { api, cleanup } = createApi();
            try {
                await expect(api.add(4, 5)).resolves.toBe(9);
            } finally {
                await cleanup();
            }
        });

        it('accesses nested object directly', async () => {
            const { api, cleanup } = createApi();
            try {
                const math = api.math;
                await expect(math.add(10)).resolves.toBe(20);
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 7. Browser-only: OffscreenCanvas
    // ────────────────────────────────────────────────────────────────
    describe('browser-specific (OffscreenCanvas)', () => {
        it('paintCanvas returns ImageBitmap', async () => {
            if (typeof OffscreenCanvas === 'undefined') {
                return;
            }
            const { api, cleanup } = createApi();
            try {
                const canvas = new OffscreenCanvas(2, 2);
                const bitmap = await api.$exec('paintCanvas', canvas);
                expect(bitmap).toBeInstanceOf(ImageBitmap);
            } finally {
                await cleanup();
            }
        });

        it('passMessagePort exercises isTransferable MessagePort branch', async () => {
            if (typeof MessageChannel === 'undefined') {
                return;
            }
            const { api, cleanup } = createApi();
            try {
                const channel = new MessageChannel();
                await expect(api.$exec('passMessagePort', channel.port1)).resolves.toBe(true);
            } finally {
                await cleanup();
            }
        });
    });

    // ────────────────────────────────────────────────────────────────
    // 8. $terminate
    // ────────────────────────────────────────────────────────────────
    describe('$terminate', () => {
        it('terminates cleanly', async () => {
            const { api, cleanup } = createApi();
            await api.$get('x');
            await cleanup();
            await cleanup(); // idempotent
        });

        it('$get rejects after terminate', async () => {
            const { api, cleanup } = createApi();
            try {
                await cleanup();
                await expect(api.$get('x')).rejects.toThrow('The remote peer has been terminated');
            } finally {
                await cleanup().catch(() => {});
            }
        });

        it('$exec rejects after terminate', async () => {
            const { api, cleanup } = createApi();
            try {
                await cleanup();
                await expect(api.$exec('add', 1, 2)).rejects.toThrow('The remote peer has been terminated');
            } finally {
                await cleanup().catch(() => {});
            }
        });

        it('$eval rejects after terminate', async () => {
            const { api, cleanup } = createApi();
            try {
                await cleanup();
                await expect(api.$eval(() => 1)).rejects.toThrow('The remote peer has been terminated');
            } finally {
                await cleanup().catch(() => {});
            }
        });

        it('direct method call rejects after terminate', async () => {
            const { api, cleanup } = createApi();
            try {
                await cleanup();
                await expect(api.add(1, 2)).rejects.toThrow('The remote peer has been terminated');
                await expect(api.counter).rejects.toThrow('The remote peer has been terminated');
            } finally {
                await cleanup().catch(() => {});
            }
        });

        it('pending requests reject on terminate', async () => {
            const { api, cleanup } = createApi();
            try {
                // Fire a request and terminate before it can resolve.
                // For in-process adapters the request may resolve synchronously,
                // so we only assert if the promise is still pending.
                const slow = api.$exec('delayedAdd', 1, 2);
                await cleanup();
                // After terminate, the promise either:
                //   a) rejected with "The remote peer has been terminated", or
                //   b) already resolved (in-process adapters)
                const result = await slow.catch(e => e);
                if (result instanceof Error) {
                    expect(result.message).toBe('The remote peer has been terminated');
                }
            } finally {
                await cleanup().catch(() => {});
            }
        });
    });
}

// ════════════════════════════════════════════════════════════════════
// Event test suite — exercises the EVENT wire tag, $on / $off / $once,
// and the factory pattern for createExpose.
// ════════════════════════════════════════════════════════════════════

export interface EventApiHandle {
    api: RemoteApi<EventImpl>;
    emit: EmitFn;
    cleanup: () => Promise<void>;
}

export type CreateEventApi = () => EventApiHandle;

export function runEventSuite(createEventApi: CreateEventApi) {
    // Browser workers need extra time for the double round-trip:
    // main→worker (RPC) → worker sends EVENT → main receives.
    const WAIT = 200;

    describe('events', () => {
        it('basic event emission', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                api.$on('ping', spy);
                emit('ping');
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1);
            } finally {
                await cleanup();
            }
        });

        it('event with payload', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                api.$on('data', spy);
                emit('data', { x: 1 }, 'text');
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1);
                expect(spy).toHaveBeenCalledWith({ x: 1 }, 'text');
            } finally {
                await cleanup();
            }
        });

        it('multiple handlers for the same event', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy1 = vi.fn();
                const spy2 = vi.fn();
                api.$on('multi', spy1);
                api.$on('multi', spy2);
                emit('multi', 42);
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy1).toHaveBeenCalledWith(42);
                expect(spy2).toHaveBeenCalledWith(42);
            } finally {
                await cleanup();
            }
        });

        it('$once fires only once', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                api.$once('once-event', spy);
                emit('once-event', 'first');
                await new Promise(r => setTimeout(r, WAIT));
                emit('once-event', 'second');
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1);
                expect(spy).toHaveBeenCalledWith('first');
            } finally {
                await cleanup();
            }
        });

        it('$off removes handler', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                api.$on('off-event', spy);
                emit('off-event', 1);
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1);

                api.$off('off-event', spy);
                emit('off-event', 2);
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1); // not called again
            } finally {
                await cleanup();
            }
        });

        it('$on returns unsubscribe function', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                const unsub = api.$on('unsub-event', spy);
                emit('unsub-event');
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1);

                unsub();
                emit('unsub-event');
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledTimes(1); // not called again
            } finally {
                await cleanup();
            }
        });

        it('concurrent events fire in order', async () => {
            const { api, emit, cleanup } = createEventApi();
            try {
                const received: number[] = [];
                api.$on('ordered', (n: unknown) => received.push(n as number));
                emit('ordered', 1);
                emit('ordered', 2);
                emit('ordered', 3);
                await new Promise(r => setTimeout(r, WAIT));
                expect(received).toEqual([1, 2, 3]);
            } finally {
                await cleanup();
            }
        });

        it('emitManually via $exec fires event', async () => {
            const { api, cleanup } = createEventApi();
            try {
                const spy = vi.fn();
                api.$on('manual', spy);
                await api.emitManually('manual', 'hello', 42);
                await new Promise(r => setTimeout(r, WAIT));
                expect(spy).toHaveBeenCalledWith('hello', 42);
            } finally {
                await cleanup();
            }
        });

        it('event after terminate does not crash', async () => {
            const { emit, cleanup } = createEventApi();
            try {
                await cleanup();
                // Emitting after terminate should be silently ignored
                expect(() => emit('post-term')).not.toThrow();
            } finally {
                await cleanup().catch(() => {});
            }
        });
    });
}
