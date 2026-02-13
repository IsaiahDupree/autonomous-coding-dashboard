import { z } from "zod";
/**
 * Event category for classification.
 */
export declare const EventCategorySchema: z.ZodEnum<["page_view", "user_action", "system", "api_call", "error", "conversion", "engagement", "auth", "billing", "render", "notification", "integration", "custom"]>;
export type EventCategory = z.infer<typeof EventCategorySchema>;
/**
 * Event severity / importance level.
 */
export declare const EventSeveritySchema: z.ZodEnum<["debug", "info", "warning", "error", "critical"]>;
export type EventSeverity = z.infer<typeof EventSeveritySchema>;
/**
 * Device / client context captured with the event.
 */
export declare const EventContextSchema: z.ZodObject<{
    /** IP address of the client. */
    ip: z.ZodOptional<z.ZodString>;
    /** User agent string. */
    userAgent: z.ZodOptional<z.ZodString>;
    /** ISO 639-1 locale (e.g., "en-US"). */
    locale: z.ZodOptional<z.ZodString>;
    /** Timezone (IANA, e.g., "America/New_York"). */
    timezone: z.ZodOptional<z.ZodString>;
    /** Referring URL. */
    referrer: z.ZodOptional<z.ZodString>;
    /** Current page URL. */
    pageUrl: z.ZodOptional<z.ZodString>;
    /** Current page path (without domain). */
    pagePath: z.ZodOptional<z.ZodString>;
    /** Screen width. */
    screenWidth: z.ZodOptional<z.ZodNumber>;
    /** Screen height. */
    screenHeight: z.ZodOptional<z.ZodNumber>;
    /** Device type. */
    deviceType: z.ZodOptional<z.ZodEnum<["desktop", "mobile", "tablet", "unknown"]>>;
    /** Operating system. */
    os: z.ZodOptional<z.ZodString>;
    /** Browser name. */
    browser: z.ZodOptional<z.ZodString>;
    /** Country code (ISO 3166-1 alpha-2). */
    country: z.ZodOptional<z.ZodString>;
    /** Region / state. */
    region: z.ZodOptional<z.ZodString>;
    /** City. */
    city: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ip?: string | undefined;
    userAgent?: string | undefined;
    locale?: string | undefined;
    timezone?: string | undefined;
    referrer?: string | undefined;
    pageUrl?: string | undefined;
    pagePath?: string | undefined;
    screenWidth?: number | undefined;
    screenHeight?: number | undefined;
    deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
    os?: string | undefined;
    browser?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
}, {
    ip?: string | undefined;
    userAgent?: string | undefined;
    locale?: string | undefined;
    timezone?: string | undefined;
    referrer?: string | undefined;
    pageUrl?: string | undefined;
    pagePath?: string | undefined;
    screenWidth?: number | undefined;
    screenHeight?: number | undefined;
    deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
    os?: string | undefined;
    browser?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
}>;
export type EventContext = z.infer<typeof EventContextSchema>;
/**
 * SharedEvent - A telemetry/analytics event recorded across ACD products.
 */
