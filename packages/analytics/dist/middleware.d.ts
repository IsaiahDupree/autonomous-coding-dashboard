import type { EventMiddleware } from './tracker';
export declare function enrichWithTimestamp(): EventMiddleware;
export declare function enrichWithSessionId(): EventMiddleware;
export declare function filterSensitiveData(fields: string[]): EventMiddleware;
export declare function samplingMiddleware(rate: number): EventMiddleware;
export declare function deduplicationMiddleware(windowMs: number): EventMiddleware;
//# sourceMappingURL=middleware.d.ts.map