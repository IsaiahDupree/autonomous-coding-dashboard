/**
 * PUB-006: Content Factory to MediaPoster Handoff
 *
 * Transfers rendered content from the Content Factory pipeline
 * to the MediaPoster publishing queue for scheduled distribution.
 */
import type { HandoffPayload, Platform, PublishMetadata } from '../types';
export interface HandoffQueue {
    enqueue(payload: HandoffPayload): Promise<string>;
    dequeue(): Promise<HandoffPayload | null>;
    acknowledge(jobId: string): Promise<void>;
    getQueueDepth(): Promise<number>;
}
export declare class CFToMediaPosterHandoff {
    private readonly queue;
    constructor(queue?: HandoffQueue);
    /**
     * Takes a rendered asset from the Content Factory and enqueues it
     * for the MediaPoster to pick up and distribute.
     */
    handoff(input: {
        contentId: string;
        renderedAssetUrl: string;
        metadata: PublishMetadata;
        targetPlatforms: Platform[];
        priority?: number;
    }): Promise<string>;
    /**
     * Retrieves the next handoff job from the queue.
     */
    getNext(): Promise<HandoffPayload | null>;
    /**
     * Acknowledges that a handoff job has been processed.
     */
    acknowledge(jobId: string): Promise<void>;
    /**
     * Returns the number of pending handoff jobs.
     */
    getQueueDepth(): Promise<number>;
}
//# sourceMappingURL=handoff.d.ts.map