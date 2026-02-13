/**
 * FLOW-001: Content Approval Workflow
 *
 * Manages the review and approval process for content before
 * it can be published to any platform.
 */
import type { ApprovalRequest, ApprovalStatus } from '../types';
export declare class ContentApprovalWorkflow {
    private readonly requests;
    private nextId;
    /**
     * Submits content for approval review.
     */
    submit(input: {
        contentId: string;
        submittedBy: string;
        comments?: string;
    }): Promise<ApprovalRequest>;
    /**
     * Approves a pending content submission.
     */
    approve(id: string, reviewedBy: string, comments?: string): Promise<ApprovalRequest>;
    /**
     * Rejects a pending content submission.
     */
    reject(id: string, reviewedBy: string, comments?: string): Promise<ApprovalRequest>;
    /**
     * Requests revisions on a pending content submission.
     */
    requestRevision(id: string, reviewedBy: string, comments: string): Promise<ApprovalRequest>;
    /**
     * Gets the current status of an approval request.
     */
    getStatus(id: string): Promise<ApprovalStatus>;
    /**
     * Lists all pending approval requests.
     */
    listPending(): Promise<ApprovalRequest[]>;
    /**
     * Gets a specific approval request by ID.
     */
    get(id: string): Promise<ApprovalRequest>;
}
//# sourceMappingURL=approval.d.ts.map