import { expose } from '@/browser.ts';
import { createEventImpl } from './event-impl.ts';

expose(self, emit => createEventImpl(emit));
