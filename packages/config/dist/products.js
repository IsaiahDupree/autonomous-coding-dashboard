"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTS = void 0;
exports.getProductsByTier = getProductsByTier;
exports.getProduct = getProduct;
exports.PRODUCTS = {
    portal28: { name: 'Portal28', domain: 'portal28.com', tier: 'infrastructure' },
    remotion: { name: 'Remotion', domain: 'remotion.yourapp.com', tier: 'infrastructure' },
    waitlistlab: { name: 'WaitlistLab', domain: 'waitlistlab.com', tier: 'infrastructure' },
    mediaposter: { name: 'MediaPoster', domain: 'mediaposter.com', tier: 'infrastructure' },
    content_factory: { name: 'Content Factory', tier: 'application' },
    pct: { name: 'PCT', tier: 'application' },
    softwarehub: { name: 'SoftwareHub', domain: 'softwarehub.com', tier: 'application' },
    gapradar: { name: 'GapRadar', tier: 'application' },
    blogcanvas: { name: 'BlogCanvas', tier: 'application' },
    canvascast: { name: 'CanvasCast', tier: 'application' },
    shortslinker: { name: 'ShortsLinker', tier: 'specialized' },
    vellopad: { name: 'VelloPad', tier: 'specialized' },
    velvethold: { name: 'VelvetHold', tier: 'specialized' },
    steadyletters: { name: 'SteadyLetters', tier: 'specialized' },
    everreach: { name: 'EverReach', tier: 'specialized' },
};
/**
 * Returns all products matching a given tier.
 */
function getProductsByTier(tier) {
    return Object.entries(exports.PRODUCTS)
        .filter(([, meta]) => meta.tier === tier)
        .map(([key, meta]) => ({ key, meta }));
}
/**
 * Looks up a product by key, returning undefined if not found.
 */
function getProduct(key) {
    return exports.PRODUCTS[key];
}
//# sourceMappingURL=products.js.map