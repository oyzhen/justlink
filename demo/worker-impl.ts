/**
 * Shared implementation for the demo.
 * Exercises every code path: $get, $exec, $eval, direct proxy access,
 * nested objects, function returns, this-binding, async, error handling,
 * Uint8Array transferables, OffscreenCanvas, and more.
 */

let counter = 0;

export const impl = {
    // -- scalar property --
    x: 'hello',

    // -- a promise
    p: Promise.resolve('world'),

    // -- getter (exercises $get → target as owner) --
    get counter() {
        return counter;
    },

    // -- pure function --
    add(a: number, b: number) {
        return a + b;
    },

    // -- closure state mutation --
    increment(n: number) {
        return (counter += n);
    },

    // -- return plain object (isClonable=true, !looksLikeRemote) --
    createObject() {
        return { a: 1 };
    },

    // -- return array (isClonable=true) --
    createArray() {
        return [1, 2, 3];
    },

    // -- return Uint8Array (transferable + clonable) --
    createTypedArray() {
        return new Uint8Array([10, 20, 30]);
    },

    // -- consume transferable Uint8Array --
    sumBytes(buf: Uint8Array) {
        return buf.reduce((sum, x) => sum + x, 0);
    },

    // -- OffscreenCanvas → ImageBitmap (browser-only) --
    paintCanvas(canvas: OffscreenCanvas) {
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 2, 2);
        return canvas.transferToImageBitmap();
    },

    // -- nested object with methods (looksLikeRemoteObject=true) --
    math: (() => {
        let val = 10;
        return {
            get value() {
                return val;
            },
            add(n: number) {
                return (val += n);
            },
            reset() {
                val = 10;
                return val;
            },
        };
    })(),

    // -- return object with methods + this binding + async --
    createCounter(init: number) {
        let count = init;
        return {
            inc() {
                return ++count;
            },
            dec() {
                return --count;
            },
            get() {
                return count;
            },
            async getAsync() {
                return count;
            },
        };
    },

    // -- return object with this-aware method --
    fn2() {
        return {
            a: 1,
            inc(v: number) {
                this.a += v;
                return this.a;
            },
        };
    },

    // -- Error throw (.message extraction) --
    throwError() {
        throw new Error('intentional error');
    },

    // -- Non-Error string throw (String() fallback) --
    throwString() {
        throw 'string error';
    },

    // -- Null throw ('Unknown error' fallback) --
    throwNull() {
        throw null as unknown as Error;
    },

    // -- Non-Error object with .stack property --
    throwObjectWithStack() {
        throw { stack: 'custom stack trace', message: '' } as unknown as Error;
    },

    // -- Async rejection (Promise rejection path) --
    async rejectAsync() {
        throw new Error('async rejection');
    },

    // -- Return standalone function (no __this) --
    getAdder() {
        return (a: number, b: number) => a + b;
    },

    // -- Return plain object (looksLikeRemoteObject=false) --
    getProfile() {
        return { name: 'Alice', age: 30 };
    },

    // -- Return deeply nested plain data (no methods) --
    getTree() {
        return { left: { value: 1 }, right: { value: 2 } };
    },

    // -- Return Date (isClonable for Date) --
    getDate() {
        return new Date('2025-01-15T12:00:00Z');
    },

    // -- Return RegExp (isClonable for RegExp) --
    getPattern() {
        return /hello/gi;
    },

    // -- Return Map (isClonable + collectTransferables Map path) --
    getMap() {
        return new Map<string, number>([
            ['a', 1],
            ['b', 2],
        ]);
    },

    // -- Return Set (isClonable + collectTransferables Set path) --
    getSet() {
        return new Set<number>([1, 2, 3]);
    },

    // -- Map containing transferable --
    getMapWithBuffer() {
        return new Map<string, Uint8Array>([['buf', new Uint8Array([1, 2, 3])]]);
    },

    // -- Set containing transferable --
    getSetWithBuffer() {
        return new Set<Uint8Array>([new Uint8Array([4, 5, 6])]);
    },

    // -- Array of functions (NOT clonable → stored as ref) --
    getFunctions() {
        return [(x: number) => x * 2, (x: number) => x + 10];
    },

    // -- Async success (Promise resolution path) --
    async delayedAdd(a: number, b: number) {
        await new Promise(resolve => setTimeout(resolve, 10));
        return a + b;
    },
};

export type Impl = typeof impl;
