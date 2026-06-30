# AGENTS.md

## Project Overview

**justlink** — Type-safe RPC for Workers, threads, and beyond — zero deps, local-feel calls.

## Quick Commands

| Task                | Command                                                     |
| ------------------- | ----------------------------------------------------------- |
| Type-check          | `tsc --noEmit`                                              |
| Build               | `npm run build` (vite build + tsc declarations + fix-decls) |
| Test (all)          | `npm test` (runs node+memory, then browser sequentially)    |
| Test (browser only) | `npm run test:browser`                                      |
| Lint + fix          | `npm run lint`                                              |
| Format              | `npm run format`                                            |

## Agent Workflow Constraints

After writing or modifying any code, you **must** follow this checklist before
declaring work complete:

1. **`npm run lint`** — ensure no lint errors remain (auto-fixes are on).
2. **`npm run format`** — ensure Prettier formatting is correct.
3. **`npm test`** — run the full test suite (node + memory + browser) and
   confirm all tests pass. Do **not** skip this step, even for small changes.

## Package Exports

No root `"."` import — all imports must use explicit subpaths:

| Import path        | Module     | What it provides                                                                           |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `justlink/core`    | core.ts    | `createExpose`, `createWrap`, `Adapter`, `EmitFn`, `EventMap`, `RemoteApi`, `RemoteObject` |
| `justlink/browser` | browser.ts | `expose`, `wrap`, `RemoteApi`, `EmitFn`, `EventMap`                                        |
| `justlink/node`    | node.ts    | `expose`, `wrap`, `RemoteApi`, `EmitFn`, `EventMap`                                        |
| `justlink/memory`  | memory.ts  | `expose`, `wrap`, `createMemoryPair`, `RemoteApi`, `EmitFn`, `EventMap`                    |

Build output lives in `dist/` — Vite library mode (`preserveModules`) + tsc
declarations + `scripts/fix-decls.cjs` (rewrites `.ts` → `.js` in `.d.ts`).

## Architecture

```
src/core.ts     — RPC engine: type system, wire protocol, Adapter type,
                  createExpose(), createWrap(), events, helpers (~700 lines)
src/browser.ts  — Browser adapter (postMessage/addEventListener)
src/node.ts     — Node.js adapter (worker_threads parentPort)
src/memory.ts   — In-memory adapter (direct invocation, no serialization)
```

The `Adapter<Ctx>` tuple `[emit, listen, terminate?]` is the extension point.
`createExpose(adapter)` runs inside the Worker; `createWrap(adapter)` runs on
the main thread and returns a typed `RemoteApi<Impl, Events>` proxy.

### Wire Protocol

Messages are arrays: `[tag, ...payload]`

- Tag `'m$s'` = request, `'m$r'` = response, `'m$e'` = event
- Request: `[REQUEST, id, op, refId, payload]`
- Response: `[RESPONSE, id, err, result]`
- Event: `[EVENT, eventName, ...args]` — fire-and-forget, no id
- Opcodes: `OP_GET=0`, `OP_EXEC=1`, `OP_EVAL=2`, `OP_RELEASE=-1`
- Remote objects/functions transported as `{ __ref, __kind, __this? }` descriptors

### Event System

Worker can push events to the main thread via the factory pattern:

```ts
// Worker side — typed emit via factory
expose(self, (emit: EmitFn<MyEvents>) => ({
    startTimer() { setInterval(() => emit('tick', Date.now()), 1000); },
}));

// Main thread — typed subscriptions
const api = wrap<Impl, MyEvents>(new MyWorker());
api.$on('tick', (ts) => ...);  // autocomplete + type-check
api.$once('progress', ...);     // fires once, auto-removes
api.$off('progress', handler);  // removes handler
```

Event args use the same transport pipeline as RPC responses (toTransportValue/
resolveValue). Handler errors are swallowed to avoid crashing the connection.

## TypeScript Conventions

