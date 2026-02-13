/**
 * @module in-app
 * NOTIFY-003: In-App Notifications.
 * Notification store, read/unread tracking, and real-time push interface.
 */
import { InAppNotification, NotificationFilter } from './types';
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
export declare class InAppNotificationStore {
    private readonly notifications;
    private readonly pushHandlers;
    /** Create and store a new notification. */
    create(params: Omit<InAppNotification, 'id' | 'createdAt' | 'read'> & {
        id?: string;
        createdAt?: string;
        read?: boolean;
    }): InAppNotification;
    /** Get a notification by ID. */
    get(id: string): InAppNotification | undefined;
    /** Query notifications with filters. */
    query(filter: Partial<NotificationFilter> & {
        userId: string;
    }): InAppNotification[];
    /** Mark a notification as read. */
    markAsRead(userId: string, notificationId: string): boolean;
    /** Mark all notifications for a user as read. */
    markAllAsRead(userId: string): number;
    /** Get unread count for a user. */
    getUnreadCount(userId: string): number;
    /** Delete a notification. */
    delete(notificationId: string): boolean;
    /** Delete all notifications for a user. */
    deleteAll(userId: string): number;
    /** Delete expired notifications. */
    deleteExpired(): number;
    /** Register a real-time push handler for a user. */
    onPush(userId: string, handler: NotificationPushHandler): () => void;
    /** Get total notification count. */
    getTotalCount(): number;
    /** Clear all notifications. */
    clear(): void;
}
//# sourceMappingURL=in-app.d.ts.map