"use strict";
/**
 * @acd/integrations - Main entry point.
 *
 * Re-exports all product-specific integration modules.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.gap = exports.pctWl = exports.voice = exports.meta = exports.remotion = void 0;
// Remotion integration modules (RC-002 through RC-008)
exports.remotion = __importStar(require("./remotion"));
// Meta integration modules (MH-002 through MH-006, GAP-001, GAP-002, GAP-005)
exports.meta = __importStar(require("./meta"));
// Voice integration modules (VOICE-001, VOICE-002, VOICE-003)
exports.voice = __importStar(require("./voice"));
// PCT-WaitlistLab bridge modules (PCT-WL-001 through PCT-WL-003)
exports.pctWl = __importStar(require("./pct-wl"));
// GAP (GapRadar) CAPI integration modules (GAP-001, GAP-006)
exports.gap = __importStar(require("./gap"));
//# sourceMappingURL=index.js.map