- **Target**: ES2023, ESNext modules, bundler resolution
- **`lib`**: `ES2023`, `DOM`, `WebWorker`
- **`erasableSyntaxOnly: true`** — no enums, no namespaces, only TS-erasable syntax
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports
- **Strict**: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Path alias: `@/*` → `./src/*` (used in all imports)
- No `any` in public type surface (`RemoteObject`, `RemoteApi`, etc.)
  — `any` is allowed in implementation code (`no-explicit-any: 'off'`)

## Code Style

- Prettier: 4-space indent, single quotes, 144 char width, trailing commas `all`,
  arrow parens `avoid`, LF line endings, semicolons
- ESLint: `curly: 'all'` (always use braces), prefer-spread off

## Testing

- **Vitest 4.x** with two configs:
    - `vitest.config.ts` — Node pool (serial, maxWorkers: 1) → runs `node.test.ts` + `memory.test.ts`
    - `vitest.browser.config.ts` — Chromium via Playwright → runs `browser.test.ts`
- **Shared suite pattern**: `test/suite.ts` exports `runImplSuite(createApi)` and
  `runEventSuite(createEventApi)`. Each adapter file (`node.test.ts`, `browser.test.ts`,
  `memory.test.ts`) provides both `createApi` and `createEventApi` factories.
  Same ~35 describe blocks × 3 adapters + 9 event tests × 3 adapters.
- **`test/impl.ts`** is the shared implementation object — module-level `let counter`
  is a singleton shared across in-process tests; browser workers get fresh instances.
- **`test/event-impl.ts`** is the event test factory (`createEventImpl(emit)`)
  with `emitManually` for deterministic event testing.
- **Never hard-code absolute values** after mutation — use relative assertions
  (`c0 + 1`, `toBeGreaterThan`, etc.)
- Browser-only tests (e.g. `OffscreenCanvas`) use early `return` guard.
- Browser event tests use 200ms wait timeout (double round-trip:
  main→worker RPC → worker sends EVENT → main receives).

## Skills

Reusable guides in `skills/`. Claude Code, OpenCode, Copilot, and Codex
agents should load these when relevant:

- **[wrap-to-remote-api](skills/wrap-to-remote-api/SKILL.md)** — expose a
  plain object in a Worker and wrap it as `RemoteApi` on the main thread.
  Includes event system documentation (factory pattern, $on/$off/$once).
- **[universal-worker](skills/universal-worker/SKILL.md)** — run a plain
  object inside a Web Worker with auto-detection; falls back to main-thread
  execution via `justlink/memory` when Worker is unavailable. Includes
  event-aware universal factory pattern.

## Demo

`demo/` contains an interactive demo (`npm run dev`) exercising all features:

- `demo/worker-impl.ts` — full-featured impl (nested objects, transferables,
  OffscreenCanvas, error handling, createCounter, $eval, etc.)
- `demo/worker-event-impl.ts` — factory pattern impl with typed emit events
- `demo/create-universal-worker.ts` — adaptive Worker/memory fallback
- `demo/create-event-worker.ts` — event-aware adaptive factory
- `demo/main.ts` — basic demo + event demo

## Pitfalls

- `$eval` callbacks are `.toString()` serialized — must be self-contained
  (no closures over non-serializable values). Use `deps` array for dependencies.
- `isClonable()` determines if an object can be structured-cloned or must be
  stored as a ref. Arrays with function elements are NOT clonable.
- `looksLikeRemoteObject()` — objects with `__ref` property are stored as refs
  rather than sent as plain objects.
- `$terminate()` is idempotent and rejects all pending promises.
- `sendError` has 5 branches: Error, string, null, object-with-stack, async rejection.
  Tests cover all five.
- `createExpose` accepts either a plain object or a factory function
  `(emit) => impl`. The factory pattern is required when impl methods need
  to push events to the main thread via `emit()`.
- `Adapter<Ctx>` `terminate` is a required tuple element (adapter must provide
  it), but ctx's own `terminate` method is optional — expose side never calls it.
- Browser/Node adapter ctx interfaces have optional `terminate` because the
  expose side (Worker) doesn't need it; only the wrap side calls `$terminate()`.
