"use strict";
/**
 * FLOW-002: Content Pipeline
 *
 * Manages multi-stage content production pipelines where each
 * stage must complete before the next can begin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPipeline = void 0;
class ContentPipeline {
    constructor() {
        this.pipelines = new Map();
        this.nextId = 1;
    }
    /**
     * Creates a new pipeline with the given stage names.
     * All stages start in 'pending' status.
     */
    async createPipeline(stageNames) {
        if (stageNames.length === 0) {
            throw new Error('Pipeline must have at least one stage');
        }
        const id = `pipeline-${this.nextId++}`;
        const stages = stageNames.map((name) => ({
            name,
            status: 'pending',
        }));
        const pipeline = {
            id,
            stages,
            currentStage: 0,
            createdAt: new Date().toISOString(),
        };
        this.pipelines.set(id, pipeline);
        return pipeline;
    }
    /**
     * Advances the pipeline to the next stage. The current stage
     * is marked as completed, and the next stage begins.
     */
    async advanceStage(pipelineId, output) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        const currentIdx = pipeline.currentStage;
        const currentStage = pipeline.stages[currentIdx];
        if (!currentStage) {
            throw new Error('Pipeline has no more stages to advance');
        }
        // Mark current stage as completed
        currentStage.status = 'completed';
        currentStage.completedAt = new Date().toISOString();
        if (output !== undefined) {
            currentStage.output = output;
        }
        // If there is a next stage, start it
        const nextIdx = currentIdx + 1;
        if (nextIdx < pipeline.stages.length) {
            pipeline.currentStage = nextIdx;
            pipeline.stages[nextIdx].status = 'in_progress';
            pipeline.stages[nextIdx].startedAt = new Date().toISOString();
        }
        return pipeline;
    }
    /**
     * Starts the current stage (marks it as in_progress).
     */
    async startCurrentStage(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        const currentStage = pipeline.stages[pipeline.currentStage];
        if (!currentStage) {
            throw new Error('Pipeline has no current stage');
        }
        if (currentStage.status !== 'pending') {
            throw new Error(`Current stage is not pending: ${currentStage.status}`);
        }
        currentStage.status = 'in_progress';
        currentStage.startedAt = new Date().toISOString();
        return pipeline;
    }
    /**
     * Gets the full status of a pipeline.
     */
    async getStatus(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        return pipeline;
    }
    /**
     * Retries a failed stage by resetting it to 'pending' and
     * setting it as the current stage.
     */
    async retry(pipelineId, stageName) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        const stageIdx = pipeline.stages.findIndex((s) => s.name === stageName);
        if (stageIdx === -1) {
            throw new Error(`Stage not found: ${stageName}`);
        }
        const stage = pipeline.stages[stageIdx];
        if (stage.status !== 'failed') {
            throw new Error(`Stage "${stageName}" is not in failed status: ${stage.status}`);
        }
        // Reset the stage
        stage.status = 'pending';
        stage.startedAt = undefined;
        stage.completedAt = undefined;
        stage.output = undefined;
        // Set current stage pointer to the retried stage
        pipeline.currentStage = stageIdx;
        return pipeline;
    }
    /**
     * Marks the current stage as failed.
     */
    async failCurrentStage(pipelineId, error) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        const currentStage = pipeline.stages[pipeline.currentStage];
        if (!currentStage) {
            throw new Error('Pipeline has no current stage');
        }
        currentStage.status = 'failed';
        currentStage.completedAt = new Date().toISOString();
        if (error !== undefined) {
            currentStage.output = error;
        }
        return pipeline;
    }
    /**
     * Checks if the pipeline is fully complete (all stages done).
     */
    isComplete(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        return pipeline.stages.every((s) => s.status === 'completed' || s.status === 'skipped');
    }
}
exports.ContentPipeline = ContentPipeline;
//# sourceMappingURL=pipeline.js.map