export declare const SharedEventSchema: z.ZodObject<{
    /** Unique event identifier (UUID v4). */
    id: z.ZodString;
    /** The event name (e.g., "video.rendered", "user.signed_up"). */
    name: z.ZodString;
    /** Event category. */
    category: z.ZodEnum<["page_view", "user_action", "system", "api_call", "error", "conversion", "engagement", "auth", "billing", "render", "notification", "integration", "custom"]>;
    /** Event severity. */
    severity: z.ZodDefault<z.ZodEnum<["debug", "info", "warning", "error", "critical"]>>;
    /** The product that emitted this event. */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** The user associated with this event (may be null for anonymous). */
    userId: z.ZodOptional<z.ZodString>;
    /** Anonymous/session identifier. */
    anonymousId: z.ZodOptional<z.ZodString>;
    /** Session identifier. */
    sessionId: z.ZodOptional<z.ZodString>;
    /** Client/device context. */
    context: z.ZodOptional<z.ZodObject<{
        /** IP address of the client. */
        ip: z.ZodOptional<z.ZodString>;
        /** User agent string. */
        userAgent: z.ZodOptional<z.ZodString>;
        /** ISO 639-1 locale (e.g., "en-US"). */
        locale: z.ZodOptional<z.ZodString>;
        /** Timezone (IANA, e.g., "America/New_York"). */
        timezone: z.ZodOptional<z.ZodString>;
        /** Referring URL. */
        referrer: z.ZodOptional<z.ZodString>;
        /** Current page URL. */
        pageUrl: z.ZodOptional<z.ZodString>;
        /** Current page path (without domain). */
        pagePath: z.ZodOptional<z.ZodString>;
        /** Screen width. */
        screenWidth: z.ZodOptional<z.ZodNumber>;
        /** Screen height. */
        screenHeight: z.ZodOptional<z.ZodNumber>;
        /** Device type. */
        deviceType: z.ZodOptional<z.ZodEnum<["desktop", "mobile", "tablet", "unknown"]>>;
        /** Operating system. */
        os: z.ZodOptional<z.ZodString>;
        /** Browser name. */
        browser: z.ZodOptional<z.ZodString>;
        /** Country code (ISO 3166-1 alpha-2). */
        country: z.ZodOptional<z.ZodString>;
        /** Region / state. */
        region: z.ZodOptional<z.ZodString>;
        /** City. */
        city: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    }, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    }>>;
    /** Event-specific payload data. */
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Numeric value associated with the event (e.g., revenue). */
    value: z.ZodOptional<z.ZodNumber>;
    /** Currency code for monetary values (ISO 4217). */
    currency: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of when the event occurred. */
    timestamp: z.ZodString;
    /** ISO 8601 timestamp of when the event was received by the server. */
    receivedAt: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of when the event was processed. */
    processedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    category: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration";
    severity: "error" | "debug" | "info" | "warning" | "critical";
    properties: Record<string, unknown>;
    timestamp: string;
    value?: number | undefined;
    userId?: string | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    anonymousId?: string | undefined;
    sessionId?: string | undefined;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    } | undefined;
    currency?: string | undefined;
    receivedAt?: string | undefined;
    processedAt?: string | undefined;
}, {
    id: string;
    name: string;
    category: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration";
    timestamp: string;
    value?: number | undefined;
    userId?: string | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
    anonymousId?: string | undefined;
    sessionId?: string | undefined;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    } | undefined;
    properties?: Record<string, unknown> | undefined;
    currency?: string | undefined;
    receivedAt?: string | undefined;
    processedAt?: string | undefined;
}>;
export type SharedEvent = z.infer<typeof SharedEventSchema>;
/**
 * TrackEventInput - The shape of data sent from clients to track an event.
 * This is a subset of SharedEvent; the server enriches it with IDs and timestamps.
 */
