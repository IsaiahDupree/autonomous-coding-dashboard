/**
 * JOB-003: Video Render Job Processor
 *
 * Specialized processor for Remotion-based video render jobs.
 * Manages render lifecycle: validation -> render -> upload -> notify.
 */
import { Job } from '../types';
import { JobQueue } from './queue';
export interface VideoRenderInput {
    compositionId: string;
    inputProps: Record<string, unknown>;
    outputFormat: 'mp4' | 'webm' | 'gif';
    resolution: {
        width: number;
        height: number;
    };
    fps: number;
    durationFrames: number;
    callbackUrl?: string;
}
export interface VideoRenderResult {
    outputUrl: string;
    durationMs: number;
    fileSizeBytes: number;
    renderedAt: Date;
}
export declare class VideoRenderJobProcessor {
    private queue;
    constructor(queue?: JobQueue);
    submit(input: VideoRenderInput): Promise<Job>;
    getQueue(): JobQueue;
    private handle;
    private validateInput;
    private simulateRender;
    private notifyCallback;
}
