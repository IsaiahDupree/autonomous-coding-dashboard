/**
 * JOB-004: Meta Ad Publish Job Processor
 *
 * Manages the lifecycle of publishing ads to the Meta (Facebook/Instagram)
 * Ads platform: validation -> creative upload -> campaign creation -> publish.
 */
import { Job } from '../types';
import { JobQueue } from './queue';
export interface MetaAdPublishInput {
    accountId: string;
    campaignName: string;
    adSetName: string;
    creativeAssetUrl: string;
    targetAudience: {
        ageMin: number;
        ageMax: number;
        genders: ('male' | 'female' | 'all')[];
        locations: string[];
        interests: string[];
    };
    budget: {
        dailyBudget: number;
        currency: string;
    };
    schedule: {
        startDate: string;
        endDate?: string;
    };
}
export interface MetaAdPublishResult {
    campaignId: string;
    adSetId: string;
    adId: string;
    status: 'published' | 'pending_review';
    publishedAt: Date;
}
export declare class MetaAdPublishJobProcessor {
    private queue;
    constructor(queue?: JobQueue);
    submit(input: MetaAdPublishInput): Promise<Job>;
    getQueue(): JobQueue;
    private handle;
    private validateInput;
    private uploadCreative;
    private createCampaign;
    private createAdSet;
    private createAd;
}
