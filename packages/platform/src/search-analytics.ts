/**
 * SEARCH-004: Search Analytics
 *
 * Query logging, click tracking, zero-result tracking, and search quality metrics.
 */

import { v4Fallback } from './utils';
import {
  SearchAnalyticsEvent,
  SearchAnalyticsEventSchema,
  SearchQualityMetrics,
  SearchFilter,
  SearchEventType,
} from './types';

export interface LogQueryInput {
  indexId: string;
  query: string;
  resultCount: number;
  responseTimeMs: number;
  userId?: string;
  sessionId?: string;
  filters?: SearchFilter[];
}

export interface LogClickInput {
  indexId: string;
  query: string;
  clickedDocumentId: string;
  clickPosition: number;
  userId?: string;
  sessionId?: string;
}

export class SearchAnalyticsTracker {
  private events: SearchAnalyticsEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents: number = 100000) {
    this.maxEvents = maxEvents;
  }

  /**
   * Log a search query event.
   */
  logQuery(input: LogQueryInput): SearchAnalyticsEvent {
    const event = SearchAnalyticsEventSchema.parse({
      id: v4Fallback(),
      type: 'query' as SearchEventType,
      indexId: input.indexId,
      query: input.query,
      timestamp: new Date(),
      userId: input.userId,
      sessionId: input.sessionId,
      resultCount: input.resultCount,
      responseTimeMs: input.responseTimeMs,
      filters: input.filters,
    });

    this.addEvent(event);

    // Also log a zero-result event if applicable
    if (input.resultCount === 0) {
      this.logZeroResults({
        indexId: input.indexId,
        query: input.query,
        userId: input.userId,
        sessionId: input.sessionId,
      });
    }

    return event;
  }

  /**
   * Log a click event on a search result.
   */
  logClick(input: LogClickInput): SearchAnalyticsEvent {
    const event = SearchAnalyticsEventSchema.parse({
      id: v4Fallback(),
      type: 'click' as SearchEventType,
      indexId: input.indexId,
      query: input.query,
      timestamp: new Date(),
      userId: input.userId,
      sessionId: input.sessionId,
      clickedDocumentId: input.clickedDocumentId,
      clickPosition: input.clickPosition,
    });

    this.addEvent(event);
    return event;
  }

  /**
   * Log a zero-result search event.
   */
  logZeroResults(input: {
    indexId: string;
    query: string;
    userId?: string;
    sessionId?: string;
  }): SearchAnalyticsEvent {
    const event = SearchAnalyticsEventSchema.parse({
      id: v4Fallback(),
      type: 'zero_results' as SearchEventType,
      indexId: input.indexId,
      query: input.query,
      timestamp: new Date(),
      userId: input.userId,
      sessionId: input.sessionId,
      resultCount: 0,
    });

    this.addEvent(event);
    return event;
  }

  /**
   * Log a suggestion click event.
   */
  logSuggestionClick(input: {
    indexId: string;
    query: string;
    userId?: string;
    sessionId?: string;
  }): SearchAnalyticsEvent {
    const event = SearchAnalyticsEventSchema.parse({
      id: v4Fallback(),
      type: 'suggestion_click' as SearchEventType,
      indexId: input.indexId,
      query: input.query,
      timestamp: new Date(),
      userId: input.userId,
      sessionId: input.sessionId,
    });

    this.addEvent(event);
    return event;
  }

  /**
   * Compute search quality metrics for a given index and time period.
   */
  computeMetrics(indexId: string, start: Date, end: Date): SearchQualityMetrics {
    const periodEvents = this.events.filter(
      e => e.indexId === indexId && e.timestamp >= start && e.timestamp <= end
    );

    const queryEvents = periodEvents.filter(e => e.type === 'query');
    const clickEvents = periodEvents.filter(e => e.type === 'click');
    const zeroResultEvents = periodEvents.filter(e => e.type === 'zero_results');

    const totalQueries = queryEvents.length;
    const uniqueQuerySet = new Set(queryEvents.map(e => e.query.toLowerCase()));
    const uniqueQueries = uniqueQuerySet.size;

    const zeroResultRate = totalQueries > 0 ? zeroResultEvents.length / totalQueries : 0;

    const totalResultCount = queryEvents.reduce((sum, e) => sum + (e.resultCount ?? 0), 0);
    const averageResultCount = totalQueries > 0 ? totalResultCount / totalQueries : 0;

    const clickThroughRate = totalQueries > 0 ? clickEvents.length / totalQueries : 0;

    const totalClickPosition = clickEvents.reduce((sum, e) => sum + (e.clickPosition ?? 0), 0);
    const averageClickPosition = clickEvents.length > 0 ? totalClickPosition / clickEvents.length : 0;

    const totalResponseTime = queryEvents.reduce((sum, e) => sum + (e.responseTimeMs ?? 0), 0);
    const averageResponseTimeMs = totalQueries > 0 ? totalResponseTime / totalQueries : 0;

    // Top queries by frequency
    const queryCounts = new Map<string, number>();
    for (const event of queryEvents) {
      const q = event.query.toLowerCase();
      queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
    }
    const topQueries = Array.from(queryCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));

    // Top zero-result queries
    const zeroResultCounts = new Map<string, number>();
    for (const event of zeroResultEvents) {
      const q = event.query.toLowerCase();
      zeroResultCounts.set(q, (zeroResultCounts.get(q) || 0) + 1);
    }
    const topZeroResultQueries = Array.from(zeroResultCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));

    return {
      indexId,
      period: { start, end },
      totalQueries,
      uniqueQueries,
      zeroResultRate,
      averageResultCount,
      clickThroughRate,
      averageClickPosition,
      averageResponseTimeMs,
      topQueries,
      topZeroResultQueries,
    };
  }

  /**
   * Get all events for a specific index.
   */
  getEvents(indexId: string, type?: SearchEventType, limit?: number): SearchAnalyticsEvent[] {
    let filtered = this.events.filter(e => e.indexId === indexId);
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Get the total number of tracked events.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clear all analytics data.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Clear events older than a given date.
   */
  pruneEvents(olderThan: Date): number {
    const before = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= olderThan);
    return before - this.events.length;
  }

  private addEvent(event: SearchAnalyticsEvent): void {
    this.events.push(event);
    // Evict oldest events if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
  }
}
