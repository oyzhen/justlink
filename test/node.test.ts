import { EventEmitter } from 'node:events';
import { expose, wrap } from '@/node.ts';
import { type Impl, impl } from './impl.ts';
import { createEventImpl, type EventImpl } from './event-impl.ts';
import { runImplSuite, runEventSuite } from './suite.ts';

interface NodeHarnessContext {
    postMessage(data: unknown, transferList?: readonly unknown[]): void;
    on(event: 'message', handler: (value: unknown) => void): void;
    terminate(): Promise<void>;
}

const createApi = () => {
    const host = new EventEmitter() as EventEmitter & NodeHarnessContext;
    const worker = new EventEmitter() as EventEmitter & NodeHarnessContext;

    host.postMessage = (data, transferList) => {
        worker.emit('message', data, transferList);
    };
    worker.postMessage = (data, transferList) => {
        host.emit('message', data, transferList);
    };
    host.terminate = async () => {};
    worker.terminate = async () => {};

    expose(worker, impl);
    const api = wrap<Impl>(host);
    return { api, cleanup: () => api.$terminate() };
};

runImplSuite(createApi);

const createEventApi = () => {
    const host = new EventEmitter() as EventEmitter & NodeHarnessContext;
    const worker = new EventEmitter() as EventEmitter & NodeHarnessContext;

    host.postMessage = (data, transferList) => {
        worker.emit('message', data, transferList);
    };
    worker.postMessage = (data, transferList) => {
        host.emit('message', data, transferList);
    };
    host.terminate = async () => {};
    worker.terminate = async () => {};

    const emit = expose(worker, emit => createEventImpl(emit));
    const api = wrap<EventImpl>(host);
    return { api, emit, cleanup: () => api.$terminate() };
};

runEventSuite(createEventApi);