export declare const TrackEventInputSchema: z.ZodObject<{
    /** The event name (e.g., "button.clicked", "page.viewed"). */
    name: z.ZodString;
    /** Event category. */
    category: z.ZodOptional<z.ZodEnum<["page_view", "user_action", "system", "api_call", "error", "conversion", "engagement", "auth", "billing", "render", "notification", "integration", "custom"]>>;
    /** Event severity. */
    severity: z.ZodOptional<z.ZodEnum<["debug", "info", "warning", "error", "critical"]>>;
    /** The product emitting the event. */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** User ID (if authenticated). */
    userId: z.ZodOptional<z.ZodString>;
    /** Anonymous/session identifier (if not authenticated). */
    anonymousId: z.ZodOptional<z.ZodString>;
    /** Session identifier. */
    sessionId: z.ZodOptional<z.ZodString>;
    /** Client/device context. */
    context: z.ZodOptional<z.ZodObject<{
        /** IP address of the client. */
        ip: z.ZodOptional<z.ZodString>;
        /** User agent string. */
        userAgent: z.ZodOptional<z.ZodString>;
        /** ISO 639-1 locale (e.g., "en-US"). */
        locale: z.ZodOptional<z.ZodString>;
        /** Timezone (IANA, e.g., "America/New_York"). */
        timezone: z.ZodOptional<z.ZodString>;
        /** Referring URL. */
        referrer: z.ZodOptional<z.ZodString>;
        /** Current page URL. */
        pageUrl: z.ZodOptional<z.ZodString>;
        /** Current page path (without domain). */
        pagePath: z.ZodOptional<z.ZodString>;
        /** Screen width. */
        screenWidth: z.ZodOptional<z.ZodNumber>;
        /** Screen height. */
        screenHeight: z.ZodOptional<z.ZodNumber>;
        /** Device type. */
        deviceType: z.ZodOptional<z.ZodEnum<["desktop", "mobile", "tablet", "unknown"]>>;
        /** Operating system. */
        os: z.ZodOptional<z.ZodString>;
        /** Browser name. */
        browser: z.ZodOptional<z.ZodString>;
        /** Country code (ISO 3166-1 alpha-2). */
        country: z.ZodOptional<z.ZodString>;
        /** Region / state. */
        region: z.ZodOptional<z.ZodString>;
        /** City. */
        city: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    }, {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    }>>;
    /** Event-specific payload data. */
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Numeric value associated with the event. */
    value: z.ZodOptional<z.ZodNumber>;
    /** Currency code (ISO 4217). */
    currency: z.ZodOptional<z.ZodString>;
    /** Client-side timestamp (ISO 8601). */
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    value?: number | undefined;
    userId?: string | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
    severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
    anonymousId?: string | undefined;
    sessionId?: string | undefined;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    } | undefined;
    properties?: Record<string, unknown> | undefined;
    currency?: string | undefined;
    timestamp?: string | undefined;
}, {
    name: string;
    value?: number | undefined;
    userId?: string | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
    severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
    anonymousId?: string | undefined;
    sessionId?: string | undefined;
    context?: {
        ip?: string | undefined;
        userAgent?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
        referrer?: string | undefined;
        pageUrl?: string | undefined;
        pagePath?: string | undefined;
        screenWidth?: number | undefined;
        screenHeight?: number | undefined;
        deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
        os?: string | undefined;
        browser?: string | undefined;
        country?: string | undefined;
        region?: string | undefined;
        city?: string | undefined;
    } | undefined;
    properties?: Record<string, unknown> | undefined;
    currency?: string | undefined;
    timestamp?: string | undefined;
}>;
export type TrackEventInput = z.infer<typeof TrackEventInputSchema>;
/**
 * Batch tracking input for sending multiple events at once.
 */
