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

/**
 * In-memory handoff queue for development and testing.
 */
class InMemoryHandoffQueue implements HandoffQueue {
  private queue: Array<{ jobId: string; payload: HandoffPayload }> = [];
  private nextId = 1;

  async enqueue(payload: HandoffPayload): Promise<string> {
    const jobId = `handoff-${this.nextId++}`;
    this.queue.push({ jobId, payload });
    return jobId;
  }

  async dequeue(): Promise<HandoffPayload | null> {
    const item = this.queue.shift();
    return item?.payload ?? null;
  }

  async acknowledge(_jobId: string): Promise<void> {
    // In-memory queue: items are removed on dequeue, so acknowledge is a no-op
  }

  async getQueueDepth(): Promise<number> {
    return this.queue.length;
  }
}

export class CFToMediaPosterHandoff {
  private readonly queue: HandoffQueue;

  constructor(queue?: HandoffQueue) {
    this.queue = queue ?? new InMemoryHandoffQueue();
  }

  /**
   * Takes a rendered asset from the Content Factory and enqueues it
   * for the MediaPoster to pick up and distribute.
   */
  async handoff(input: {
    contentId: string;
    renderedAssetUrl: string;
    metadata: PublishMetadata;
    targetPlatforms: Platform[];
    priority?: number;
  }): Promise<string> {
    const payload: HandoffPayload = {
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
  async getNext(): Promise<HandoffPayload | null> {
    return this.queue.dequeue();
  }

  /**
   * Acknowledges that a handoff job has been processed.
   */
  async acknowledge(jobId: string): Promise<void> {
    return this.queue.acknowledge(jobId);
  }

  /**
   * Returns the number of pending handoff jobs.
   */
  async getQueueDepth(): Promise<number> {
    return this.queue.getQueueDepth();
  }
}
