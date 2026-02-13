/**
 * MOB-002: Push Notification Types
 *
 * Notification payload management, device token registry,
 * topic subscriptions, and notification delivery tracking.
 */

import { v4Fallback } from './utils';
import {
  PushNotificationPayload,
  PushNotificationPayloadSchema,
  DeviceToken,
  DeviceTokenSchema,
  TopicSubscription,
  TopicSubscriptionSchema,
} from './types';

export interface SendNotificationInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  ttl?: number;
  badge?: number;
  sound?: string;
  collapseKey?: string;
  category?: string;
}

export interface NotificationDeliveryRecord {
  notificationId: string;
  deviceToken: string;
  userId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  failureReason?: string;
}

export class PushNotificationManager {
  private deviceTokens: Map<string, DeviceToken> = new Map();
  private subscriptions: Map<string, TopicSubscription[]> = new Map(); // userId -> subscriptions
  private deliveryLog: NotificationDeliveryRecord[] = [];
  private notificationHistory: PushNotificationPayload[] = [];

  /**
   * Create a notification payload.
   */
  createNotification(input: SendNotificationInput): PushNotificationPayload {
    const payload = PushNotificationPayloadSchema.parse({
      id: v4Fallback(),
      title: input.title,
      body: input.body,
      data: input.data,
      imageUrl: input.imageUrl,
      actionUrl: input.actionUrl,
      priority: input.priority ?? 'normal',
      ttl: input.ttl,
      badge: input.badge,
      sound: input.sound,
      collapseKey: input.collapseKey,
      category: input.category,
    });

    this.notificationHistory.push(payload);
    return payload;
  }

  /**
   * Register a device token for push notifications.
   */
  registerDeviceToken(input: Omit<DeviceToken, 'createdAt' | 'lastUsedAt' | 'active'>): DeviceToken {
    const now = new Date();
    const token = DeviceTokenSchema.parse({
      ...input,
      createdAt: now,
      lastUsedAt: now,
      active: true,
    });

    this.deviceTokens.set(token.token, token);
    return token;
  }

  /**
   * Unregister/deactivate a device token.
   */
  unregisterDeviceToken(tokenStr: string): boolean {
    const token = this.deviceTokens.get(tokenStr);
    if (!token) return false;

    this.deviceTokens.set(tokenStr, { ...token, active: false });
    return true;
  }

  /**
   * Get all active device tokens for a user.
   */
  getUserDeviceTokens(userId: string): DeviceToken[] {
    return Array.from(this.deviceTokens.values())
      .filter(t => t.userId === userId && t.active);
  }

  /**
   * Get all active device tokens for a specific platform.
   */
  getPlatformTokens(platform: 'ios' | 'android' | 'web'): DeviceToken[] {
    return Array.from(this.deviceTokens.values())
      .filter(t => t.platform === platform && t.active);
  }

  /**
   * Subscribe a user to a topic.
   */
  subscribeTopic(userId: string, topic: string): TopicSubscription {
    const subscription = TopicSubscriptionSchema.parse({
      userId,
      topic,
      subscribedAt: new Date(),
      active: true,
    });

    const userSubs = this.subscriptions.get(userId) ?? [];

    // Check if already subscribed
    const existing = userSubs.findIndex(s => s.topic === topic);
    if (existing >= 0) {
      userSubs[existing] = subscription;
    } else {
      userSubs.push(subscription);
    }

    this.subscriptions.set(userId, userSubs);
    return subscription;
  }

  /**
   * Unsubscribe a user from a topic.
   */
  unsubscribeTopic(userId: string, topic: string): boolean {
    const userSubs = this.subscriptions.get(userId);
    if (!userSubs) return false;

    const index = userSubs.findIndex(s => s.topic === topic && s.active);
    if (index < 0) return false;

    userSubs[index] = { ...userSubs[index], active: false };
    return true;
  }

  /**
   * Get all active topic subscriptions for a user.
   */
  getUserSubscriptions(userId: string): TopicSubscription[] {
    return (this.subscriptions.get(userId) ?? []).filter(s => s.active);
  }

  /**
   * Get all user IDs subscribed to a topic.
   */
  getTopicSubscribers(topic: string): string[] {
    const subscribers: string[] = [];
    for (const [userId, subs] of this.subscriptions) {
      if (subs.some(s => s.topic === topic && s.active)) {
        subscribers.push(userId);
      }
    }
    return subscribers;
  }

  /**
   * Send a notification to a specific user (all their active devices).
   */
  sendToUser(
    notification: PushNotificationPayload,
    userId: string
  ): NotificationDeliveryRecord[] {
    const tokens = this.getUserDeviceTokens(userId);
    const records: NotificationDeliveryRecord[] = [];

    for (const token of tokens) {
      const record: NotificationDeliveryRecord = {
        notificationId: notification.id,
        deviceToken: token.token,
        userId,
        status: 'sent',
        sentAt: new Date(),
      };
      records.push(record);
      this.deliveryLog.push(record);

      // Update last used timestamp
      this.deviceTokens.set(token.token, { ...token, lastUsedAt: new Date() });
    }

    return records;
  }

  /**
   * Send a notification to all subscribers of a topic.
   */
  sendToTopic(
    notification: PushNotificationPayload,
    topic: string
  ): NotificationDeliveryRecord[] {
    const subscribers = this.getTopicSubscribers(topic);
    const allRecords: NotificationDeliveryRecord[] = [];

    for (const userId of subscribers) {
      const records = this.sendToUser(notification, userId);
      allRecords.push(...records);
    }

    return allRecords;
  }

  /**
   * Get delivery log for a notification.
   */
  getDeliveryLog(notificationId: string): NotificationDeliveryRecord[] {
    return this.deliveryLog.filter(r => r.notificationId === notificationId);
  }

  /**
   * Get notification history.
   */
  getNotificationHistory(limit: number = 50): PushNotificationPayload[] {
    return this.notificationHistory.slice(-limit);
  }

  /**
   * Get stats about registered devices and subscriptions.
   */
  getStats(): {
    totalDevices: number;
    activeDevices: number;
    byPlatform: Record<string, number>;
    totalSubscriptions: number;
    topTopics: Array<{ topic: string; count: number }>;
  } {
    const allTokens = Array.from(this.deviceTokens.values());
    const activeTokens = allTokens.filter(t => t.active);

    const byPlatform: Record<string, number> = {};
    for (const token of activeTokens) {
      byPlatform[token.platform] = (byPlatform[token.platform] || 0) + 1;
    }

    const topicCounts = new Map<string, number>();
    for (const [, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (sub.active) {
          topicCounts.set(sub.topic, (topicCounts.get(sub.topic) || 0) + 1);
        }
      }
    }

    const topTopics = Array.from(topicCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((sum, subs) => sum + subs.filter(s => s.active).length, 0);

    return {
      totalDevices: allTokens.length,
      activeDevices: activeTokens.length,
      byPlatform,
      totalSubscriptions,
      topTopics,
    };
  }
}
