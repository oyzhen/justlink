// @vitest-environment jsdom

import { wrap } from '@/browser.ts';
import type { Impl } from './impl.ts';
import DemoWorker from './worker?worker';
import EventDemoWorker from './worker-event?worker';
import { runImplSuite, runEventSuite } from './suite.ts';

const createApi = () => {
    const api = wrap<Impl>(new DemoWorker());
    return { api, cleanup: () => api.$terminate() };
};

runImplSuite(createApi);

const createEventApi = () => {
    const api = wrap<import('./event-impl.ts').EventImpl>(new EventDemoWorker());
    // In browser workers, emit lives inside the worker. The main thread
    // triggers events via the emitManually RPC method exposed by the impl.
    // Errors after terminate are swallowed to prevent unhandled rejections.
    const emit: import('@/core.ts').EmitFn = (eventName, ...args) => {
        api.emitManually(eventName, ...args).catch(() => {});
    };
    return { api, emit, cleanup: () => api.$terminate() };
};

runEventSuite(createEventApi);
