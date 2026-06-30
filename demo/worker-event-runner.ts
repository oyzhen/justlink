import { expose } from '@/browser.ts';
import { createEventImpl } from './worker-event-impl.ts';

expose(self, emit => createEventImpl(emit));
