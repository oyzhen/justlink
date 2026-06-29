/**
 * Interactive demo — exercises the full public API of tinylink.
 *
 * Open with `npm run dev` and watch the console.
 * Covers: $get, $exec, $eval, direct proxy access, nested objects,
 *         function returns, this-binding, async methods, error handling,
 *         Uint8Array transferables, and OffscreenCanvas.
 */
import { wrap } from '@/browser.ts';
import type { Impl } from '../test/impl.ts';
import DemoWorker from '../test/worker?worker';

document.body.innerHTML = '<h1>tinylink demo</h1>';

const api = wrap<Impl>(new DemoWorker());
Object.assign(window, { api });

// ── $get / $exec: scalars, state mutation, clonable returns ────────
console.log('api.$get("x")', await api.$get('x'));
console.log('api.$get("counter")', await api.$get('counter'));
console.log('api.$exec("add", 3, 7)', await api.$exec('add', 3, 7));
console.log('api.$exec("increment", 5)', await api.$exec('increment', 5));
console.log('api.$get("counter")', await api.$get('counter'));

console.log('api.$exec("createObject")', await api.$exec('createObject'));
console.log('api.$exec("createArray")', await api.$exec('createArray'));
console.log('api.$exec("getProfile")', await api.$exec('getProfile'));
console.log('api.$exec("getTree")', await api.$exec('getTree'));
console.log('api.$exec("getDate")', await api.$exec('getDate'));
console.log('api.$exec("getPattern")', await api.$exec('getPattern'));

// ── typed arrays & transferables ───────────────────────────────────
const typed = await api.$exec('createTypedArray');
console.log('api.$exec("createTypedArray")', typed, Array.from(typed as Uint8Array));

const buf = new Uint8Array([10, 20, 30]);
console.log('api.$exec("sumBytes", buf)', await api.$exec('sumBytes', buf));

// ── OffscreenCanvas → ImageBitmap ──────────────────────────────────
const canvas = new OffscreenCanvas(2, 2);
const imageBitmap = await api.$exec('paintCanvas', canvas);
console.log('api.$exec("paintCanvas")', imageBitmap);

{
    const el = document.createElement('canvas');
    const ctx = el.getContext('bitmaprenderer');
    ctx?.transferFromImageBitmap(imageBitmap as ImageBitmap);
    document.body.appendChild(el);
}

// ── direct proxy property access ───────────────────────────────────
console.log('api.x', await api.x);
console.log('api.add(4, 5)', await api.add(4, 5));
console.log('api.increment(1)', await api.increment(1));

// ── nested object with methods ─────────────────────────────────────
const math = await api.$get('math');
console.log('math.value', await math.value);
console.log('math.add(5)', await math.add(5));
console.log('math.add(10)', await math.add(10));
console.log('math.reset()', await math.reset());

// direct proxy nested access
const mathDirect = api.math;
console.log('api.math.add(10)', await mathDirect.add(10));

// ── $eval ──────────────────────────────────────────────────────────
console.log('api.$eval(add)', await api.$eval(ref => ref.add(2, 3)));

{
    const buf = new Uint8Array([10, 20, 30]);
    console.log('api.$eval(sumBytes)', await api.$eval((ref, buf) => ref.sumBytes(buf), [buf]));
}

// ── returned object with methods + this binding ────────────────────
const obj = await api.$exec('fn2');
console.log('fn2.a', await obj.a);
console.log('fn2.inc(3)', await obj.inc(3));

// ── createCounter (methods + async) ────────────────────────────────
const counter = await api.$exec('createCounter', 10);
console.log('counter.inc()', await counter.inc());
console.log('counter.inc()', await counter.inc());
console.log('counter.dec()', await counter.dec());
console.log('counter.get()', await counter.get());
console.log('counter.getAsync()', await counter.getAsync());

// counter via direct proxy
const counter2 = await api.createCounter(10);
console.log(
    'counter2.$eval(inc+get)',
    await counter2.$eval(ref => {
        ref.inc();
        return ref.get();
    }),
);
console.log(
    'counter2.$eval(async)',
    await counter2.$eval(async ref => {
        await new Promise(resolve => setTimeout(resolve, 50));
        ref.inc();
        return ref.getAsync();
    }),
);

// ── standalone function return ─────────────────────────────────────
const adder = await api.$exec('getAdder');
console.log('adder(2, 3)', await adder(2, 3));

// ── Map / Set returns ──────────────────────────────────────────────
console.log('api.$exec("getMap")', await api.$exec('getMap'));
console.log('api.$exec("getSet")', await api.$exec('getSet'));

// ── error handling ─────────────────────────────────────────────────
try {
    await api.$exec('throwError');
} catch (err) {
    console.error('throwError caught:', err);
}

try {
    await api.$exec('throwString');
} catch (err) {
    console.error('throwString caught:', err);
}

try {
    await api.$exec('throwNull');
} catch (err) {
    console.error('throwNull caught:', err);
}

try {
    await api.$exec('throwObjectWithStack');
} catch (err) {
    console.error('throwObjectWithStack caught:', err);
}

try {
    await api.$exec('rejectAsync');
} catch (err) {
    console.error('rejectAsync caught:', err);
}

// ── $eval error propagation ────────────────────────────────────────
try {
    await api.$eval(() => {
        throw new Error('eval error');
    });
} catch (err) {
    console.error('eval error caught:', err);
}

// ── array of functions ─────────────────────────────────────────────
const fns = await api.$exec('getFunctions');
console.log('getFunctions:', fns);
console.log('fns[0](5)', await fns[0](5));

const fns2 = await api.getFunctions();
console.log('getFunctions (direct proxy):', fns2);
console.log('fns2[1](5)', await fns2[1](5));

// ── done ───────────────────────────────────────────────────────────
console.log('demo complete');
// await api.$terminate();
