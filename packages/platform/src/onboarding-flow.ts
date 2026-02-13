/**
 * OB-001: Onboarding Flow Engine
 *
 * Step definitions, progress tracking, branching logic,
 * and flow lifecycle management.
 */

import { v4Fallback } from './utils';
import {
  OnboardingFlow,
  OnboardingFlowSchema,
  OnboardingStep,
  OnboardingProgress,
  OnboardingProgressSchema,
} from './types';

export interface CreateFlowInput {
  name: string;
  steps: OnboardingStep[];
  version?: number;
}

export class OnboardingFlowEngine {
  private flows: Map<string, OnboardingFlow> = new Map();
  private progress: Map<string, OnboardingProgress> = new Map(); // "userId:flowId" -> progress

  /**
   * Create a new onboarding flow.
   */
  createFlow(input: CreateFlowInput): OnboardingFlow {
    const now = new Date();
    const flow = OnboardingFlowSchema.parse({
      id: v4Fallback(),
      name: input.name,
      version: input.version ?? 1,
      steps: input.steps,
      createdAt: now,
      updatedAt: now,
      active: true,
    });

    this.flows.set(flow.id, flow);
    return flow;
  }

  /**
   * Get a flow by ID.
   */
  getFlow(flowId: string): OnboardingFlow | undefined {
    return this.flows.get(flowId);
  }

  /**
   * List all active flows.
   */
  listFlows(includeInactive: boolean = false): OnboardingFlow[] {
    return Array.from(this.flows.values())
      .filter(f => includeInactive || f.active);
  }

