"use strict";
/**
 * @module in-app
 * NOTIFY-003: In-App Notifications.
 * Notification store, read/unread tracking, and real-time push interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationStore = void 0;
const types_1 = require("./types");
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
class InAppNotificationStore {
    constructor() {
        this.notifications = new Map();
        this.pushHandlers = new Map();
    }
    /** Create and store a new notification. */
    create(params) {
        const notification = types_1.InAppNotificationSchema.parse({
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
                }
                catch {
                    // Ignore handler errors
                }
            }
        }
        return notification;
    }
    /** Get a notification by ID. */
    get(id) {
        return this.notifications.get(id);
    }
    /** Query notifications with filters. */
    query(filter) {
        const validated = types_1.NotificationFilterSchema.parse(filter);
        let results = Array.from(this.notifications.values()).filter((n) => n.userId === validated.userId);
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
            results = results.filter((n) => new Date(n.createdAt).getTime() >= sinceTime);
        }
        // Sort by createdAt descending (newest first)
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Apply pagination
        const offset = validated.offset ?? 0;
        const limit = validated.limit ?? 50;
        return results.slice(offset, offset + limit);
    }
    /** Mark a notification as read. */
    markAsRead(userId, notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification || notification.userId !== userId)
            return false;
        notification.read = true;
        notification.readAt = new Date().toISOString();
        return true;
    }
    /** Mark all notifications for a user as read. */
    markAllAsRead(userId) {
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
    getUnreadCount(userId) {
        let count = 0;
        for (const notification of this.notifications.values()) {
            if (notification.userId === userId && !notification.read) {
                count++;
            }
        }
        return count;
    }
    /** Delete a notification. */
    delete(notificationId) {
        return this.notifications.delete(notificationId);
    }
    /** Delete all notifications for a user. */
    deleteAll(userId) {
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
    deleteExpired() {
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
    onPush(userId, handler) {
        const handlers = this.pushHandlers.get(userId) ?? [];
        handlers.push(handler);
        this.pushHandlers.set(userId, handlers);
        // Return unsubscribe function
        return () => {
            const current = this.pushHandlers.get(userId);
            if (current) {
                const index = current.indexOf(handler);
                if (index >= 0)
                    current.splice(index, 1);
                if (current.length === 0)
                    this.pushHandlers.delete(userId);
            }
        };
    }
    /** Get total notification count. */
    getTotalCount() {
        return this.notifications.size;
    }
    /** Clear all notifications. */
    clear() {
        this.notifications.clear();
    }
}
exports.InAppNotificationStore = InAppNotificationStore;
//# sourceMappingURL=in-app.js.map