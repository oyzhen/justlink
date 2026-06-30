import { createMemoryPair, expose, wrap } from '@/memory.ts';
import { type Impl, impl } from './impl.ts';
import { createEventImpl, type EventImpl } from './event-impl.ts';
import { runImplSuite, runEventSuite } from './suite.ts';

const createApi = () => {
    const { host, worker } = createMemoryPair();
    expose(worker, impl);
    const api = wrap<Impl>(host);
    return { api, cleanup: () => api.$terminate() };
};

runImplSuite(createApi);

const createEventApi = () => {
    const { host, worker } = createMemoryPair();
    const emit = expose(worker, emit => createEventImpl(emit));
    const api = wrap<EventImpl>(host);
    return { api, emit, cleanup: () => api.$terminate() };
};

runEventSuite(createEventApi);
