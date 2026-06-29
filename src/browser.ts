import { createExpose, createWrap, type Adapter } from './core.ts';

const adapter: Adapter<any> = [
    // emit: postMessage sends data directly; the 'message' event receives it as ev.data
    (ctx, data, transferList) => {
        ctx.postMessage(data, transferList ?? []);
    },
    // listen: extract ev.data before passing to handler
    (ctx, handler) => {
        ctx.addEventListener('message', (ev: MessageEvent) => handler(ev.data as readonly unknown[]));
    },
    // terminate
    ctx => Promise.resolve(ctx.terminate()),
];

export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);

export type { RemoteApi } from './core.ts';
