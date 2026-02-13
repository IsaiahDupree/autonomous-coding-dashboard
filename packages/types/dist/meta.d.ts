import { z } from "zod";
/**
 * Campaign objective (Meta Marketing API objectives).
 */
export declare const CampaignObjectiveSchema: z.ZodEnum<["OUTCOME_AWARENESS", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_TRAFFIC", "OUTCOME_APP_PROMOTION"]>;
export type CampaignObjective = z.infer<typeof CampaignObjectiveSchema>;
/**
 * Campaign status.
 */
export declare const CampaignStatusSchema: z.ZodEnum<["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"]>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
/**
 * Campaign buying type.
 */
export declare const BuyingTypeSchema: z.ZodEnum<["AUCTION", "RESERVED"]>;
export type BuyingType = z.infer<typeof BuyingTypeSchema>;
/**
 * Budget type.
 */
export declare const BudgetTypeSchema: z.ZodEnum<["DAILY", "LIFETIME"]>;
export type BudgetType = z.infer<typeof BudgetTypeSchema>;
/**
 * Campaign - A Meta advertising campaign.
 */
export declare const CampaignSchema: z.ZodObject<{
    /** Unique campaign identifier (UUID v4 in ACD, maps to Meta campaign ID). */
    id: z.ZodString;
    /** Meta campaign ID. */
    metaCampaignId: z.ZodString;
    /** Meta Ad Account ID. */
    adAccountId: z.ZodString;
    /** Campaign name. */
    name: z.ZodString;
    /** Campaign objective. */
    objective: z.ZodEnum<["OUTCOME_AWARENESS", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_TRAFFIC", "OUTCOME_APP_PROMOTION"]>;
    /** Campaign status. */
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"]>>;
    /** Effective status (computed by Meta). */
    effectiveStatus: z.ZodOptional<z.ZodString>;
    /** Buying type. */
    buyingType: z.ZodDefault<z.ZodEnum<["AUCTION", "RESERVED"]>>;
    /** Budget type. */
    budgetType: z.ZodOptional<z.ZodEnum<["DAILY", "LIFETIME"]>>;
    /** Daily budget in cents. */
    dailyBudgetCents: z.ZodOptional<z.ZodNumber>;
    /** Lifetime budget in cents. */
    lifetimeBudgetCents: z.ZodOptional<z.ZodNumber>;
    /** Spend cap in cents. */
    spendCapCents: z.ZodOptional<z.ZodNumber>;
    /** Bid strategy. */
    bidStrategy: z.ZodOptional<z.ZodEnum<["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"]>>;
    /** Campaign budget optimization enabled. */
    cboEnabled: z.ZodDefault<z.ZodBoolean>;
    /** Special ad categories. */
    specialAdCategories: z.ZodDefault<z.ZodArray<z.ZodEnum<["CREDIT", "EMPLOYMENT", "HOUSING", "SOCIAL_ISSUES_ELECTIONS_POLITICS", "NONE"]>, "many">>;
    /** ISO 8601 start time. */
    startTime: z.ZodOptional<z.ZodString>;
    /** ISO 8601 end time. */
    endTime: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    metaCampaignId: string;
    adAccountId: string;
    objective: "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT" | "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_TRAFFIC" | "OUTCOME_APP_PROMOTION";
    buyingType: "AUCTION" | "RESERVED";
    cboEnabled: boolean;
    specialAdCategories: ("CREDIT" | "EMPLOYMENT" | "HOUSING" | "SOCIAL_ISSUES_ELECTIONS_POLITICS" | "NONE")[];
    effectiveStatus?: string | undefined;
    budgetType?: "DAILY" | "LIFETIME" | undefined;
    dailyBudgetCents?: number | undefined;
    lifetimeBudgetCents?: number | undefined;
    spendCapCents?: number | undefined;
    bidStrategy?: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP" | "MINIMUM_ROAS" | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    metaCampaignId: string;
    adAccountId: string;
    objective: "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT" | "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_TRAFFIC" | "OUTCOME_APP_PROMOTION";
    status?: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | undefined;
    effectiveStatus?: string | undefined;
    buyingType?: "AUCTION" | "RESERVED" | undefined;
    budgetType?: "DAILY" | "LIFETIME" | undefined;
    dailyBudgetCents?: number | undefined;
    lifetimeBudgetCents?: number | undefined;
    spendCapCents?: number | undefined;
    bidStrategy?: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP" | "MINIMUM_ROAS" | undefined;
    cboEnabled?: boolean | undefined;
    specialAdCategories?: ("CREDIT" | "EMPLOYMENT" | "HOUSING" | "SOCIAL_ISSUES_ELECTIONS_POLITICS" | "NONE")[] | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
}>;
export type Campaign = z.infer<typeof CampaignSchema>;
/**
 * Optimization goal for ad delivery.
 */
export declare const OptimizationGoalSchema: z.ZodEnum<["REACH", "IMPRESSIONS", "LINK_CLICKS", "LANDING_PAGE_VIEWS", "LEAD_GENERATION", "CONVERSIONS", "VALUE", "APP_INSTALLS", "OFFSITE_CONVERSIONS", "POST_ENGAGEMENT", "VIDEO_VIEWS", "THRUPLAY"]>;
export type OptimizationGoal = z.infer<typeof OptimizationGoalSchema>;
/**
 * Billing event.
 */
export declare const BillingEventSchema: z.ZodEnum<["IMPRESSIONS", "LINK_CLICKS", "THRUPLAY"]>;
export type BillingEvent = z.infer<typeof BillingEventSchema>;
/**
 * Targeting specification (simplified).
 */
export declare const TargetingSchema: z.ZodObject<{
    /** Age minimum (13-65). */
    ageMin: z.ZodOptional<z.ZodNumber>;
    /** Age maximum (13-65). */
    ageMax: z.ZodOptional<z.ZodNumber>;
    /** Genders (1=male, 2=female). */
    genders: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Geographic locations. */
    geoLocations: z.ZodOptional<z.ZodObject<{
        countries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        regions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            key: string;
        }, {
            key: string;
        }>, "many">>;
        cities: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            radius: z.ZodOptional<z.ZodNumber>;
            distanceUnit: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }, {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }>, "many">>;
        zips: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            key: string;
        }, {
            key: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
        cities?: {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }[] | undefined;
        zips?: {
            key: string;
        }[] | undefined;
    }, {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
        cities?: {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }[] | undefined;
        zips?: {
            key: string;
        }[] | undefined;
    }>>;
    /** Excluded geographic locations. */
    excludedGeoLocations: z.ZodOptional<z.ZodObject<{
        countries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        regions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            key: string;
        }, {
            key: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
    }, {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
    }>>;
    /** Locales (language targeting). */
    locales: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Interest targeting. */
    interests: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">>;
    /** Behavior targeting. */
    behaviors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">>;
    /** Custom audiences (IDs). */
    customAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>, "many">>;
    /** Excluded custom audiences. */
    excludedCustomAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>, "many">>;
    /** Lookalike audiences. */
    lookalikeAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>, "many">>;
    /** Publisher platforms. */
    publisherPlatforms: z.ZodOptional<z.ZodArray<z.ZodEnum<["facebook", "instagram", "audience_network", "messenger"]>, "many">>;
    /** Facebook positions. */
    facebookPositions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Instagram positions. */
    instagramPositions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Device platforms. */
    devicePlatforms: z.ZodOptional<z.ZodArray<z.ZodEnum<["mobile", "desktop"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    ageMin?: number | undefined;
    ageMax?: number | undefined;
    genders?: number[] | undefined;
    geoLocations?: {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
        cities?: {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }[] | undefined;
        zips?: {
            key: string;
        }[] | undefined;
    } | undefined;
    excludedGeoLocations?: {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
    } | undefined;
    locales?: number[] | undefined;
    interests?: {
        id: string;
        name: string;
    }[] | undefined;
    behaviors?: {
        id: string;
        name: string;
    }[] | undefined;
    customAudiences?: {
        id: string;
    }[] | undefined;
    excludedCustomAudiences?: {
        id: string;
    }[] | undefined;
    lookalikeAudiences?: {
        id: string;
    }[] | undefined;
    publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
    facebookPositions?: string[] | undefined;
    instagramPositions?: string[] | undefined;
    devicePlatforms?: ("desktop" | "mobile")[] | undefined;
}, {
    ageMin?: number | undefined;
    ageMax?: number | undefined;
    genders?: number[] | undefined;
    geoLocations?: {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
        cities?: {
            key: string;
            radius?: number | undefined;
            distanceUnit?: string | undefined;
        }[] | undefined;
        zips?: {
            key: string;
        }[] | undefined;
    } | undefined;
    excludedGeoLocations?: {
        countries?: string[] | undefined;
        regions?: {
            key: string;
        }[] | undefined;
    } | undefined;
    locales?: number[] | undefined;
    interests?: {
        id: string;
        name: string;
    }[] | undefined;
    behaviors?: {
        id: string;
        name: string;
    }[] | undefined;
    customAudiences?: {
        id: string;
    }[] | undefined;
    excludedCustomAudiences?: {
        id: string;
    }[] | undefined;
    lookalikeAudiences?: {
        id: string;
    }[] | undefined;
    publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
    facebookPositions?: string[] | undefined;
    instagramPositions?: string[] | undefined;
    devicePlatforms?: ("desktop" | "mobile")[] | undefined;
}>;
export type Targeting = z.infer<typeof TargetingSchema>;
/**
 * AdSet - A Meta ad set within a campaign.
 */
export declare const AdSetSchema: z.ZodObject<{
    /** Unique ad set identifier (UUID v4). */
    id: z.ZodString;
    /** Meta ad set ID. */
    metaAdSetId: z.ZodString;
    /** Parent campaign ID (ACD UUID). */
    campaignId: z.ZodString;
    /** Meta campaign ID. */
    metaCampaignId: z.ZodString;
    /** Ad Account ID. */
    adAccountId: z.ZodString;
    /** Ad set name. */
    name: z.ZodString;
    /** Ad set status. */
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"]>>;
    /** Effective status. */
    effectiveStatus: z.ZodOptional<z.ZodString>;
    /** Optimization goal. */
    optimizationGoal: z.ZodEnum<["REACH", "IMPRESSIONS", "LINK_CLICKS", "LANDING_PAGE_VIEWS", "LEAD_GENERATION", "CONVERSIONS", "VALUE", "APP_INSTALLS", "OFFSITE_CONVERSIONS", "POST_ENGAGEMENT", "VIDEO_VIEWS", "THRUPLAY"]>;
    /** Billing event. */
    billingEvent: z.ZodDefault<z.ZodEnum<["IMPRESSIONS", "LINK_CLICKS", "THRUPLAY"]>>;
    /** Daily budget in cents. */
    dailyBudgetCents: z.ZodOptional<z.ZodNumber>;
    /** Lifetime budget in cents. */
    lifetimeBudgetCents: z.ZodOptional<z.ZodNumber>;
    /** Bid amount in cents. */
    bidAmountCents: z.ZodOptional<z.ZodNumber>;
    /** Targeting specification. */
    targeting: z.ZodOptional<z.ZodObject<{
        /** Age minimum (13-65). */
        ageMin: z.ZodOptional<z.ZodNumber>;
        /** Age maximum (13-65). */
        ageMax: z.ZodOptional<z.ZodNumber>;
        /** Genders (1=male, 2=female). */
        genders: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        /** Geographic locations. */
        geoLocations: z.ZodOptional<z.ZodObject<{
            countries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            regions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                key: string;
            }, {
                key: string;
            }>, "many">>;
            cities: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
                radius: z.ZodOptional<z.ZodNumber>;
                distanceUnit: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }, {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }>, "many">>;
            zips: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                key: string;
            }, {
                key: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        }, {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        }>>;
        /** Excluded geographic locations. */
        excludedGeoLocations: z.ZodOptional<z.ZodObject<{
            countries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            regions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                key: string;
            }, {
                key: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        }, {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        }>>;
        /** Locales (language targeting). */
        locales: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        /** Interest targeting. */
        interests: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>, "many">>;
        /** Behavior targeting. */
        behaviors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>, "many">>;
        /** Custom audiences (IDs). */
        customAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>, "many">>;
        /** Excluded custom audiences. */
        excludedCustomAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>, "many">>;
        /** Lookalike audiences. */
        lookalikeAudiences: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>, "many">>;
        /** Publisher platforms. */
        publisherPlatforms: z.ZodOptional<z.ZodArray<z.ZodEnum<["facebook", "instagram", "audience_network", "messenger"]>, "many">>;
        /** Facebook positions. */
        facebookPositions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Instagram positions. */
        instagramPositions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Device platforms. */
        devicePlatforms: z.ZodOptional<z.ZodArray<z.ZodEnum<["mobile", "desktop"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        ageMin?: number | undefined;
        ageMax?: number | undefined;
        genders?: number[] | undefined;
        geoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        } | undefined;
        excludedGeoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        } | undefined;
        locales?: number[] | undefined;
        interests?: {
            id: string;
            name: string;
        }[] | undefined;
        behaviors?: {
            id: string;
            name: string;
        }[] | undefined;
        customAudiences?: {
            id: string;
        }[] | undefined;
        excludedCustomAudiences?: {
            id: string;
        }[] | undefined;
        lookalikeAudiences?: {
            id: string;
        }[] | undefined;
        publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
        facebookPositions?: string[] | undefined;
        instagramPositions?: string[] | undefined;
        devicePlatforms?: ("desktop" | "mobile")[] | undefined;
    }, {
        ageMin?: number | undefined;
        ageMax?: number | undefined;
        genders?: number[] | undefined;
        geoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        } | undefined;
        excludedGeoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        } | undefined;
        locales?: number[] | undefined;
        interests?: {
            id: string;
            name: string;
        }[] | undefined;
        behaviors?: {
            id: string;
            name: string;
        }[] | undefined;
        customAudiences?: {
            id: string;
        }[] | undefined;
        excludedCustomAudiences?: {
            id: string;
        }[] | undefined;
        lookalikeAudiences?: {
            id: string;
        }[] | undefined;
        publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
        facebookPositions?: string[] | undefined;
        instagramPositions?: string[] | undefined;
        devicePlatforms?: ("desktop" | "mobile")[] | undefined;
    }>>;
    /** Conversion event (pixel event name). */
    conversionEvent: z.ZodOptional<z.ZodString>;
    /** Meta Pixel ID for conversion tracking. */
    pixelId: z.ZodOptional<z.ZodString>;
    /** Attribution window. */
    attributionSpec: z.ZodOptional<z.ZodArray<z.ZodObject<{
        eventType: z.ZodString;
        window: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        eventType: string;
        window: string;
    }, {
        eventType: string;
        window: string;
    }>, "many">>;
    /** Schedule start time (ISO 8601). */
    startTime: z.ZodOptional<z.ZodString>;
    /** Schedule end time (ISO 8601). */
    endTime: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    metaCampaignId: string;
    adAccountId: string;
    metaAdSetId: string;
    campaignId: string;
    optimizationGoal: "REACH" | "IMPRESSIONS" | "LINK_CLICKS" | "LANDING_PAGE_VIEWS" | "LEAD_GENERATION" | "CONVERSIONS" | "VALUE" | "APP_INSTALLS" | "OFFSITE_CONVERSIONS" | "POST_ENGAGEMENT" | "VIDEO_VIEWS" | "THRUPLAY";
    billingEvent: "IMPRESSIONS" | "LINK_CLICKS" | "THRUPLAY";
    effectiveStatus?: string | undefined;
    dailyBudgetCents?: number | undefined;
    lifetimeBudgetCents?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    bidAmountCents?: number | undefined;
    targeting?: {
        ageMin?: number | undefined;
        ageMax?: number | undefined;
        genders?: number[] | undefined;
        geoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        } | undefined;
        excludedGeoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        } | undefined;
        locales?: number[] | undefined;
        interests?: {
            id: string;
            name: string;
        }[] | undefined;
        behaviors?: {
            id: string;
            name: string;
        }[] | undefined;
        customAudiences?: {
            id: string;
        }[] | undefined;
        excludedCustomAudiences?: {
            id: string;
        }[] | undefined;
        lookalikeAudiences?: {
            id: string;
        }[] | undefined;
        publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
        facebookPositions?: string[] | undefined;
        instagramPositions?: string[] | undefined;
        devicePlatforms?: ("desktop" | "mobile")[] | undefined;
    } | undefined;
    conversionEvent?: string | undefined;
    pixelId?: string | undefined;
    attributionSpec?: {
        eventType: string;
        window: string;
    }[] | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    metaCampaignId: string;
    adAccountId: string;
    metaAdSetId: string;
    campaignId: string;
    optimizationGoal: "REACH" | "IMPRESSIONS" | "LINK_CLICKS" | "LANDING_PAGE_VIEWS" | "LEAD_GENERATION" | "CONVERSIONS" | "VALUE" | "APP_INSTALLS" | "OFFSITE_CONVERSIONS" | "POST_ENGAGEMENT" | "VIDEO_VIEWS" | "THRUPLAY";
    status?: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | undefined;
    effectiveStatus?: string | undefined;
    dailyBudgetCents?: number | undefined;
    lifetimeBudgetCents?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    billingEvent?: "IMPRESSIONS" | "LINK_CLICKS" | "THRUPLAY" | undefined;
    bidAmountCents?: number | undefined;
    targeting?: {
        ageMin?: number | undefined;
        ageMax?: number | undefined;
        genders?: number[] | undefined;
        geoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
            cities?: {
                key: string;
                radius?: number | undefined;
                distanceUnit?: string | undefined;
            }[] | undefined;
            zips?: {
                key: string;
            }[] | undefined;
        } | undefined;
        excludedGeoLocations?: {
            countries?: string[] | undefined;
            regions?: {
                key: string;
            }[] | undefined;
        } | undefined;
        locales?: number[] | undefined;
        interests?: {
            id: string;
            name: string;
        }[] | undefined;
        behaviors?: {
            id: string;
            name: string;
        }[] | undefined;
        customAudiences?: {
            id: string;
        }[] | undefined;
        excludedCustomAudiences?: {
            id: string;
        }[] | undefined;
        lookalikeAudiences?: {
            id: string;
        }[] | undefined;
        publisherPlatforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[] | undefined;
        facebookPositions?: string[] | undefined;
        instagramPositions?: string[] | undefined;
        devicePlatforms?: ("desktop" | "mobile")[] | undefined;
    } | undefined;
    conversionEvent?: string | undefined;
    pixelId?: string | undefined;
    attributionSpec?: {
        eventType: string;
        window: string;
    }[] | undefined;
}>;
export type AdSet = z.infer<typeof AdSetSchema>;
/**
 * Creative format.
 */
