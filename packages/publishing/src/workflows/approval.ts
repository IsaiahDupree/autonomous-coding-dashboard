/**
 * FLOW-001: Content Approval Workflow
 *
 * Manages the review and approval process for content before
 * it can be published to any platform.
 */

import type { ApprovalRequest, ApprovalStatus } from '../types';

export class ContentApprovalWorkflow {
  private readonly requests = new Map<string, ApprovalRequest>();
  private nextId = 1;

  /**
   * Submits content for approval review.
   */
  async submit(input: {
    contentId: string;
    submittedBy: string;
    comments?: string;
  }): Promise<ApprovalRequest> {
    const id = `approval-${this.nextId++}`;
    const request: ApprovalRequest = {
      id,
      contentId: input.contentId,
      submittedBy: input.submittedBy,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      comments: input.comments,
    };

    this.requests.set(id, request);
    return request;
  }

  /**
   * Approves a pending content submission.
   */
  async approve(id: string, reviewedBy: string, comments?: string): Promise<ApprovalRequest> {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error(`Approval request not found: ${id}`);
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request in status: ${request.status}`);
    }

    request.status = 'approved';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    if (comments) {
      request.comments = comments;
    }

    return request;
  }

  /**
   * Rejects a pending content submission.
   */
  async reject(id: string, reviewedBy: string, comments?: string): Promise<ApprovalRequest> {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error(`Approval request not found: ${id}`);
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot reject request in status: ${request.status}`);
    }

    request.status = 'rejected';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    if (comments) {
      request.comments = comments;
    }

    return request;
  }

  /**
   * Requests revisions on a pending content submission.
   */
  async requestRevision(id: string, reviewedBy: string, comments: string): Promise<ApprovalRequest> {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error(`Approval request not found: ${id}`);
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot request revision for request in status: ${request.status}`);
    }

    request.status = 'revision_requested';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    request.comments = comments;

    return request;
  }

  /**
   * Gets the current status of an approval request.
   */
  async getStatus(id: string): Promise<ApprovalStatus> {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error(`Approval request not found: ${id}`);
    }
    return request.status;
  }

  /**
   * Lists all pending approval requests.
   */
  async listPending(): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === 'pending',
    );
  }

  /**
   * Gets a specific approval request by ID.
   */
  async get(id: string): Promise<ApprovalRequest> {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error(`Approval request not found: ${id}`);
    }
    return request;
  }
}
