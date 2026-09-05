import { apiProvider } from './api';
import { demoProvider } from './demo';
import type { ContentProvider } from './types';

/**
 * CONTENT_MODE=database → FastAPI is the only content source and failures surface as errors.
 * Anything else → labelled sample fixtures (development, previews without a database).
 */
export const contentMode: 'demo' | 'api' = process.env.CONTENT_MODE === 'database' ? 'api' : 'demo';
export const content: ContentProvider = contentMode === 'api' ? apiProvider : demoProvider;
export const isDemo = contentMode === 'demo';
export * from './types';
export * from './select';
