"use strict";
/**
 * PUB-006: Content Factory to MediaPoster Handoff
 *
 * Transfers rendered content from the Content Factory pipeline
 * to the MediaPoster publishing queue for scheduled distribution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CFToMediaPosterHandoff = void 0;
/**
 * In-memory handoff queue for development and testing.
 */
class InMemoryHandoffQueue {
    constructor() {
        this.queue = [];
        this.nextId = 1;
    }
    async enqueue(payload) {
        const jobId = `handoff-${this.nextId++}`;
        this.queue.push({ jobId, payload });
        return jobId;
    }
    async dequeue() {
        const item = this.queue.shift();
        return item?.payload ?? null;
    }
    async acknowledge(_jobId) {
        // In-memory queue: items are removed on dequeue, so acknowledge is a no-op
    }
    async getQueueDepth() {
        return this.queue.length;
    }
}
class CFToMediaPosterHandoff {
    constructor(queue) {
        this.queue = queue ?? new InMemoryHandoffQueue();
    }
    /**
     * Takes a rendered asset from the Content Factory and enqueues it
     * for the MediaPoster to pick up and distribute.
     */
    async handoff(input) {
        const payload = {
            contentId: input.contentId,
            renderedAssetUrl: input.renderedAssetUrl,
            metadata: input.metadata,
            targetPlatforms: input.targetPlatforms,
            priority: input.priority ?? 0,
            createdAt: new Date().toISOString(),
        };
        return this.queue.enqueue(payload);
    }
    /**
     * Retrieves the next handoff job from the queue.
     */
    async getNext() {
        return this.queue.dequeue();
    }
    /**
     * Acknowledges that a handoff job has been processed.
     */
    async acknowledge(jobId) {
        return this.queue.acknowledge(jobId);
    }
    /**
     * Returns the number of pending handoff jobs.
     */
    async getQueueDepth() {
        return this.queue.getQueueDepth();
    }
}
exports.CFToMediaPosterHandoff = CFToMediaPosterHandoff;
//# sourceMappingURL=handoff.js.map