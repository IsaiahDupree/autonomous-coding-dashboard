import { z } from 'zod';
export declare const ProductIdSchema: z.ZodEnum<["portal28", "content-factory", "pct", "waitlistlab", "mediaposter", "shorts-linker", "vellopad", "velvet-hold", "steady-letters", "ever-reach", "gap-radar", "blog-canvas", "canvas-cast", "software-hub", "acd"]>;
export type ProductId = z.infer<typeof ProductIdSchema>;
export declare const EventCategorySchema: z.ZodEnum<["page_view", "click", "form_submit", "api_call", "error", "purchase", "subscription", "content_created", "content_published", "render_started", "render_completed", "ad_created", "ad_published", "campaign_created", "user_signed_up", "user_logged_in", "feature_used", "custom"]>;
export type EventCategory = z.infer<typeof EventCategorySchema>;
export declare const PageContextSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    referrer: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    url?: string | undefined;
    referrer?: string | undefined;
    title?: string | undefined;
}, {
    path?: string | undefined;
    url?: string | undefined;
    referrer?: string | undefined;
    title?: string | undefined;
}>;
export type PageContext = z.infer<typeof PageContextSchema>;
export declare const DeviceContextSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    os: z.ZodOptional<z.ZodString>;
    browser: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    os?: string | undefined;
    browser?: string | undefined;
}, {
    type?: string | undefined;
    os?: string | undefined;
    browser?: string | undefined;
}>;
export type DeviceContext = z.infer<typeof DeviceContextSchema>;
export declare const CampaignContextSchema: z.ZodObject<{
    utm_source: z.ZodOptional<z.ZodString>;
    utm_medium: z.ZodOptional<z.ZodString>;
    utm_campaign: z.ZodOptional<z.ZodString>;
    utm_term: z.ZodOptional<z.ZodString>;
    utm_content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    utm_source?: string | undefined;
    utm_medium?: string | undefined;
    utm_campaign?: string | undefined;
    utm_term?: string | undefined;
    utm_content?: string | undefined;
}, {
    utm_source?: string | undefined;
    utm_medium?: string | undefined;
    utm_campaign?: string | undefined;
    utm_term?: string | undefined;
    utm_content?: string | undefined;
}>;
export type CampaignContext = z.infer<typeof CampaignContextSchema>;
export declare const EventContextSchema: z.ZodObject<{
    ip: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
        referrer: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
        url?: string | undefined;
        referrer?: string | undefined;
        title?: string | undefined;
    }, {
        path?: string | undefined;
        url?: string | undefined;
        referrer?: string | undefined;
        title?: string | undefined;
    }>>;
    device: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        os: z.ZodOptional<z.ZodString>;
        browser: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type?: string | undefined;
        os?: string | undefined;
        browser?: string | undefined;
    }, {
        type?: string | undefined;
        os?: string | undefined;
        browser?: string | undefined;
    }>>;
    campaign: z.ZodOptional<z.ZodObject<{
        utm_source: z.ZodOptional<z.ZodString>;
        utm_medium: z.ZodOptional<z.ZodString>;
        utm_campaign: z.ZodOptional<z.ZodString>;
        utm_term: z.ZodOptional<z.ZodString>;
        utm_content: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        utm_source?: string | undefined;
        utm_medium?: string | undefined;
        utm_campaign?: string | undefined;
        utm_term?: string | undefined;
        utm_content?: string | undefined;
    }, {
        utm_source?: string | undefined;
        utm_medium?: string | undefined;
        utm_campaign?: string | undefined;
        utm_term?: string | undefined;
        utm_content?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    ip?: string | undefined;
    userAgent?: string | undefined;
    locale?: string | undefined;
    timezone?: string | undefined;
    page?: {
        path?: string | undefined;
        url?: string | undefined;
        referrer?: string | undefined;
        title?: string | undefined;
    } | undefined;
    device?: {
        type?: string | undefined;
        os?: string | undefined;
        browser?: string | undefined;
    } | undefined;
    campaign?: {
        utm_source?: string | undefined;
        utm_medium?: string | undefined;
        utm_campaign?: string | undefined;
        utm_term?: string | undefined;
        utm_content?: string | undefined;
    } | undefined;
}, {
    ip?: string | undefined;
    userAgent?: string | undefined;
    locale?: string | undefined;
    timezone?: string | undefined;
    page?: {
        path?: string | undefined;
        url?: string | undefined;
        referrer?: string | undefined;
        title?: string | undefined;
    } | undefined;
    device?: {
        type?: string | undefined;
        os?: string | undefined;
        browser?: string | undefined;
    } | undefined;
    campaign?: {
        utm_source?: string | undefined;
        utm_medium?: string | undefined;
        utm_campaign?: string | undefined;
        utm_term?: string | undefined;
        utm_content?: string | undefined;
    } | undefined;
}>;
export type EventContext = z.infer<typeof EventContextSchema>;
export declare const TrackEventInputSchema: z.ZodObject<{
    event: z.ZodString;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    context: z.ZodOptional<z.ZodObject<{
        ip: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
            referrer: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        }, {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        }>>;
        device: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodString>;
            os: z.ZodOptional<z.ZodString>;
            browser: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        }, {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        }>>;
        campaign: z.ZodOptional<z.ZodObject<{
            utm_source: z.ZodOptional<z.ZodString>;
            utm_medium: z.ZodOptional<z.ZodString>;
            utm_campaign: z.ZodOptional<z.ZodString>;
            utm_term: z.ZodOptional<z.ZodString>;
            utm_content: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        }, {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    }, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    }>>;
    userId: z.ZodOptional<z.ZodString>;
    anonymousId: z.ZodOptional<z.ZodString>;
    product: z.ZodEnum<["portal28", "content-factory", "pct", "waitlistlab", "mediaposter", "shorts-linker", "vellopad", "velvet-hold", "steady-letters", "ever-reach", "gap-radar", "blog-canvas", "canvas-cast", "software-hub", "acd"]>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    event: string;
    properties: Record<string, unknown>;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    } | undefined;
    userId?: string | undefined;
    anonymousId?: string | undefined;
    timestamp?: string | undefined;
}, {
    event: string;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    properties?: Record<string, unknown> | undefined;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    } | undefined;
    userId?: string | undefined;
    anonymousId?: string | undefined;
    timestamp?: string | undefined;
}>;
export type TrackEventInput = z.infer<typeof TrackEventInputSchema>;
export declare const BatchTrackInputSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        event: z.ZodString;
        properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        context: z.ZodOptional<z.ZodObject<{
            ip: z.ZodOptional<z.ZodString>;
            userAgent: z.ZodOptional<z.ZodString>;
            locale: z.ZodOptional<z.ZodString>;
            timezone: z.ZodOptional<z.ZodString>;
            page: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
                referrer: z.ZodOptional<z.ZodString>;
                title: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            }, {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            }>>;
            device: z.ZodOptional<z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                os: z.ZodOptional<z.ZodString>;
                browser: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            }, {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            }>>;
            campaign: z.ZodOptional<z.ZodObject<{
                utm_source: z.ZodOptional<z.ZodString>;
                utm_medium: z.ZodOptional<z.ZodString>;
                utm_campaign: z.ZodOptional<z.ZodString>;
                utm_term: z.ZodOptional<z.ZodString>;
                utm_content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            }, {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        }, {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        }>>;
        userId: z.ZodOptional<z.ZodString>;
        anonymousId: z.ZodOptional<z.ZodString>;
        product: z.ZodEnum<["portal28", "content-factory", "pct", "waitlistlab", "mediaposter", "shorts-linker", "vellopad", "velvet-hold", "steady-letters", "ever-reach", "gap-radar", "blog-canvas", "canvas-cast", "software-hub", "acd"]>;
        timestamp: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        event: string;
        properties: Record<string, unknown>;
        product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        } | undefined;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        timestamp?: string | undefined;
    }, {
        event: string;
        product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
        properties?: Record<string, unknown> | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        } | undefined;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        timestamp?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    events: {
        event: string;
        properties: Record<string, unknown>;
        product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        } | undefined;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        timestamp?: string | undefined;
    }[];
}, {
    events: {
        event: string;
        product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
        properties?: Record<string, unknown> | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            page?: {
                path?: string | undefined;
                url?: string | undefined;
                referrer?: string | undefined;
                title?: string | undefined;
            } | undefined;
            device?: {
                type?: string | undefined;
                os?: string | undefined;
                browser?: string | undefined;
            } | undefined;
            campaign?: {
                utm_source?: string | undefined;
                utm_medium?: string | undefined;
                utm_campaign?: string | undefined;
                utm_term?: string | undefined;
                utm_content?: string | undefined;
            } | undefined;
        } | undefined;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        timestamp?: string | undefined;
    }[];
}>;
export type BatchTrackInput = z.infer<typeof BatchTrackInputSchema>;
export declare const IdentifyInputSchema: z.ZodObject<{
    userId: z.ZodString;
    traits: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    product: z.ZodEnum<["portal28", "content-factory", "pct", "waitlistlab", "mediaposter", "shorts-linker", "vellopad", "velvet-hold", "steady-letters", "ever-reach", "gap-radar", "blog-canvas", "canvas-cast", "software-hub", "acd"]>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    traits: Record<string, unknown>;
}, {
    userId: string;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    traits?: Record<string, unknown> | undefined;
}>;
export type IdentifyInput = z.infer<typeof IdentifyInputSchema>;
export declare const AnalyticsEventSchema: z.ZodObject<{
    event: z.ZodString;
    properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    context: z.ZodOptional<z.ZodObject<{
        ip: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
            referrer: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        }, {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        }>>;
        device: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodString>;
            os: z.ZodOptional<z.ZodString>;
            browser: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        }, {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        }>>;
        campaign: z.ZodOptional<z.ZodObject<{
            utm_source: z.ZodOptional<z.ZodString>;
            utm_medium: z.ZodOptional<z.ZodString>;
            utm_campaign: z.ZodOptional<z.ZodString>;
            utm_term: z.ZodOptional<z.ZodString>;
            utm_content: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        }, {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    }, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    }>>;
    userId: z.ZodOptional<z.ZodString>;
    anonymousId: z.ZodOptional<z.ZodString>;
    product: z.ZodEnum<["portal28", "content-factory", "pct", "waitlistlab", "mediaposter", "shorts-linker", "vellopad", "velvet-hold", "steady-letters", "ever-reach", "gap-radar", "blog-canvas", "canvas-cast", "software-hub", "acd"]>;
    timestamp: z.ZodString;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    event: string;
    properties: Record<string, unknown>;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    timestamp: string;
    messageId: string;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    } | undefined;
    userId?: string | undefined;
    anonymousId?: string | undefined;
}, {
    event: string;
    properties: Record<string, unknown>;
    product: "portal28" | "content-factory" | "pct" | "waitlistlab" | "mediaposter" | "shorts-linker" | "vellopad" | "velvet-hold" | "steady-letters" | "ever-reach" | "gap-radar" | "blog-canvas" | "canvas-cast" | "software-hub" | "acd";
    timestamp: string;
    messageId: string;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        page?: {
            path?: string | undefined;
            url?: string | undefined;
            referrer?: string | undefined;
            title?: string | undefined;
        } | undefined;
        device?: {
            type?: string | undefined;
            os?: string | undefined;
            browser?: string | undefined;
        } | undefined;
        campaign?: {
            utm_source?: string | undefined;
            utm_medium?: string | undefined;
            utm_campaign?: string | undefined;
            utm_term?: string | undefined;
            utm_content?: string | undefined;
        } | undefined;
    } | undefined;
    userId?: string | undefined;
    anonymousId?: string | undefined;
}>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
//# sourceMappingURL=types.d.ts.map