// app/lib/hardware/types.ts
// ============================================================
// HARDWARE TYPES — derived from Zod schemas
// ============================================================
// DO NOT manually define interfaces here. Types are inferred
// from schemas in ./schema/. To add a field:
//   1. Update the schema in ./schema/
//   2. Re-run TypeScript — types update automatically
// ============================================================

// Re-export everything from the schema barrel
// (types are inferred and exported alongside schemas)
export * from "./schema/base";
export * from "./schema/common";
export * from "./schema/switching";


// ------------------------------------------------------------
// LEGACY ALIASES (for backward compatibility)
// ------------------------------------------------------------

import type { SwitchProductSKU, SwitchSeries } from "./schema/switching";
import type { SlotKind } from "./schema/base"
/**
 * @deprecated Use SwitchProductSKU instead. Kept for files that
 * still import `ProductSKU`. Will be removed in a future cleanup.
 */
export type ProductSKU = SwitchProductSKU;

/**
 * @deprecated Use SwitchSeries instead. Kept for files that
 * still import `HardwareSeries`. Will be removed in a future cleanup.
 */
export type HardwareSeries = SwitchSeries;

/**
 * @deprecated Use SwitchProductSKU directly. Kept for getModule().
 */
export interface ModuleSpec {
  pid: string;
  description: string;
  kind: SlotKind;
  compatibleChassis?: string[];
}