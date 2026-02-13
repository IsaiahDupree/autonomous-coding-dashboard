/**
 * FLOW-002: Content Pipeline
 *
 * Manages multi-stage content production pipelines where each
 * stage must complete before the next can begin.
 */
import type { ContentPipeline as ContentPipelineType } from '../types';
export declare class ContentPipeline {
    private readonly pipelines;
    private nextId;
    /**
     * Creates a new pipeline with the given stage names.
     * All stages start in 'pending' status.
     */
    createPipeline(stageNames: string[]): Promise<ContentPipelineType>;
    /**
     * Advances the pipeline to the next stage. The current stage
     * is marked as completed, and the next stage begins.
     */
    advanceStage(pipelineId: string, output?: unknown): Promise<ContentPipelineType>;
    /**
     * Starts the current stage (marks it as in_progress).
     */
    startCurrentStage(pipelineId: string): Promise<ContentPipelineType>;
    /**
     * Gets the full status of a pipeline.
     */
    getStatus(pipelineId: string): Promise<ContentPipelineType>;
    /**
     * Retries a failed stage by resetting it to 'pending' and
     * setting it as the current stage.
     */
    retry(pipelineId: string, stageName: string): Promise<ContentPipelineType>;
    /**
     * Marks the current stage as failed.
     */
    failCurrentStage(pipelineId: string, error?: unknown): Promise<ContentPipelineType>;
    /**
     * Checks if the pipeline is fully complete (all stages done).
     */
    isComplete(pipelineId: string): boolean;
}
//# sourceMappingURL=pipeline.d.ts.map