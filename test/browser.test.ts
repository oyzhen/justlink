// @vitest-environment jsdom

import { wrap } from '@/browser.ts';
import type { Impl } from './impl.ts';
import DemoWorker from './worker?worker';
import { runImplSuite } from './suite.ts';

const createApi = () => {
    const api = wrap<Impl>(new DemoWorker());
    return { api, cleanup: () => api.$terminate() };
};

runImplSuite(createApi);
