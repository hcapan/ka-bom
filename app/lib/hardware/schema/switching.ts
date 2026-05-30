// app/lib/hardware/schema/switching.ts
// ============================================================
// SWITCHING SCHEMA — modular and fixed switches
// ============================================================

import { z } from "zod";
import {
  CURRENT_CATALOG_SCHEMA_VERSION,
  DeviceTypeSchema,
  ModuleKindSchema,
  SlotKindSchema,
  DeviceCategorySchema
} from "./base";
import {
  BaseProductSchema,
  ChassisBundleSchema,
  ChassisSlotSpecSchema,
  FaceplateConfigSchema,
  ModulePortGroupSchema,
} from "./common";

// ------------------------------------------------------------
// SWITCH PRODUCT SKU (a single PID variant within a series)
// ------------------------------------------------------------

/**
 * A single switch PID — could be a chassis, a module, or an accessory.
 * For module catalogs, omit `bundle` and set `kind`/`slotKind`.
 * For chassis, include `bundle` and `faceplate`.
 */

export const SwitchAttrsSchema = z.object({
  kind: z.literal("switch"),
  portCount: z.number().int().positive(),                   // 12, 24, 48...
  portType: z.enum(["1G-Cu", "mGig", "10G-Cu", "SFP", "SFP+"]),
  poeClass: z.enum(["none", "PoE+", "UPOE", "UPOE+"]),
  uplinkType: z.enum(["fixed-1G", "fixed-10G", "fixed-25G","fixed-40G", "modular"]),
});
export type SwitchAttrs = z.infer<typeof SwitchAttrsSchema>;



export const SwitchProductSKUSchema = BaseProductSchema.extend({
  faceplate: FaceplateConfigSchema.optional(),
  bundle: ChassisBundleSchema.optional(),
  kind: ModuleKindSchema.optional(),
  slotKind: SlotKindSchema.optional(),
  modulePorts: ModulePortGroupSchema.optional(),
  compatibleChassis: z.array(z.string()).optional(),
  attrs: SwitchAttrsSchema.optional(),
});
export type SwitchProductSKU = z.infer<typeof SwitchProductSKUSchema>;





// ------------------------------------------------------------
// SWITCH SERIES (e.g., "Catalyst 9300", "Nexus 9500")
// ------------------------------------------------------------

export const SwitchSeriesSchema = z.object({
  productCategory: z.enum(["modular-switch", "fixed-switch"]),
  type: DeviceTypeSchema,
  vendor: z.string().min(1),
  description: z.string(),
  category: DeviceCategorySchema.default("switching"),
  pids: z.array(SwitchProductSKUSchema),
  compatibleOptics: z.array(z.string()),
  compatibleChassis: z.array(z.string()).optional(),
  secondaryPidMap: z.record(z.string(), z.string()).optional(),
  isStackable: z.boolean().optional(),
  maxStackSize: z.number().int().positive().optional(),
  supportsStackPower: z.boolean().optional(),
  isModuleCatalog: z.boolean().optional(),
});
export type SwitchSeries = z.infer<typeof SwitchSeriesSchema>;

// ------------------------------------------------------------
// SWITCHING CATALOG FILE (the shape of switching.json)
// ------------------------------------------------------------

export const SwitchingCatalogFileSchema = z.object({
  /** Schema version — must match CURRENT_CATALOG_SCHEMA_VERSION */
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),

  /** Optional metadata */
  meta: z.object({
    generatedAt: z.string().optional(),
    description: z.string().optional(),
    sourceFile: z.string().optional(),
  }).optional(),

  /** Series name → SwitchSeries */
  series: z.record(z.string(), SwitchSeriesSchema),
});
export type SwitchingCatalogFile = z.infer<typeof SwitchingCatalogFileSchema>;

// ------------------------------------------------------------
// SLOT LAYOUTS FILE (slot-layouts.json)
// ------------------------------------------------------------

export const SlotLayoutsFileSchema = z.object({
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),
  /** Chassis PID → ordered array of slot specs */
  layouts: z.record(z.string(), z.array(ChassisSlotSpecSchema)),
});
export type SlotLayoutsFile = z.infer<typeof SlotLayoutsFileSchema>;

// ------------------------------------------------------------
// LOCALSTORAGE OVERRIDE (versioned)
// ------------------------------------------------------------

export const CatalogOverrideSchema = z.object({
  /** Schema version of the override data */
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),

  /** Series name → PID → partial SwitchProductSKU patch */
  bundles: z.record(
    z.string(),
    z.record(z.string(), SwitchProductSKUSchema.partial())
  ),
});
export type CatalogOverride = z.infer<typeof CatalogOverrideSchema>;