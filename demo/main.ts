/**
 * Interactive demo — exercises the full public API of justlink.
 *
 * Open with `npm run dev` and watch the console.
 * Covers: $get, $exec, $eval, direct proxy access, nested objects,
 *         function returns, this-binding, async methods, error handling,
 *         Uint8Array transferables, OffscreenCanvas, events, and the
 *         universal Worker / in-memory fallback pattern.
 */
import { createUniversalWorker } from './create-universal-worker.ts';
import { createEventWorker } from './create-event-worker.ts';

const log = (label: string, ...args: unknown[]) => console.log(`[${label}]`, ...args);

async function runBasicDemo() {
    log('BASIC', '--- Method calls, nested objects, returned objects ---');
    const api = await createUniversalWorker();

    // ── $get / $exec: scalars, state mutation, clonable returns ────
    log('BASIC', 'api.$get("x")', await api.$get('x'));
    log('BASIC', 'api.$get("counter")', await api.$get('counter'));
    log('BASIC', 'api.$exec("add", 3, 7)', await api.$exec('add', 3, 7));
    log('BASIC', 'api.$exec("increment", 5)', await api.$exec('increment', 5));
    log('BASIC', 'api.$get("counter")', await api.$get('counter'));

    log('BASIC', 'api.$exec("createObject")', await api.$exec('createObject'));
    log('BASIC', 'api.$exec("createArray")', await api.$exec('createArray'));
    log('BASIC', 'api.$exec("getProfile")', await api.$exec('getProfile'));
    log('BASIC', 'api.$exec("getTree")', await api.$exec('getTree'));
    log('BASIC', 'api.$exec("getDate")', await api.$exec('getDate'));
    log('BASIC', 'api.$exec("getPattern")', await api.$exec('getPattern'));

    // ── typed arrays & transferables ───────────────────────────────
    const typed = await api.$exec('createTypedArray');
    log('BASIC', 'api.$exec("createTypedArray")', typed, Array.from(typed as Uint8Array));

    const buf = new Uint8Array([10, 20, 30]);
    log('BASIC', 'api.$exec("sumBytes", buf)', await api.$exec('sumBytes', buf));

    // ── OffscreenCanvas → ImageBitmap ──────────────────────────────
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(2, 2);
        const imageBitmap = await api.$exec('paintCanvas', canvas);
        log('BASIC', 'api.$exec("paintCanvas")', imageBitmap);

        {
            const el = document.createElement('canvas');
            const ctx = el.getContext('bitmaprenderer');
            ctx?.transferFromImageBitmap(imageBitmap as ImageBitmap);
            document.body.appendChild(el);
        }
    }

    // ── direct proxy property access ───────────────────────────────
    log('BASIC', 'api.x', await api.x);
    log('BASIC', 'api.add(4, 5)', await api.add(4, 5));
    log('BASIC', 'api.increment(1)', await api.increment(1));

    // ── nested object with methods ─────────────────────────────────
    const math = await api.$get('math');
    log('BASIC', 'math.value', await math.value);
    log('BASIC', 'math.add(5)', await math.add(5));
    log('BASIC', 'math.add(10)', await math.add(10));
    log('BASIC', 'math.reset()', await math.reset());

    // direct proxy nested access
    const mathDirect = api.math;
    log('BASIC', 'api.math.add(10)', await mathDirect.add(10));

    // ── $eval ──────────────────────────────────────────────────────
    log('BASIC', 'api.$eval(add)', await api.$eval(ref => ref.add(2, 3)));

    {
        const evalBuf = new Uint8Array([10, 20, 30]);
        log('BASIC', 'api.$eval(sumBytes)', await api.$eval((ref, b) => ref.sumBytes(b), [evalBuf]));
    }

    // ── returned object with methods + this binding ────────────────
    const obj = await api.$exec('fn2');
    log('BASIC', 'fn2.a', await obj.a);
    log('BASIC', 'fn2.inc(3)', await obj.inc(3));

    // ── createCounter (methods + async) ────────────────────────────
    const counter = await api.$exec('createCounter', 10);
    log('BASIC', 'counter.inc()', await counter.inc());
    log('BASIC', 'counter.inc()', await counter.inc());
    log('BASIC', 'counter.dec()', await counter.dec());
    log('BASIC', 'counter.get()', await counter.get());
    log('BASIC', 'counter.getAsync()', await counter.getAsync());

    // counter via direct proxy
    const counter2 = await api.createCounter(10);
    log(
        'BASIC',
        'counter2.$eval(inc+get)',
        await counter2.$eval(ref => {
            ref.inc();
            return ref.get();
        }),
    );
    log(
        'BASIC',
        'counter2.$eval(async)',
        await counter2.$eval(async ref => {
            await new Promise(resolve => setTimeout(resolve, 50));
            ref.inc();
            return ref.getAsync();
        }),
    );

    // ── standalone function return ─────────────────────────────────
    const adder = await api.$exec('getAdder');
    log('BASIC', 'adder(2, 3)', await adder(2, 3));

    // ── Map / Set returns ──────────────────────────────────────────
    log('BASIC', 'api.$exec("getMap")', await api.$exec('getMap'));
    log('BASIC', 'api.$exec("getSet")', await api.$exec('getSet'));

    // ── error handling ─────────────────────────────────────────────
    try {
        await api.$exec('throwError');
    } catch (err) {
        log('BASIC', 'throwError caught:', err);
    }

    try {
        await api.$exec('throwString');
    } catch (err) {
        log('BASIC', 'throwString caught:', err);
    }

    try {
        await api.$exec('throwNull');
    } catch (err) {
        log('BASIC', 'throwNull caught:', err);
    }

    try {
        await api.$exec('throwObjectWithStack');
    } catch (err) {
        log('BASIC', 'throwObjectWithStack caught:', err);
    }

    try {
        await api.$exec('rejectAsync');
    } catch (err) {
        log('BASIC', 'rejectAsync caught:', err);
    }

    // ── $eval error propagation ────────────────────────────────────
    try {
        await api.$eval(() => {
            throw new Error('eval error');
        });
    } catch (err) {
        log('BASIC', 'eval error caught:', err);
    }

    // ── array of functions ─────────────────────────────────────────
    const fns = await api.$exec('getFunctions');
    log('BASIC', 'getFunctions:', fns);
    log('BASIC', 'fns[0](5)', await fns[0](5));

    const fns2 = await api.getFunctions();
    log('BASIC', 'getFunctions (direct proxy):', fns2);
    log('BASIC', 'fns2[1](5)', await fns2[1](5));

    // ── terminate ──────────────────────────────────────────────────
    await api.$terminate();
    log('BASIC', '--- terminated ---');
}

