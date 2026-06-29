# tinylink

[中文文档](./README.zh-CN.md)

> Zero-dependency, type-safe RPC for Web Workers and Node.js worker_threads.

Inspired by [`comlink`](https://github.com/GoogleChromeLabs/comlink) and [`minlink`](https://github.com/mizchi/minlink).

## What is tinylink?

Workers let you move heavy computation off the main thread, but talking to them is painful — you have to juggle `postMessage`, `onmessage`, manual serialization, and state tracking. Your code quickly turns into spaghetti.

**tinylink lets you call Worker methods like regular function calls.** You define an object, and tinylink handles all the communication for you.

```ts
// Define (inside the Worker)
const impl = {
    fibonacci(n: number) {
        return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
    },
};

// Use (on the main thread)
const api = wrap<Impl>(new MyWorker());
const result = await api.fibonacci(40); // That's it!
```

No `postMessage`. No `onmessage`. No manual serialization. Just `expose` and `wrap`.

## Why tinylink?

|                    | tinylink                             | Raw postMessage     | Comlink |
| ------------------ | ------------------------------------ | ------------------- | ------- |
| **Boilerplate**    | Minimal (2 functions)                | Lots of glue code   | Low     |
| **TypeScript**     | ✅ Full inference + autocomplete     | ❌ Manual type defs | ✅      |
| **Dependencies**   | 0                                    | 0                   | 1       |
| **Nested objects** | ✅ Auto-proxied                      | ❌ Manual handling  | ✅      |
| **Transferables**  | ✅ Auto-detected                     | ❌ Manual listing   | ✅      |
| **`$eval`**        | ✅ Run arbitrary logic in the Worker | ❌                  | ❌      |
| **Node.js**        | ✅ `worker_threads`                  | ✅                  | ❌      |
| **In-memory mode** | ✅ Main thread / non-Worker          | ❌                  | ❌      |

## Install

```bash
npm install tinylink
```

### Imports

tinylink ships three entry points — pick the one matching your environment:

| Import path        | Use case                        |
| ------------------ | ------------------------------- |
| `tinylink/browser` | Web Workers (`self` / `Worker`) |
| `tinylink/node`    | `worker_threads` (`parentPort`) |
| `tinylink/memory`  | In-process (no real Worker)     |

```ts
import { expose, wrap } from 'tinylink/browser';
import { expose, wrap } from 'tinylink/node';
import { expose, wrap, createMemoryPair } from 'tinylink/memory';
import type { RemoteApi } from 'tinylink/browser';
```

The core module (`tinylink/core`) exposes low-level APIs for building custom adapters:

```ts
import { createExpose, createWrap, type Adapter, type RemoteApi } from 'tinylink/core';
```

## Quick Start (5 minutes)

Just **3 steps** to get a Worker running.

### Step 1: Create the Worker implementation

Create a `worker-impl.ts` with a plain object containing the methods you want in the Worker:

```ts
// worker-impl.ts
let count = 0;

export const impl = {
    // A simple method
    greet(name: string) {
        return `Hello, ${name}!`;
    },

    // Stateful methods
    getCount() {
        return count;
    },
    increment(n = 1) {
        return (count += n);
    },

    // Nested objects work too
    nested: {
        add(a: number, b: number) {
            return a + b;
        },
    },
};

// Export the type — you'll need it on the host side
export type Impl = typeof impl;
```

> 💡 **Key point:** Just write a plain object. No base class, no decorators, no magic.

### Step 2: Expose it in the Worker

#### Browser (Vite)

```ts
// worker.ts
import { expose } from 'tinylink/browser';
import { impl } from './worker-impl';

expose(self, impl); // One line!
```

#### Node.js

```ts
// worker.ts
import { parentPort } from 'node:worker_threads';
import { expose } from 'tinylink/node';
import { impl } from './worker-impl';

expose(parentPort!, impl); // One line!
```

### Step 3: Use it on the main thread

#### Browser (Vite)

```ts
// main.ts
import { wrap } from 'tinylink/browser';
import type { Impl } from './worker-impl';
import MyWorker from './worker?worker'; // Vite worker import

// Create the Worker, wrap it into a type-safe API
const api = wrap<Impl>(new MyWorker());

// 🎉 It's like calling a local function!
console.log(await api.greet('world')); // "Hello, world!"
console.log(await api.increment(5)); // 5
console.log(await api.nested.add(1, 2)); // 3
```

#### Node.js

```ts
// main.ts
import { Worker } from 'node:worker_threads';
import { wrap } from 'tinylink/node';
import type { Impl } from './worker-impl';

const worker = new Worker('./worker.js');
const api = wrap<Impl>(worker);

// 🎉 Same API!
console.log(await api.greet('world')); // "Hello, world!"
console.log(await api.increment(5)); // 5
```

> 💡 **Core concept:** `expose` is called on the Worker side to "expose" the implementation. `wrap` is called on the main thread to "wrap" it into a proxy object. Together they form the full communication link.

## Full Example: Heavy Computation in Workers

A more realistic example — offloading CPU-intensive tasks to a Worker:

```ts
// worker-impl.ts
export const impl = {
    // CPU-intensive — perfect for Workers
    fibonacci(n: number): number {
        return n <= 1 ? n : this.fibonacci(n - 1) + this.fibonacci(n - 2);
    },

    // Process large arrays
    sum(arr: number[]): number {
        return arr.reduce((a, b) => a + b, 0);
    },

    // Return complex objects
    analyze(text: string) {
        return {
            length: text.length,
            words: text.split(/\s+/).length,
            chars: new Set(text).size,
        };
    },
};

export type Impl = typeof impl;
```

```ts
// main.ts
const api = wrap<Impl>(new MyWorker());

// Heavy computation — won't block the UI
const result = await api.fibonacci(40);

// Pass large arrays — auto-transferred
const data = new Array(1000000).fill(0).map(() => Math.random());
const total = await api.sum(data);

// Get structured results
const stats = await api.analyze('hello world');
console.log(stats.length); // 11
console.log(stats.words); // 2
console.log(stats.chars); // 9
```

## API Reference

### `expose(ctx, impl)`

**Called on the Worker side.** Exposes a plain object to the main thread.

| Param  | Description                                                    |
| ------ | -------------------------------------------------------------- |
| `ctx`  | Worker context. `self` in the browser, `parentPort` in Node.js |
| `impl` | Object to expose, with properties and methods                  |

### `wrap<Impl>(ctx): RemoteApi<Impl>`

**Called on the main thread.** Wraps the Worker into a type-safe proxy object.

| Param | Description                         |
| ----- | ----------------------------------- |
| `ctx` | Worker instance (`new Worker(...)`) |

The returned `api` has these special methods:

| Method                       | Description                      | Example                        |
| ---------------------------- | -------------------------------- | ------------------------------ |
| `api.$get(key)`              | Read a remote property           | `await api.$get('name')`       |
| `api.$exec(method, ...args)` | Dynamically call a method        | `await api.$exec('add', 1, 2)` |
| `api.$eval(callback, deps?)` | Run a callback inside the Worker | See `$eval` section below      |
| `api.$terminate()`           | Terminate the remote peer        | `await api.$terminate()`       |

> 💡 Most of the time you don't need these — just `await api.methodName(args)`. They're escape hatches for special cases like dynamic method names.

#### `$terminate()` — Terminate the Remote Peer

When you call `$terminate()`, the remote peer is shut down and all pending requests are rejected. Any subsequent calls will **immediately reject** with `"The remote peer has been terminated"` — no infinite pending Promises:

```ts
await api.$terminate();

// All of these reject immediately:
await api.someMethod(); // → rejects: "The remote peer has been terminated"
await api.$get('x');    // → rejects
await api.$eval(...);   // → rejects
```

> 💡 This is a safety net — it prevents accidentally hanging on calls to a terminated peer.

### `createMemoryPair()`

> `import { createMemoryPair } from 'tinylink/memory'`

Creates a paired `host` / `worker` context that communicates via direct in-process calls — no real Worker needed.

Typical use case: you build an API on top of tinylink and want it to work identically whether it's running inside a Worker or not:

```ts
import { createMemoryPair, expose, wrap } from 'tinylink/memory';
import { expose as browserExpose, wrap as browserWrap } from 'tinylink/browser';

let api: ImplApi;

if (isWorker) {
    // Worker: postMessage transport
    browserExpose(self, impl);
    api = browserWrap<Impl>(self);
} else {
    // Main thread / Node main process: direct in-process calls
    const { host, worker } = createMemoryPair();
    expose(worker, impl);
    api = wrap<Impl>(host);
}

// Identical API in both environments
console.log(await api.someMethod());
```

## Advanced Usage

### `$eval` — Run Code Inside the Worker

Regular calls (`api.methodName()`) run on the main thread and execute in the Worker. But sometimes you need to operate **inside** the Worker — for example, reading multiple properties in a single round-trip. That's what `$eval` is for:

```ts
// ❌ Regular: 3 round-trips
const a = await api.a;
const b = await api.nested.b;
const c = await api.nested.c;

// ✅ $eval: 1 round-trip
const result = await api.$eval(ref => {
    return ref.a + ref.nested.b + ref.nested.c;
});
```

#### Passing data into the Worker

`$eval` callbacks are serialized and sent to the Worker — external variables won't work. Use the second argument to pass data in:

```ts
// Send a Uint8Array into the Worker for processing
const data = new Uint8Array([1, 2, 3]);
const sum = await api.$eval(
    (ref, arr) => ref.processData(arr),
    [data], // Values in deps are auto-transferred
);
```

> ⚠️ **Important:** `$eval` callbacks are serialized via `.toString()` — **closures don't work** (no external variables). Use the `deps` parameter to pass values in.

### Transferable Objects

tinylink automatically detects and transfers these types — no manual `transferList` needed:

- `ArrayBuffer`
- Typed arrays (`Uint8Array`, `Float32Array`, etc.)
- `OffscreenCanvas`
- `ImageBitmap`
- `MessagePort`

> 💡 **What is Transfer?** Regular data passing copies the data. Transfer **moves** it — ownership transfers from sender to receiver, and the sender's view becomes detached. It's zero-copy and faster.

### Error Handling

Errors thrown in the Worker automatically propagate to the main thread:

```ts
const api = wrap<Impl>(new MyWorker());

try {
    await api.willThrow(); // Assume this throws in the Worker
} catch (err) {
    console.error(err.message); // Error message comes through correctly
}
```

### Nested Objects & Return Values

When a Worker method returns an object, tinylink auto-proxies it so you can keep calling methods:

```ts
const counter = await api.createCounter(0);
await counter.inc(); // 1
await counter.inc(); // 2
await counter.get(); // 2

// Drill deeper
const obj = await api.getNestedObject();
await obj.child.deepMethod();
```

### Plain Objects vs Proxies

tinylink decides how to transport a return value based on **whether it contains functions**:

**Objects with functions** → return a **remote proxy** — each access triggers a `postMessage`:

```ts
// Worker returns { count: 1, inc() {...} }
const obj = await api.createCounter(0);
await obj.inc(); // one postMessage
await obj.count; // another postMessage
```

**Plain data objects (no functions)** → **structured clone** — returned as a regular JS object, zero overhead:

```ts
// Worker returns { x: 1, y: [2, 3] }
const point = await api.getPoint();
// point is a plain object — use directly, synchronous
console.log(point.x); // 1 — no postMessage
console.log(point.y); // [2, 3]
```

> 💡 **Tip:** If your return value accidentally contains function fields, it'll be treated as a remote object. Strip them before returning if you don't want that.

#### `$get` return values

```ts
// Plain data → regular object
const data = await api.$get('config');
console.log(data.theme); // 'dark' — synchronous

// Contains functions → remote proxy
const counter = await api.$get('counter');
await counter.inc(); // postMessage round-trip
```

#### `$eval` return values

```ts
// Returns plain data → regular value
const sum = await api.$eval(ref => ref.a + ref.nested.a); // 4

// Returns object with functions → remote proxy
const counter = await api.$eval(ref => ref.createCounter(0));
await counter.inc(); // postMessage round-trip
```

## Custom Transport Layer

The core `createExpose` / `createWrap` functions accept a generic `Adapter` tuple, so you can wire tinylink to any transport:

```ts
import { createExpose, createWrap, type Adapter } from 'tinylink/core';

const myAdapter: Adapter<MyContext> = [
    // emit(ctx, data, transferList?) — send data to the other side
    (ctx, data, transferList) => {
        /* ... */
    },
    // listen(ctx, handler) — register a handler for incoming data
    (ctx, handler) => {
        /* ... */
    },
    // terminate(ctx) — clean up the context
    ctx => Promise.resolve(),
];

export const expose = createExpose(myAdapter);
export const wrap = createWrap(myAdapter);
```

## Import Paths

```ts
import { expose, wrap } from 'tinylink/browser'; // Browser Web Worker
import { expose, wrap } from 'tinylink/node'; // Node.js worker_threads
import { createMemoryPair, expose, wrap } from 'tinylink/memory'; // In-process communication
import { createExpose, createWrap } from 'tinylink/core'; // Custom transport
```

## Requirements

- TypeScript 5.0+
- A bundler that supports `?worker` imports (Vite, Webpack, etc.) for the browser adapter

## License

MIT
