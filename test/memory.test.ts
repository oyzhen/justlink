import { createMemoryPair, expose, wrap } from '@/memory.ts';
import { type Impl, impl } from './impl.ts';
import { runImplSuite } from './suite.ts';

const createApi = () => {
    const { host, worker } = createMemoryPair();
    expose(worker, impl);
    const api = wrap<Impl>(host);
    return { api, cleanup: () => api.$terminate() };
};

runImplSuite(createApi);
