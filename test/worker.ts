import { expose } from '@/browser.ts';
import { impl } from './impl.ts';

console.log('exposing worker impl', impl);

expose(self, impl);