async function runEventDemo() {
    log('EVENT', '--- Factory pattern + event listening ---');
    const { api } = await createEventWorker();

    // $on — subscribe to events
    const unsubs: (() => void)[] = [];

    unsubs.push(
        api.$on('greeted', data => {
            log('EVENT', '📢 greeted:', data);
        }),
    );

    unsubs.push(
        api.$on('computed', data => {
            log('EVENT', '📢 computed:', data);
        }),
    );

    unsubs.push(
        api.$on('tick', data => {
            log('EVENT', '📢 tick:', data);
        }),
    );

    unsubs.push(
        api.$on('ticker-started', data => {
            log('EVENT', '📢 ticker-started:', data);
        }),
    );

    unsubs.push(
        api.$on('ticker-stopped', data => {
            log('EVENT', '📢 ticker-stopped:', data);
        }),
    );

    // methods that emit events
    log('EVENT', 'greet("Alice") →', await api.greet('Alice'));
    log('EVENT', 'add(3, 4) →', await api.add(3, 4));
    log('EVENT', 'math.multiply(5, 6) →', await api.math.multiply(5, 6));

    // $once — fires only once
    let onceCount = 0;
    api.$once('computed', () => {
        onceCount++;
    });
    await api.add(1, 2); // onceCount = 1
    await api.add(3, 4); // onceCount still 1
    log('EVENT', 'once count after 2 adds:', onceCount);

    // start ticker — periodic events
    await api.startTicker(500);
    await new Promise(r => setTimeout(r, 2200));
    await api.stopTicker();

    // unsubscribe all
    for (const unsub of unsubs) {
        unsub();
    }

    // returned object still works
    const counter = await api.createCounter(0);
    log('EVENT', 'counter.inc() →', await counter.inc());

    await api.$terminate();
    log('EVENT', '--- terminated ---');
}

await runBasicDemo();
await runEventDemo();
log('DONE', 'All demos completed!');
