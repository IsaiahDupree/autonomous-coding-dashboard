/**
 * JOB-005: Content Pipeline Job Processor
 *
 * Manages the Content Factory video production pipeline:
 * ingest -> transcode -> generate variants -> publish.
 */
import { Job } from '../types';
import { JobQueue } from './queue';
export type PipelineStage = 'ingest' | 'validate' | 'transcode' | 'generate_variants' | 'quality_check' | 'publish';
export interface ContentPipelineInput {
    sourceUrl: string;
    contentType: 'video' | 'image' | 'carousel';
    variants: {
        platform: string;
        aspectRatio: string;
        maxDurationSeconds?: number;
    }[];
    metadata: Record<string, unknown>;
    publishTargets: string[];
}
export interface ContentPipelineResult {
    stages: {
        stage: PipelineStage;
        status: 'completed' | 'skipped';
        durationMs: number;
    }[];
    outputs: {
        platform: string;
        url: string;
        format: string;
    }[];
    totalDurationMs: number;
}
export declare class ContentPipelineJobProcessor {
    private queue;
    constructor(queue?: JobQueue);
    submit(input: ContentPipelineInput): Promise<Job>;
    getQueue(): JobQueue;
    private handle;
    private runStage;
    private ingest;
    private validate;
    private transcode;
    private generateVariants;
    private qualityCheck;
    private publish;
}
