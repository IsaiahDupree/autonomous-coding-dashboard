export type ProductTier = 'infrastructure' | 'application' | 'specialized';
export interface ProductMeta {
    readonly name: string;
    readonly domain?: string;
    readonly tier: ProductTier;
}
export declare const PRODUCTS: {
    readonly portal28: {
        readonly name: "Portal28";
        readonly domain: "portal28.com";
        readonly tier: "infrastructure";
    };
    readonly remotion: {
        readonly name: "Remotion";
        readonly domain: "remotion.yourapp.com";
        readonly tier: "infrastructure";
    };
    readonly waitlistlab: {
        readonly name: "WaitlistLab";
        readonly domain: "waitlistlab.com";
        readonly tier: "infrastructure";
    };
    readonly mediaposter: {
        readonly name: "MediaPoster";
        readonly domain: "mediaposter.com";
        readonly tier: "infrastructure";
    };
    readonly content_factory: {
        readonly name: "Content Factory";
        readonly tier: "application";
    };
    readonly pct: {
        readonly name: "PCT";
        readonly tier: "application";
    };
    readonly softwarehub: {
        readonly name: "SoftwareHub";
        readonly domain: "softwarehub.com";
        readonly tier: "application";
    };
    readonly gapradar: {
        readonly name: "GapRadar";
        readonly tier: "application";
    };
    readonly blogcanvas: {
        readonly name: "BlogCanvas";
        readonly tier: "application";
    };
    readonly canvascast: {
        readonly name: "CanvasCast";
        readonly tier: "application";
    };
    readonly shortslinker: {
        readonly name: "ShortsLinker";
        readonly tier: "specialized";
    };
    readonly vellopad: {
        readonly name: "VelloPad";
        readonly tier: "specialized";
    };
    readonly velvethold: {
        readonly name: "VelvetHold";
        readonly tier: "specialized";
    };
    readonly steadyletters: {
        readonly name: "SteadyLetters";
        readonly tier: "specialized";
    };
    readonly everreach: {
        readonly name: "EverReach";
        readonly tier: "specialized";
    };
};
export type ProductKey = keyof typeof PRODUCTS;
/**
 * Returns all products matching a given tier.
 */
export declare function getProductsByTier(tier: ProductTier): Array<{
    key: ProductKey;
    meta: ProductMeta;
}>;
/**
 * Looks up a product by key, returning undefined if not found.
 */
export declare function getProduct(key: string): ProductMeta | undefined;
//# sourceMappingURL=products.d.ts.map