import { createExpose, createWrap, type Adapter } from './core.ts';

interface NodeLikeContext {
    postMessage(data: unknown, transferList?: readonly unknown[]): void;
    on(event: 'message', handler: (value: unknown) => void): void;
    terminate?(): Promise<unknown> | unknown;
}

const adapter: Adapter<NodeLikeContext> = [
    // emit: worker_threads postMessage sends value directly
    (ctx, data, transferList) => {
        ctx.postMessage(data, transferList ?? []);
    },
    // listen: 'message' event receives the value directly (not wrapped in MessageEvent)
    (ctx, handler) => {
        ctx.on('message', value => handler(value as readonly unknown[]));
    },
    // terminate: NodeWorker.terminate() returns Promise<number>, wrap to Promise<void>
    async ctx => {
        await ctx.terminate?.();
    },
];

export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);

export type { RemoteApi, EmitFn, EventMap } from './core.ts';
