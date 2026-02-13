/**
 * OB-002: Product Tour System
 *
 * Tour step types, tooltip placement, trigger conditions,
 * and tour state management.
 */

import { v4Fallback } from './utils';
import {
  ProductTour,
  ProductTourSchema,
  TourStep,
  TourTrigger,
} from './types';

export interface CreateTourInput {
  name: string;
  description?: string;
  steps: TourStep[];
  trigger: TourTrigger;
  triggerCondition?: Record<string, unknown>;
  showOnce?: boolean;
}

export interface TourProgress {
  tourId: string;
  userId: string;
  currentStepIndex: number;
  completed: boolean;
  dismissed: boolean;
  startedAt: Date;
  completedAt?: Date;
  stepsViewed: string[];
}

export class ProductTourManager {
  private tours: Map<string, ProductTour> = new Map();
  private tourProgress: Map<string, TourProgress> = new Map(); // "userId:tourId" -> progress
  private completedTours: Map<string, Set<string>> = new Map(); // userId -> Set<tourId>

  /**
   * Create a new product tour.
   */
  createTour(input: CreateTourInput): ProductTour {
    const tour = ProductTourSchema.parse({
      id: v4Fallback(),
      name: input.name,
      description: input.description,
      steps: input.steps,
      trigger: input.trigger,
      triggerCondition: input.triggerCondition,
      active: true,
      showOnce: input.showOnce ?? true,
      createdAt: new Date(),
    });

    this.tours.set(tour.id, tour);
    return tour;
  }

  /**
   * Get a tour by ID.
   */
  getTour(tourId: string): ProductTour | undefined {
    return this.tours.get(tourId);
  }

  /**
   * List all active tours.
   */
  listTours(includeInactive: boolean = false): ProductTour[] {
    return Array.from(this.tours.values())
      .filter(t => includeInactive || t.active);
  }

  /**
   * Deactivate a tour.
   */
  deactivateTour(tourId: string): boolean {
    const tour = this.tours.get(tourId);
    if (!tour) return false;
    this.tours.set(tourId, { ...tour, active: false });
    return true;
  }

  /**
   * Check if a tour should be shown to a user based on trigger conditions.
   */
  shouldShowTour(tourId: string, userId: string, context?: Record<string, unknown>): boolean {
    const tour = this.tours.get(tourId);
    if (!tour || !tour.active) return false;

    // Check if user has already completed this tour (show-once)
    if (tour.showOnce) {
      const completed = this.completedTours.get(userId);
      if (completed?.has(tourId)) return false;
    }

    // Check if user is currently in this tour
    const key = this.progressKey(userId, tourId);
    const existing = this.tourProgress.get(key);
    if (existing && !existing.completed && !existing.dismissed) return false;

    // Check trigger conditions
    if (tour.triggerCondition && context) {
      for (const [field, expected] of Object.entries(tour.triggerCondition)) {
        if (context[field] !== expected) return false;
      }
    }

    return true;
  }

  /**
   * Get all tours that should be shown to a user.
   */
  getAvailableTours(userId: string, trigger: TourTrigger, context?: Record<string, unknown>): ProductTour[] {
    return Array.from(this.tours.values())
      .filter(t => t.trigger === trigger && this.shouldShowTour(t.id, userId, context));
  }

  /**
   * Start a tour for a user.
   */
  startTour(userId: string, tourId: string): TourProgress {
    const tour = this.tours.get(tourId);
    if (!tour) throw new Error(`Tour "${tourId}" not found`);

    const sortedSteps = [...tour.steps].sort((a, b) => a.order - b.order);
    const firstStep = sortedSteps[0];

    const progress: TourProgress = {
      tourId,
      userId,
      currentStepIndex: 0,
      completed: false,
      dismissed: false,
      startedAt: new Date(),
      stepsViewed: [firstStep.id],
    };

    this.tourProgress.set(this.progressKey(userId, tourId), progress);
    return progress;
  }

  /**
   * Advance to the next step in the tour.
   */
  nextStep(userId: string, tourId: string): TourProgress {
    const key = this.progressKey(userId, tourId);
    const progress = this.tourProgress.get(key);
    if (!progress) throw new Error('No active tour progress found');

    const tour = this.tours.get(tourId);
    if (!tour) throw new Error(`Tour "${tourId}" not found`);

    const sortedSteps = [...tour.steps].sort((a, b) => a.order - b.order);
    const nextIndex = progress.currentStepIndex + 1;

    if (nextIndex >= sortedSteps.length) {
      // Tour completed
      return this.completeTour(userId, tourId);
    }

    const updatedProgress: TourProgress = {
      ...progress,
      currentStepIndex: nextIndex,
      stepsViewed: [...progress.stepsViewed, sortedSteps[nextIndex].id],
    };

    this.tourProgress.set(key, updatedProgress);
    return updatedProgress;
  }

  /**
   * Go to the previous step in the tour.
   */
  previousStep(userId: string, tourId: string): TourProgress {
    const key = this.progressKey(userId, tourId);
    const progress = this.tourProgress.get(key);
    if (!progress) throw new Error('No active tour progress found');

    if (progress.currentStepIndex <= 0) {
      return progress; // Already at first step
    }

    const updatedProgress: TourProgress = {
      ...progress,
      currentStepIndex: progress.currentStepIndex - 1,
    };

    this.tourProgress.set(key, updatedProgress);
    return updatedProgress;
  }

  /**
   * Complete a tour.
   */
  completeTour(userId: string, tourId: string): TourProgress {
    const key = this.progressKey(userId, tourId);
    const progress = this.tourProgress.get(key);
    if (!progress) throw new Error('No active tour progress found');

    const updatedProgress: TourProgress = {
      ...progress,
      completed: true,
      completedAt: new Date(),
    };

    this.tourProgress.set(key, updatedProgress);

    // Track completed tours per user
    if (!this.completedTours.has(userId)) {
      this.completedTours.set(userId, new Set());
    }
    this.completedTours.get(userId)!.add(tourId);

    return updatedProgress;
  }

  /**
   * Dismiss a tour (user opted out).
   */
  dismissTour(userId: string, tourId: string): TourProgress {
    const key = this.progressKey(userId, tourId);
    const progress = this.tourProgress.get(key);
    if (!progress) throw new Error('No active tour progress found');

    const updatedProgress: TourProgress = {
      ...progress,
      dismissed: true,
    };

    this.tourProgress.set(key, updatedProgress);

    // Also mark as completed to prevent re-showing
    if (!this.completedTours.has(userId)) {
      this.completedTours.set(userId, new Set());
    }
    this.completedTours.get(userId)!.add(tourId);

    return updatedProgress;
  }

  /**
   * Get the current tour progress for a user.
   */
  getProgress(userId: string, tourId: string): TourProgress | undefined {
    return this.tourProgress.get(this.progressKey(userId, tourId));
  }

  /**
   * Get the current step details.
   */
  getCurrentStep(userId: string, tourId: string): TourStep | undefined {
    const progress = this.tourProgress.get(this.progressKey(userId, tourId));
    if (!progress) return undefined;

    const tour = this.tours.get(tourId);
    if (!tour) return undefined;

    const sortedSteps = [...tour.steps].sort((a, b) => a.order - b.order);
    return sortedSteps[progress.currentStepIndex];
  }

  /**
   * Reset tour progress for a user (allows re-viewing).
   */
  resetProgress(userId: string, tourId: string): void {
    this.tourProgress.delete(this.progressKey(userId, tourId));
    this.completedTours.get(userId)?.delete(tourId);
  }

  private progressKey(userId: string, tourId: string): string {
    return `${userId}:${tourId}`;
  }
}
