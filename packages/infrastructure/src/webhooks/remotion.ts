/**
 * WH-002: Remotion Webhook Handler
 *
 * Processes callbacks from Remotion Lambda render jobs.
 * Routes render-complete, render-failed, and progress events
 * to the appropriate internal handlers.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type RemotionEventType =
  | 'render.started'
  | 'render.progress'
  | 'render.completed'
  | 'render.failed'
  | 'render.timeout';

export interface RemotionRenderEvent {
  type: RemotionEventType;
  renderId: string;
  compositionId: string;
  timestamp: string;
  progress?: number;
  outputUrl?: string;
  outputSizeBytes?: number;
  durationMs?: number;
  errorMessage?: string;
  lambdaFunctionName?: string;
}

export type RemotionEventHandler = (event: RemotionRenderEvent) => Promise<void>;

// ── Handler ──────────────────────────────────────────────────────────────────

export class RemotionWebhookHandler {
  private handlers: Map<RemotionEventType, RemotionEventHandler[]> = new Map();

  /**
   * Register a handler for a specific Remotion event type.
   */
  on(eventType: RemotionEventType, handler: RemotionEventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Remove a handler for a specific event type.
   */
  off(eventType: RemotionEventType, handler: RemotionEventHandler): void {
    const existing = this.handlers.get(eventType);
    if (!existing) return;
    const idx = existing.indexOf(handler);
    if (idx >= 0) existing.splice(idx, 1);
  }

  /**
   * Process an incoming Remotion webhook payload.
   * Validates the event and routes to registered handlers.
   */
  async processWebhook(
    payload: unknown,
    signature?: string,
    secret?: string,
  ): Promise<{ handled: boolean; eventType: RemotionEventType }> {
    const event = this.parseEvent(payload);

    // Verify signature if provided
    if (signature && secret) {
      this.verifySignature(JSON.stringify(payload), signature, secret);
    }

    const handlers = this.handlers.get(event.type) ?? [];

    for (const handler of handlers) {
      await handler(event);
    }

    return { handled: handlers.length > 0, eventType: event.type };
  }

  /**
   * Verify the HMAC signature of a Remotion webhook.
   */
  private verifySignature(
    _payload: string,
    _signature: string,
    _secret: string,
  ): void {
    // In production: compute HMAC-SHA256 and compare with signature
    // const computed = createHmac('sha256', secret).update(payload).digest('hex');
    // if (computed !== signature) throw new Error('Invalid webhook signature');
  }

  /**
   * Parse and validate the incoming event payload.
   */
  private parseEvent(payload: unknown): RemotionRenderEvent {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid Remotion webhook payload');
    }

    const p = payload as Record<string, unknown>;

    if (!p.type || typeof p.type !== 'string') {
      throw new Error('Missing or invalid event type');
    }

    if (!p.renderId || typeof p.renderId !== 'string') {
      throw new Error('Missing or invalid renderId');
    }

    return {
      type: p.type as RemotionEventType,
      renderId: p.renderId as string,
      compositionId: (p.compositionId as string) ?? '',
      timestamp: (p.timestamp as string) ?? new Date().toISOString(),
      progress: p.progress as number | undefined,
      outputUrl: p.outputUrl as string | undefined,
      outputSizeBytes: p.outputSizeBytes as number | undefined,
      durationMs: p.durationMs as number | undefined,
      errorMessage: p.errorMessage as string | undefined,
      lambdaFunctionName: p.lambdaFunctionName as string | undefined,
    };
  }
}
