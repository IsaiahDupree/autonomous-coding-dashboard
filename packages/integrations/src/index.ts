/**
 * @acd/integrations - Main entry point.
 *
 * Re-exports all product-specific integration modules.
 */

// Remotion integration modules (RC-002 through RC-008)
export * as remotion from "./remotion";

// Meta integration modules (MH-002 through MH-006, GAP-001, GAP-002, GAP-005)
export * as meta from "./meta";

// Voice integration modules (VOICE-001, VOICE-002, VOICE-003)
export * as voice from "./voice";

// PCT-WaitlistLab bridge modules (PCT-WL-001 through PCT-WL-003)
export * as pctWl from "./pct-wl";

// GAP (GapRadar) CAPI integration modules (GAP-001, GAP-006)
export * as gap from "./gap";