  /**
   * Deactivate a flow.
   */
  deactivateFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;
    this.flows.set(flowId, { ...flow, active: false, updatedAt: new Date() });
    return true;
  }

  /**
   * Start an onboarding flow for a user.
   */
  startFlow(userId: string, flowId: string): OnboardingProgress {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow "${flowId}" not found`);
    if (!flow.active) throw new Error(`Flow "${flowId}" is inactive`);

    const sortedSteps = [...flow.steps].sort((a, b) => a.order - b.order);
    const firstStep = sortedSteps[0];

    const progressData = OnboardingProgressSchema.parse({
      userId,
      flowId,
      currentStepId: firstStep.id,
      completedStepIds: [],
      stepData: {},
      startedAt: new Date(),
      skippedStepIds: [],
      percentComplete: 0,
    });

    const key = this.progressKey(userId, flowId);
    this.progress.set(key, progressData);
    return progressData;
  }

  /**
   * Get the current progress for a user in a flow.
   */
  getProgress(userId: string, flowId: string): OnboardingProgress | undefined {
    return this.progress.get(this.progressKey(userId, flowId));
  }

  /**
   * Complete the current step and advance to the next one.
   * Supports branching logic via step conditions.
   */
  completeStep(
    userId: string,
    flowId: string,
    stepData?: Record<string, unknown>
  ): OnboardingProgress {
    const key = this.progressKey(userId, flowId);
    const currentProgress = this.progress.get(key);
    if (!currentProgress) throw new Error('No active progress found');

    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow "${flowId}" not found`);

    const currentStep = flow.steps.find(s => s.id === currentProgress.currentStepId);
    if (!currentStep) throw new Error(`Step "${currentProgress.currentStepId}" not found in flow`);

    // Store step data
    const updatedStepData = { ...currentProgress.stepData };
    if (stepData) {
      updatedStepData[currentStep.id] = stepData;
    }

    // Mark step as completed
    const completedStepIds = [...currentProgress.completedStepIds, currentStep.id];

    // Determine next step (branching logic)
    const nextStepId = this.resolveNextStep(flow, currentStep, stepData);

    // Calculate progress percentage
    const totalSteps = flow.steps.length;
    const percentComplete = Math.round((completedStepIds.length / totalSteps) * 100);

    const updatedProgress: OnboardingProgress = {
      ...currentProgress,
      currentStepId: nextStepId ?? currentProgress.currentStepId,
      completedStepIds,
      stepData: updatedStepData,
      percentComplete: Math.min(percentComplete, 100),
      completedAt: nextStepId === null ? new Date() : undefined,
    };

    this.progress.set(key, updatedProgress);
    return updatedProgress;
  }

  /**
   * Skip the current step.
   */
  skipStep(userId: string, flowId: string): OnboardingProgress {
    const key = this.progressKey(userId, flowId);
    const currentProgress = this.progress.get(key);
    if (!currentProgress) throw new Error('No active progress found');

    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow "${flowId}" not found`);

    const currentStep = flow.steps.find(s => s.id === currentProgress.currentStepId);
    if (!currentStep) throw new Error(`Step "${currentProgress.currentStepId}" not found in flow`);

    if (currentStep.required) {
      throw new Error(`Step "${currentStep.id}" is required and cannot be skipped`);
    }

    const skippedStepIds = [...currentProgress.skippedStepIds, currentStep.id];

    // Find next step by order
    const sortedSteps = [...flow.steps].sort((a, b) => a.order - b.order);
    const currentIndex = sortedSteps.findIndex(s => s.id === currentStep.id);
    const nextStep = sortedSteps[currentIndex + 1];

    const totalSteps = flow.steps.length;
    const completedAndSkipped = currentProgress.completedStepIds.length + skippedStepIds.length;
    const percentComplete = Math.round((completedAndSkipped / totalSteps) * 100);

    const updatedProgress: OnboardingProgress = {
      ...currentProgress,
      currentStepId: nextStep?.id ?? currentProgress.currentStepId,
      skippedStepIds,
      percentComplete: Math.min(percentComplete, 100),
      completedAt: !nextStep ? new Date() : undefined,
    };

    this.progress.set(key, updatedProgress);
    return updatedProgress;
  }

  /**
   * Go back to a specific step.
   */
  goToStep(userId: string, flowId: string, stepId: string): OnboardingProgress {
    const key = this.progressKey(userId, flowId);
    const currentProgress = this.progress.get(key);
    if (!currentProgress) throw new Error('No active progress found');

    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow "${flowId}" not found`);

    const targetStep = flow.steps.find(s => s.id === stepId);
    if (!targetStep) throw new Error(`Step "${stepId}" not found in flow`);

    const updatedProgress: OnboardingProgress = {
      ...currentProgress,
      currentStepId: stepId,
    };

    this.progress.set(key, updatedProgress);
    return updatedProgress;
  }

  /**
   * Reset a user's progress for a flow.
   */
  resetProgress(userId: string, flowId: string): boolean {
    return this.progress.delete(this.progressKey(userId, flowId));
  }

  /**
   * Get all in-progress flows for a user.
   */
  getUserFlows(userId: string): OnboardingProgress[] {
    const results: OnboardingProgress[] = [];
    for (const [key, prog] of this.progress) {
      if (key.startsWith(`${userId}:`)) {
        results.push(prog);
      }
    }
    return results;
  }

  /**
   * Check if a user has completed a specific flow.
   */
  isFlowComplete(userId: string, flowId: string): boolean {
    const progress = this.progress.get(this.progressKey(userId, flowId));
    return progress?.completedAt !== undefined;
  }

  /**
   * Resolve the next step based on branching conditions.
   */
  private resolveNextStep(
    flow: OnboardingFlow,
    currentStep: OnboardingStep,
    stepData?: Record<string, unknown>
  ): string | null {
    // Check for branch condition
    if (currentStep.branchCondition && stepData) {
      const { field, operator, value, nextStepId } = currentStep.branchCondition;
      const fieldValue = stepData[field];

      let conditionMet = false;
      switch (operator) {
        case 'eq': conditionMet = fieldValue === value; break;
        case 'neq': conditionMet = fieldValue !== value; break;
        case 'in': conditionMet = Array.isArray(value) && value.includes(fieldValue); break;
        case 'nin': conditionMet = Array.isArray(value) && !value.includes(fieldValue); break;
        case 'gt': conditionMet = typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value; break;
        case 'lt': conditionMet = typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value; break;
      }

      if (conditionMet) {
        return nextStepId;
      }
    }

    // Default: next step by order
    const sortedSteps = [...flow.steps].sort((a, b) => a.order - b.order);
    const currentIndex = sortedSteps.findIndex(s => s.id === currentStep.id);
    const nextStep = sortedSteps[currentIndex + 1];

    return nextStep?.id ?? null; // null means flow is complete
  }

  private progressKey(userId: string, flowId: string): string {
    return `${userId}:${flowId}`;
  }
}