export declare const CreativeFormatSchema: z.ZodEnum<["SINGLE_IMAGE", "SINGLE_VIDEO", "CAROUSEL", "COLLECTION", "INSTANT_EXPERIENCE", "DYNAMIC"]>;
export type CreativeFormat = z.infer<typeof CreativeFormatSchema>;
/**
 * Call to action type.
 */
export declare const CallToActionSchema: z.ZodEnum<["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "CONTACT_US", "DOWNLOAD", "GET_OFFER", "BOOK_NOW", "APPLY_NOW", "WATCH_MORE", "GET_QUOTE", "NO_BUTTON"]>;
export type CallToAction = z.infer<typeof CallToActionSchema>;
/**
 * AdCreative - Creative content for an ad.
 */
export declare const AdCreativeSchema: z.ZodObject<{
    /** Unique creative identifier (UUID v4). */
    id: z.ZodString;
    /** Meta creative ID. */
    metaCreativeId: z.ZodOptional<z.ZodString>;
    /** Ad Account ID. */
    adAccountId: z.ZodString;
    /** Creative name. */
    name: z.ZodString;
    /** Creative format. */
    format: z.ZodEnum<["SINGLE_IMAGE", "SINGLE_VIDEO", "CAROUSEL", "COLLECTION", "INSTANT_EXPERIENCE", "DYNAMIC"]>;
    /** Primary text (body copy). */
    primaryText: z.ZodOptional<z.ZodString>;
    /** Headline. */
    headline: z.ZodOptional<z.ZodString>;
    /** Description / link description. */
    description: z.ZodOptional<z.ZodString>;
    /** Call to action. */
    callToAction: z.ZodOptional<z.ZodEnum<["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "CONTACT_US", "DOWNLOAD", "GET_OFFER", "BOOK_NOW", "APPLY_NOW", "WATCH_MORE", "GET_QUOTE", "NO_BUTTON"]>>;
    /** Destination URL. */
    linkUrl: z.ZodOptional<z.ZodString>;
    /** Display link (vanity URL shown in ad). */
    displayLink: z.ZodOptional<z.ZodString>;
    /** Image URL. */
    imageUrl: z.ZodOptional<z.ZodString>;
    /** Image hash (Meta image hash). */
    imageHash: z.ZodOptional<z.ZodString>;
    /** Video URL. */
    videoUrl: z.ZodOptional<z.ZodString>;
    /** Video ID (Meta video ID). */
    videoId: z.ZodOptional<z.ZodString>;
    /** Thumbnail URL for video. */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** Carousel cards. */
    carouselCards: z.ZodOptional<z.ZodArray<z.ZodObject<{
        headline: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        imageHash: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        videoId: z.ZodOptional<z.ZodString>;
        linkUrl: z.ZodOptional<z.ZodString>;
        callToAction: z.ZodOptional<z.ZodEnum<["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "CONTACT_US", "DOWNLOAD", "GET_OFFER", "BOOK_NOW", "APPLY_NOW", "WATCH_MORE", "GET_QUOTE", "NO_BUTTON"]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        headline?: string | undefined;
        callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
        linkUrl?: string | undefined;
        imageUrl?: string | undefined;
        imageHash?: string | undefined;
        videoUrl?: string | undefined;
        videoId?: string | undefined;
    }, {
        description?: string | undefined;
        headline?: string | undefined;
        callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
        linkUrl?: string | undefined;
        imageUrl?: string | undefined;
        imageHash?: string | undefined;
        videoUrl?: string | undefined;
        videoId?: string | undefined;
    }>, "many">>;
    /** URL tags for tracking. */
    urlTags: z.ZodOptional<z.ZodString>;
    /** Instagram account ID. */
    instagramAccountId: z.ZodOptional<z.ZodString>;
    /** Facebook page ID. */
    pageId: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    adAccountId: string;
    format: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "COLLECTION" | "INSTANT_EXPERIENCE" | "DYNAMIC";
    description?: string | undefined;
    thumbnailUrl?: string | undefined;
    metaCreativeId?: string | undefined;
    primaryText?: string | undefined;
    headline?: string | undefined;
    callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
    linkUrl?: string | undefined;
    displayLink?: string | undefined;
    imageUrl?: string | undefined;
    imageHash?: string | undefined;
    videoUrl?: string | undefined;
    videoId?: string | undefined;
    carouselCards?: {
        description?: string | undefined;
        headline?: string | undefined;
        callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
        linkUrl?: string | undefined;
        imageUrl?: string | undefined;
        imageHash?: string | undefined;
        videoUrl?: string | undefined;
        videoId?: string | undefined;
    }[] | undefined;
    urlTags?: string | undefined;
    instagramAccountId?: string | undefined;
    pageId?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    adAccountId: string;
    format: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "COLLECTION" | "INSTANT_EXPERIENCE" | "DYNAMIC";
    description?: string | undefined;
    thumbnailUrl?: string | undefined;
    metaCreativeId?: string | undefined;
    primaryText?: string | undefined;
    headline?: string | undefined;
    callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
    linkUrl?: string | undefined;
    displayLink?: string | undefined;
    imageUrl?: string | undefined;
    imageHash?: string | undefined;
    videoUrl?: string | undefined;
    videoId?: string | undefined;
    carouselCards?: {
        description?: string | undefined;
        headline?: string | undefined;
        callToAction?: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US" | "DOWNLOAD" | "GET_OFFER" | "BOOK_NOW" | "APPLY_NOW" | "WATCH_MORE" | "GET_QUOTE" | "NO_BUTTON" | undefined;
        linkUrl?: string | undefined;
        imageUrl?: string | undefined;
        imageHash?: string | undefined;
        videoUrl?: string | undefined;
        videoId?: string | undefined;
    }[] | undefined;
    urlTags?: string | undefined;
    instagramAccountId?: string | undefined;
    pageId?: string | undefined;
}>;
export type AdCreative = z.infer<typeof AdCreativeSchema>;
/**
 * Ad - An individual Meta ad within an ad set.
 */
export declare const AdSchema: z.ZodObject<{
    /** Unique ad identifier (UUID v4). */
    id: z.ZodString;
    /** Meta ad ID. */
    metaAdId: z.ZodString;
    /** Parent ad set ID (ACD UUID). */
    adSetId: z.ZodString;
    /** Meta ad set ID. */
    metaAdSetId: z.ZodString;
    /** Parent campaign ID (ACD UUID). */
    campaignId: z.ZodString;
    /** Ad Account ID. */
    adAccountId: z.ZodString;
    /** Ad name. */
    name: z.ZodString;
    /** Ad status. */
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"]>>;
    /** Effective status. */
    effectiveStatus: z.ZodOptional<z.ZodString>;
    /** Creative ID (ACD UUID). */
    creativeId: z.ZodString;
    /** Meta creative ID. */
    metaCreativeId: z.ZodOptional<z.ZodString>;
    /** Tracking specs. */
    trackingSpecs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Conversion tracking Pixel ID. */
    pixelId: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    adAccountId: string;
    metaAdSetId: string;
    campaignId: string;
    metaAdId: string;
    adSetId: string;
    creativeId: string;
    effectiveStatus?: string | undefined;
    pixelId?: string | undefined;
    metaCreativeId?: string | undefined;
    trackingSpecs?: Record<string, unknown> | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    adAccountId: string;
    metaAdSetId: string;
    campaignId: string;
    metaAdId: string;
    adSetId: string;
    creativeId: string;
    status?: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | undefined;
    effectiveStatus?: string | undefined;
    pixelId?: string | undefined;
    metaCreativeId?: string | undefined;
    trackingSpecs?: Record<string, unknown> | undefined;
}>;
export type Ad = z.infer<typeof AdSchema>;
/**
 * Insight - Performance metrics for a campaign, ad set, or ad.
 */
export declare const InsightSchema: z.ZodObject<{
    /** Unique insight record identifier (UUID v4). */
    id: z.ZodString;
    /** The entity this insight belongs to. */
    entityId: z.ZodString;
    /** Entity type. */
    entityType: z.ZodEnum<["campaign", "adset", "ad", "account"]>;
    /** Ad Account ID. */
    adAccountId: z.ZodString;
    /** Date range start (YYYY-MM-DD). */
    dateStart: z.ZodString;
    /** Date range end (YYYY-MM-DD). */
    dateEnd: z.ZodString;
    /** Number of impressions. */
    impressions: z.ZodDefault<z.ZodNumber>;
    /** Reach (unique people). */
    reach: z.ZodDefault<z.ZodNumber>;
    /** Frequency (avg impressions per person). */
    frequency: z.ZodDefault<z.ZodNumber>;
    /** Number of link clicks. */
    clicks: z.ZodDefault<z.ZodNumber>;
    /** Unique link clicks. */
    uniqueClicks: z.ZodDefault<z.ZodNumber>;
    /** Click-through rate (%). */
    ctr: z.ZodDefault<z.ZodNumber>;
    /** Cost per click in cents. */
    cpcCents: z.ZodDefault<z.ZodNumber>;
    /** Cost per mille (1000 impressions) in cents. */
    cpmCents: z.ZodDefault<z.ZodNumber>;
    /** Total spend in cents. */
    spendCents: z.ZodDefault<z.ZodNumber>;
    /** Number of conversions. */
    conversions: z.ZodDefault<z.ZodNumber>;
    /** Conversion value in cents. */
    conversionValueCents: z.ZodDefault<z.ZodNumber>;
    /** Cost per conversion in cents. */
    costPerConversionCents: z.ZodDefault<z.ZodNumber>;
    /** Return on ad spend. */
    roas: z.ZodDefault<z.ZodNumber>;
    /** Video views (3-second). */
    videoViews: z.ZodOptional<z.ZodNumber>;
    /** ThruPlay (15-second or complete views). */
    thruplay: z.ZodOptional<z.ZodNumber>;
    /** Video average watch time in seconds. */
    videoAvgWatchTimeSec: z.ZodOptional<z.ZodNumber>;
    /** Leads generated. */
    leads: z.ZodOptional<z.ZodNumber>;
    /** Cost per lead in cents. */
    costPerLeadCents: z.ZodOptional<z.ZodNumber>;
    /** Post engagement (reactions, comments, shares). */
    postEngagement: z.ZodOptional<z.ZodNumber>;
    /** Page likes. */
    pageLikes: z.ZodOptional<z.ZodNumber>;
    /** Breakdown dimensions. */
    breakdowns: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** ISO 8601 timestamp of when this insight was fetched. */
    fetchedAt: z.ZodString;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    adAccountId: string;
    entityId: string;
    entityType: "campaign" | "adset" | "ad" | "account";
    dateStart: string;
    dateEnd: string;
    impressions: number;
    reach: number;
    frequency: number;
    clicks: number;
    uniqueClicks: number;
    ctr: number;
    cpcCents: number;
    cpmCents: number;
    spendCents: number;
    conversions: number;
    conversionValueCents: number;
    costPerConversionCents: number;
    roas: number;
    fetchedAt: string;
    videoViews?: number | undefined;
    thruplay?: number | undefined;
    videoAvgWatchTimeSec?: number | undefined;
    leads?: number | undefined;
    costPerLeadCents?: number | undefined;
    postEngagement?: number | undefined;
    pageLikes?: number | undefined;
    breakdowns?: Record<string, string> | undefined;
}, {
    id: string;
    createdAt: string;
    adAccountId: string;
    entityId: string;
    entityType: "campaign" | "adset" | "ad" | "account";
    dateStart: string;
    dateEnd: string;
    fetchedAt: string;
    impressions?: number | undefined;
    reach?: number | undefined;
    frequency?: number | undefined;
    clicks?: number | undefined;
    uniqueClicks?: number | undefined;
    ctr?: number | undefined;
    cpcCents?: number | undefined;
    cpmCents?: number | undefined;
    spendCents?: number | undefined;
    conversions?: number | undefined;
    conversionValueCents?: number | undefined;
    costPerConversionCents?: number | undefined;
    roas?: number | undefined;
    videoViews?: number | undefined;
    thruplay?: number | undefined;
    videoAvgWatchTimeSec?: number | undefined;
    leads?: number | undefined;
    costPerLeadCents?: number | undefined;
    postEngagement?: number | undefined;
    pageLikes?: number | undefined;
    breakdowns?: Record<string, string> | undefined;
}>;
export type Insight = z.infer<typeof InsightSchema>;
/**
 * Standard Meta Pixel events.
 */
export declare const StandardPixelEventSchema: z.ZodEnum<["PageView", "ViewContent", "Search", "AddToCart", "AddToWishlist", "InitiateCheckout", "AddPaymentInfo", "Purchase", "Lead", "CompleteRegistration", "Contact", "CustomizeProduct", "Donate", "FindLocation", "Schedule", "StartTrial", "SubmitApplication", "Subscribe"]>;
export type StandardPixelEvent = z.infer<typeof StandardPixelEventSchema>;
/**
 * PixelEvent - A Meta Pixel event tracked in the browser.
 */
export declare const PixelEventSchema: z.ZodObject<{
    /** Unique event identifier (UUID v4). */
    id: z.ZodString;
    /** Meta Pixel ID. */
    pixelId: z.ZodString;
    /** Event name (standard or custom). */
    eventName: z.ZodString;
    /** Whether this is a standard event. */
    isStandard: z.ZodDefault<z.ZodBoolean>;
    /** Event parameters. */
    parameters: z.ZodOptional<z.ZodObject<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        numItems: z.ZodOptional<z.ZodNumber>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        numItems: z.ZodOptional<z.ZodNumber>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        numItems: z.ZodOptional<z.ZodNumber>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
    /** User data for advanced matching. */
    userData: z.ZodOptional<z.ZodObject<{
        em: z.ZodOptional<z.ZodString>;
        ph: z.ZodOptional<z.ZodString>;
        fn: z.ZodOptional<z.ZodString>;
        ln: z.ZodOptional<z.ZodString>;
        ge: z.ZodOptional<z.ZodString>;
        db: z.ZodOptional<z.ZodString>;
        ct: z.ZodOptional<z.ZodString>;
        st: z.ZodOptional<z.ZodString>;
        zp: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        externalId: z.ZodOptional<z.ZodString>;
        fbp: z.ZodOptional<z.ZodString>;
        fbc: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        country?: string | undefined;
        em?: string | undefined;
        ph?: string | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        externalId?: string | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
    }, {
        country?: string | undefined;
        em?: string | undefined;
        ph?: string | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        externalId?: string | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
    }>>;
    /** Page URL where event fired. */
    sourceUrl: z.ZodOptional<z.ZodString>;
    /** Event source (browser, server, app). */
    eventSource: z.ZodDefault<z.ZodEnum<["website", "app", "physical_store", "system_generated", "other"]>>;
    /** ISO 8601 timestamp of when the event occurred. */
    eventTime: z.ZodString;
    /** ISO 8601 timestamp of creation in ACD. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    pixelId: string;
    eventName: string;
    isStandard: boolean;
    eventSource: "other" | "website" | "app" | "physical_store" | "system_generated";
    eventTime: string;
    parameters?: z.objectOutputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        numItems: z.ZodOptional<z.ZodNumber>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    userData?: {
        country?: string | undefined;
        em?: string | undefined;
        ph?: string | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        externalId?: string | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
    } | undefined;
    sourceUrl?: string | undefined;
}, {
    id: string;
    createdAt: string;
    pixelId: string;
    eventName: string;
    eventTime: string;
    isStandard?: boolean | undefined;
    parameters?: z.objectInputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        numItems: z.ZodOptional<z.ZodNumber>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    userData?: {
        country?: string | undefined;
        em?: string | undefined;
        ph?: string | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        externalId?: string | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
    } | undefined;
    sourceUrl?: string | undefined;
    eventSource?: "other" | "website" | "app" | "physical_store" | "system_generated" | undefined;
}>;
export type PixelEvent = z.infer<typeof PixelEventSchema>;
/**
 * CAPI action source.
 */
export declare const CAPIActionSourceSchema: z.ZodEnum<["website", "app", "phone_call", "chat", "email", "physical_store", "system_generated", "other"]>;
export type CAPIActionSource = z.infer<typeof CAPIActionSourceSchema>;
/**
 * CAPIEvent - A server-side Conversions API event sent to Meta.
 */
export declare const CAPIEventSchema: z.ZodObject<{
    /** Unique event identifier (UUID v4). */
    id: z.ZodString;
    /** Meta Pixel ID / dataset ID. */
    pixelId: z.ZodString;
    /** Event name (standard or custom). */
    eventName: z.ZodString;
    /** Unix timestamp of the event. */
    eventTime: z.ZodNumber;
    /** ISO 8601 timestamp of the event. */
    eventTimeIso: z.ZodString;
    /** Action source. */
    actionSource: z.ZodEnum<["website", "app", "phone_call", "chat", "email", "physical_store", "system_generated", "other"]>;
    /** Event source URL. */
    eventSourceUrl: z.ZodOptional<z.ZodString>;
    /** Event ID for deduplication with browser pixel. */
    eventId: z.ZodOptional<z.ZodString>;
    /** Whether this event has been deduplicated. */
    deduplicated: z.ZodDefault<z.ZodBoolean>;
    /** User data for matching. */
    userData: z.ZodObject<{
        /** Hashed emails. */
        em: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed phone numbers. */
        ph: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed first name. */
        fn: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed last name. */
        ln: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed date of birth. */
        db: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Gender. */
        ge: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed city. */
        ct: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed state. */
        st: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Hashed zip code. */
        zp: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Country code. */
        country: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** External ID. */
        externalId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Client IP address. */
        clientIpAddress: z.ZodOptional<z.ZodString>;
        /** Client user agent. */
        clientUserAgent: z.ZodOptional<z.ZodString>;
        /** Facebook click ID. */
        fbc: z.ZodOptional<z.ZodString>;
        /** Facebook browser ID. */
        fbp: z.ZodOptional<z.ZodString>;
        /** Subscription ID. */
        subscriptionId: z.ZodOptional<z.ZodString>;
        /** Lead ID. */
        leadId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        country?: string[] | undefined;
        em?: string[] | undefined;
        ph?: string[] | undefined;
        fn?: string[] | undefined;
        ln?: string[] | undefined;
        ge?: string[] | undefined;
        db?: string[] | undefined;
        ct?: string[] | undefined;
        st?: string[] | undefined;
        zp?: string[] | undefined;
        externalId?: string[] | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
        clientIpAddress?: string | undefined;
        clientUserAgent?: string | undefined;
        subscriptionId?: string | undefined;
        leadId?: string | undefined;
    }, {
        country?: string[] | undefined;
        em?: string[] | undefined;
        ph?: string[] | undefined;
        fn?: string[] | undefined;
        ln?: string[] | undefined;
        ge?: string[] | undefined;
        db?: string[] | undefined;
        ct?: string[] | undefined;
        st?: string[] | undefined;
        zp?: string[] | undefined;
        externalId?: string[] | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
        clientIpAddress?: string | undefined;
        clientUserAgent?: string | undefined;
        subscriptionId?: string | undefined;
        leadId?: string | undefined;
    }>;
    /** Custom data / event parameters. */
    customData: z.ZodOptional<z.ZodObject<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        contents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            quantity: z.ZodNumber;
            itemPrice: z.ZodOptional<z.ZodNumber>;
            deliveryCategory: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }>, "many">>;
        numItems: z.ZodOptional<z.ZodNumber>;
        orderId: z.ZodOptional<z.ZodString>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        predictedLtv: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        contents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            quantity: z.ZodNumber;
            itemPrice: z.ZodOptional<z.ZodNumber>;
            deliveryCategory: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }>, "many">>;
        numItems: z.ZodOptional<z.ZodNumber>;
        orderId: z.ZodOptional<z.ZodString>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        predictedLtv: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        contents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            quantity: z.ZodNumber;
            itemPrice: z.ZodOptional<z.ZodNumber>;
            deliveryCategory: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }>, "many">>;
        numItems: z.ZodOptional<z.ZodNumber>;
        orderId: z.ZodOptional<z.ZodString>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        predictedLtv: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>>;
    /** Data processing options. */
    dataProcessingOptions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Data processing options country. */
    dataProcessingOptionsCountry: z.ZodOptional<z.ZodNumber>;
    /** Data processing options state. */
    dataProcessingOptionsState: z.ZodOptional<z.ZodNumber>;
    /** Whether this event was successfully sent to Meta. */
    sentToMeta: z.ZodDefault<z.ZodBoolean>;
    /** Meta API response (for debugging). */
    metaResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Number of send attempts. */
    sendAttempts: z.ZodDefault<z.ZodNumber>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    pixelId: string;
    eventName: string;
    userData: {
        country?: string[] | undefined;
        em?: string[] | undefined;
        ph?: string[] | undefined;
        fn?: string[] | undefined;
        ln?: string[] | undefined;
        ge?: string[] | undefined;
        db?: string[] | undefined;
        ct?: string[] | undefined;
        st?: string[] | undefined;
        zp?: string[] | undefined;
        externalId?: string[] | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
        clientIpAddress?: string | undefined;
        clientUserAgent?: string | undefined;
        subscriptionId?: string | undefined;
        leadId?: string | undefined;
    };
    eventTime: number;
    eventTimeIso: string;
    actionSource: "other" | "email" | "website" | "app" | "physical_store" | "system_generated" | "phone_call" | "chat";
    deduplicated: boolean;
    sentToMeta: boolean;
    sendAttempts: number;
    eventSourceUrl?: string | undefined;
    eventId?: string | undefined;
    customData?: z.objectOutputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        contents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            quantity: z.ZodNumber;
            itemPrice: z.ZodOptional<z.ZodNumber>;
            deliveryCategory: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }>, "many">>;
        numItems: z.ZodOptional<z.ZodNumber>;
        orderId: z.ZodOptional<z.ZodString>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        predictedLtv: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    dataProcessingOptions?: string[] | undefined;
    dataProcessingOptionsCountry?: number | undefined;
    dataProcessingOptionsState?: number | undefined;
    metaResponse?: Record<string, unknown> | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    pixelId: string;
    eventName: string;
    userData: {
        country?: string[] | undefined;
        em?: string[] | undefined;
        ph?: string[] | undefined;
        fn?: string[] | undefined;
        ln?: string[] | undefined;
        ge?: string[] | undefined;
        db?: string[] | undefined;
        ct?: string[] | undefined;
        st?: string[] | undefined;
        zp?: string[] | undefined;
        externalId?: string[] | undefined;
        fbp?: string | undefined;
        fbc?: string | undefined;
        clientIpAddress?: string | undefined;
        clientUserAgent?: string | undefined;
        subscriptionId?: string | undefined;
        leadId?: string | undefined;
    };
    eventTime: number;
    eventTimeIso: string;
    actionSource: "other" | "email" | "website" | "app" | "physical_store" | "system_generated" | "phone_call" | "chat";
    eventSourceUrl?: string | undefined;
    eventId?: string | undefined;
    deduplicated?: boolean | undefined;
    customData?: z.objectInputType<{
        value: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        contentName: z.ZodOptional<z.ZodString>;
        contentCategory: z.ZodOptional<z.ZodString>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentType: z.ZodOptional<z.ZodString>;
        contents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            quantity: z.ZodNumber;
            itemPrice: z.ZodOptional<z.ZodNumber>;
            deliveryCategory: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }, {
            id: string;
            quantity: number;
            itemPrice?: number | undefined;
            deliveryCategory?: string | undefined;
        }>, "many">>;
        numItems: z.ZodOptional<z.ZodNumber>;
        orderId: z.ZodOptional<z.ZodString>;
        searchString: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        predictedLtv: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    dataProcessingOptions?: string[] | undefined;
    dataProcessingOptionsCountry?: number | undefined;
    dataProcessingOptionsState?: number | undefined;
    sentToMeta?: boolean | undefined;
    metaResponse?: Record<string, unknown> | undefined;
    sendAttempts?: number | undefined;
}>;
export type CAPIEvent = z.infer<typeof CAPIEventSchema>;
//# sourceMappingURL=meta.d.ts.map