export declare const BatchTrackInputSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        /** The event name (e.g., "button.clicked", "page.viewed"). */
        name: z.ZodString;
        /** Event category. */
        category: z.ZodOptional<z.ZodEnum<["page_view", "user_action", "system", "api_call", "error", "conversion", "engagement", "auth", "billing", "render", "notification", "integration", "custom"]>>;
        /** Event severity. */
        severity: z.ZodOptional<z.ZodEnum<["debug", "info", "warning", "error", "critical"]>>;
        /** The product emitting the event. */
        productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
        /** User ID (if authenticated). */
        userId: z.ZodOptional<z.ZodString>;
        /** Anonymous/session identifier (if not authenticated). */
        anonymousId: z.ZodOptional<z.ZodString>;
        /** Session identifier. */
        sessionId: z.ZodOptional<z.ZodString>;
        /** Client/device context. */
        context: z.ZodOptional<z.ZodObject<{
            /** IP address of the client. */
            ip: z.ZodOptional<z.ZodString>;
            /** User agent string. */
            userAgent: z.ZodOptional<z.ZodString>;
            /** ISO 639-1 locale (e.g., "en-US"). */
            locale: z.ZodOptional<z.ZodString>;
            /** Timezone (IANA, e.g., "America/New_York"). */
            timezone: z.ZodOptional<z.ZodString>;
            /** Referring URL. */
            referrer: z.ZodOptional<z.ZodString>;
            /** Current page URL. */
            pageUrl: z.ZodOptional<z.ZodString>;
            /** Current page path (without domain). */
            pagePath: z.ZodOptional<z.ZodString>;
            /** Screen width. */
            screenWidth: z.ZodOptional<z.ZodNumber>;
            /** Screen height. */
            screenHeight: z.ZodOptional<z.ZodNumber>;
            /** Device type. */
            deviceType: z.ZodOptional<z.ZodEnum<["desktop", "mobile", "tablet", "unknown"]>>;
            /** Operating system. */
            os: z.ZodOptional<z.ZodString>;
            /** Browser name. */
            browser: z.ZodOptional<z.ZodString>;
            /** Country code (ISO 3166-1 alpha-2). */
            country: z.ZodOptional<z.ZodString>;
            /** Region / state. */
            region: z.ZodOptional<z.ZodString>;
            /** City. */
            city: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        }, {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        }>>;
        /** Event-specific payload data. */
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        /** Numeric value associated with the event. */
        value: z.ZodOptional<z.ZodNumber>;
        /** Currency code (ISO 4217). */
        currency: z.ZodOptional<z.ZodString>;
        /** Client-side timestamp (ISO 8601). */
        timestamp: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        value?: number | undefined;
        userId?: string | undefined;
        productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
        category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
        severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
        anonymousId?: string | undefined;
        sessionId?: string | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        } | undefined;
        properties?: Record<string, unknown> | undefined;
        currency?: string | undefined;
        timestamp?: string | undefined;
    }, {
        name: string;
        value?: number | undefined;
        userId?: string | undefined;
        productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
        category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
        severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
        anonymousId?: string | undefined;
        sessionId?: string | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        } | undefined;
        properties?: Record<string, unknown> | undefined;
        currency?: string | undefined;
        timestamp?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    events: {
        name: string;
        value?: number | undefined;
        userId?: string | undefined;
        productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
        category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
        severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
        anonymousId?: string | undefined;
        sessionId?: string | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        } | undefined;
        properties?: Record<string, unknown> | undefined;
        currency?: string | undefined;
        timestamp?: string | undefined;
    }[];
}, {
    events: {
        name: string;
        value?: number | undefined;
        userId?: string | undefined;
        productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
        category?: "custom" | "error" | "page_view" | "user_action" | "system" | "api_call" | "conversion" | "engagement" | "auth" | "billing" | "render" | "notification" | "integration" | undefined;
        severity?: "error" | "debug" | "info" | "warning" | "critical" | undefined;
        anonymousId?: string | undefined;
        sessionId?: string | undefined;
        context?: {
            ip?: string | undefined;
            userAgent?: string | undefined;
            locale?: string | undefined;
            timezone?: string | undefined;
            referrer?: string | undefined;
            pageUrl?: string | undefined;
            pagePath?: string | undefined;
            screenWidth?: number | undefined;
            screenHeight?: number | undefined;
            deviceType?: "unknown" | "desktop" | "mobile" | "tablet" | undefined;
            os?: string | undefined;
            browser?: string | undefined;
            country?: string | undefined;
            region?: string | undefined;
            city?: string | undefined;
        } | undefined;
        properties?: Record<string, unknown> | undefined;
        currency?: string | undefined;
        timestamp?: string | undefined;
    }[];
}>;
export type BatchTrackInput = z.infer<typeof BatchTrackInputSchema>;
//# sourceMappingURL=event.d.ts.map