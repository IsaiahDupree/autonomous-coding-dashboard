/**
 * @module in-app
 * NOTIFY-003: In-App Notifications.
 * Notification store, read/unread tracking, and real-time push interface.
 */

import {
  InAppNotification,
  InAppNotificationSchema,
  NotificationFilter,
  NotificationFilterSchema,
  NotificationPriority,
} from './types';

/** Callback for real-time notification push. */
export type NotificationPushHandler = (notification: InAppNotification) => void;

/**
 * In-App Notification Store.
 * In-memory store with read/unread tracking, filtering, and real-time push support.
 *
 * @example
 * ```ts
 * const store = new InAppNotificationStore();
 *
 * store.onPush('user-123', (notification) => {
 *   console.log('New notification:', notification.title);
 * });
 *
 * store.create({
 *   userId: 'user-123',
 *   title: 'Build Complete',
 *   body: 'Your project built successfully.',
 *   type: 'build',
 *   priority: 'normal',
 * });
 *
 * const unread = store.getUnreadCount('user-123');
 * store.markAsRead('user-123', notificationId);
 * ```
 */
export class InAppNotificationStore {
  private readonly notifications: Map<string, InAppNotification> = new Map();
  private readonly pushHandlers: Map<string, NotificationPushHandler[]> = new Map();

  /** Create and store a new notification. */
  create(
    params: Omit<InAppNotification, 'id' | 'createdAt' | 'read'> & {
      id?: string;
      createdAt?: string;
      read?: boolean;
    }
  ): InAppNotification {
    const notification = InAppNotificationSchema.parse({
      id: params.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: params.createdAt ?? new Date().toISOString(),
      read: params.read ?? false,
      ...params,
    });

    this.notifications.set(notification.id, notification);

    // Push to registered handlers
    const handlers = this.pushHandlers.get(notification.userId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(notification);
        } catch {
          // Ignore handler errors
        }
      }
    }

    return notification;
  }

  /** Get a notification by ID. */
  get(id: string): InAppNotification | undefined {
    return this.notifications.get(id);
  }

  /** Query notifications with filters. */
  query(filter: Partial<NotificationFilter> & { userId: string }): InAppNotification[] {
    const validated = NotificationFilterSchema.parse(filter);
    let results = Array.from(this.notifications.values()).filter(
      (n) => n.userId === validated.userId
    );

    if (validated.read !== undefined) {
      results = results.filter((n) => n.read === validated.read);
    }

    if (validated.type) {
      results = results.filter((n) => n.type === validated.type);
    }

    if (validated.priority) {
      results = results.filter((n) => n.priority === validated.priority);
    }

    if (validated.since) {
      const sinceTime = new Date(validated.since).getTime();
      results = results.filter(
        (n) => new Date(n.createdAt).getTime() >= sinceTime
      );
    }

    // Sort by createdAt descending (newest first)
    results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const offset = validated.offset ?? 0;
    const limit = validated.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  /** Mark a notification as read. */
  markAsRead(userId: string, notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;

    notification.read = true;
    notification.readAt = new Date().toISOString();
    return true;
  }

  /** Mark all notifications for a user as read. */
  markAllAsRead(userId: string): number {
    let count = 0;
    const now = new Date().toISOString();

    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        notification.readAt = now;
        count++;
      }
    }

    return count;
  }

  /** Get unread count for a user. */
  getUnreadCount(userId: string): number {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) {
        count++;
      }
    }
    return count;
  }

  /** Delete a notification. */
  delete(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /** Delete all notifications for a user. */
  deleteAll(userId: string): number {
    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId) {
        this.notifications.delete(id);
        count++;
      }
    }
    return count;
  }

  /** Delete expired notifications. */
  deleteExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.expiresAt && new Date(notification.expiresAt).getTime() <= now) {
        this.notifications.delete(id);
        count++;
      }
    }

    return count;
  }

  /** Register a real-time push handler for a user. */
  onPush(userId: string, handler: NotificationPushHandler): () => void {
    const handlers = this.pushHandlers.get(userId) ?? [];
    handlers.push(handler);
    this.pushHandlers.set(userId, handlers);

    // Return unsubscribe function
    return () => {
      const current = this.pushHandlers.get(userId);
      if (current) {
        const index = current.indexOf(handler);
        if (index >= 0) current.splice(index, 1);
        if (current.length === 0) this.pushHandlers.delete(userId);
      }
    };
  }

  /** Get total notification count. */
  getTotalCount(): number {
    return this.notifications.size;
  }

  /** Clear all notifications. */
  clear(): void {
    this.notifications.clear();
  }
}
