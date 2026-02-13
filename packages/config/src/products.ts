export type ProductTier = 'infrastructure' | 'application' | 'specialized';

export interface ProductMeta {
  readonly name: string;
  readonly domain?: string;
  readonly tier: ProductTier;
}

export const PRODUCTS = {
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
} as const satisfies Record<string, ProductMeta>;

export type ProductKey = keyof typeof PRODUCTS;

/**
 * Returns all products matching a given tier.
 */
export function getProductsByTier(tier: ProductTier): Array<{ key: ProductKey; meta: ProductMeta }> {
  return (Object.entries(PRODUCTS) as Array<[ProductKey, ProductMeta]>)
    .filter(([, meta]) => meta.tier === tier)
    .map(([key, meta]) => ({ key, meta }));
}

/**
 * Looks up a product by key, returning undefined if not found.
 */
export function getProduct(key: string): ProductMeta | undefined {
  return (PRODUCTS as Record<string, ProductMeta>)[key];
}
