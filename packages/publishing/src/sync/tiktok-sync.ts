/**
 * SYNC-002: TikTok Video Status Sync
 *
 * Polls TikTok's Content Posting API to track the status
 * of published videos and detect changes.
 */

import type { SyncConfig } from '../types';

export interface TikTokVideoStatus {
  videoId: string;
  publishId: string;
  status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
  createTime: number;
  title: string;
  shareUrl: string;
  lastChecked: string;
}

export type TikTokSyncCallback = (statuses: TikTokVideoStatus[]) => void | Promise<void>;

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokVideoSync {
  private readonly accessToken: string;
  private readonly syncConfig: SyncConfig;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: TikTokSyncCallback[] = [];
  private trackedPublishIds: string[] = [];

  constructor(config: {
    accessToken: string;
    syncConfig?: Partial<SyncConfig>;
  }) {
    this.accessToken = config.accessToken;
    this.syncConfig = {
      provider: 'tiktok',
      entityType: 'video',
      entityId: 'all',
      syncIntervalMs: config.syncConfig?.syncIntervalMs ?? 60_000,
      lastSyncAt: config.syncConfig?.lastSyncAt,
    };
  }

  /**
   * Adds a publish ID to the tracking list.
   */
  trackPublishId(publishId: string): void {
    if (!this.trackedPublishIds.includes(publishId)) {
      this.trackedPublishIds.push(publishId);
    }
  }

  /**
   * Removes a publish ID from the tracking list.
   */
  untrackPublishId(publishId: string): void {
    this.trackedPublishIds = this.trackedPublishIds.filter((id) => id !== publishId);
  }

  /**
   * Registers a callback to be notified when video statuses change.
   */
  onStatusChange(callback: TikTokSyncCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Starts polling for video status changes at the configured interval.
   */
  start(): void {
    if (this.pollingTimer) {
      return;
    }

    void this.poll();

    this.pollingTimer = setInterval(() => {
      void this.poll();
    }, this.syncConfig.syncIntervalMs);
  }

  /**
   * Stops the polling loop.
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Performs a single poll to check status of all tracked videos.
   */
  async poll(): Promise<TikTokVideoStatus[]> {
    if (this.trackedPublishIds.length === 0) {
      return [];
    }

    const statuses: TikTokVideoStatus[] = [];

    for (const publishId of this.trackedPublishIds) {
      try {
        const status = await this.checkStatus(publishId);
        statuses.push(status);

        // Auto-remove completed or failed videos from tracking
        if (status.status === 'PUBLISH_COMPLETE' || status.status === 'FAILED') {
          this.untrackPublishId(publishId);
        }
      } catch {
        // Continue checking other videos even if one fails
      }
    }

    // Update last sync time
    this.syncConfig.lastSyncAt = new Date().toISOString();

    // Notify callbacks
    for (const callback of this.callbacks) {
      await callback(statuses);
    }

    return statuses;
  }

  /**
   * Checks the status of a single video by its publish ID.
   */
  private async checkStatus(publishId: string): Promise<TikTokVideoStatus> {
    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok video status check failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      data: {
        status: TikTokVideoStatus['status'];
        publish_id: string;
      };
    };

    return {
      videoId: data.data.publish_id,
      publishId: data.data.publish_id,
      status: data.data.status,
      createTime: Date.now(),
      title: '',
      shareUrl: '',
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Returns the current sync configuration.
   */
  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  /**
   * Returns whether the sync loop is currently running.
   */
  isRunning(): boolean {
    return this.pollingTimer !== null;
  }

  /**
   * Returns all currently tracked publish IDs.
   */
  getTrackedIds(): string[] {
    return [...this.trackedPublishIds];
  }
}
