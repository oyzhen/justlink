import { expose } from '@/browser.ts';
import { impl } from './worker-impl.ts';

expose(self, impl);
