import { parentPort } from 'node:worker_threads';
import { expose } from '@/node.ts';
import { impl } from './impl.ts';

if (!parentPort) {
    throw new Error('Expected a parentPort in the node worker thread');
}

expose(parentPort, impl);
