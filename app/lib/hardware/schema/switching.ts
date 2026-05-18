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
export const SwitchProductSKUSchema = BaseProductSchema.extend({
  faceplate: FaceplateConfigSchema.optional(),
  bundle: ChassisBundleSchema.optional(),
  kind: ModuleKindSchema.optional(),
  slotKind: SlotKindSchema.optional(),
  modulePorts: ModulePortGroupSchema.optional(),
  compatibleChassis: z.array(z.string()).optional(),
});
export type SwitchProductSKU = z.infer<typeof SwitchProductSKUSchema>;

// ------------------------------------------------------------
// SWITCH SERIES (e.g., "Catalyst 9300", "Nexus 9500")
// ------------------------------------------------------------

export const SwitchSeriesSchema = z.object({
  /** Discriminator — explicitly marks this as switching */
  productCategory: z.enum(["modular-switch", "fixed-switch"]),

  /** Topology layer this series belongs to */
  type: DeviceTypeSchema,

  /** Vendor name (typically "Cisco") */
  vendor: z.string().min(1),

  /** Human-readable description */
  description: z.string(),

  /** All PID variants in this series (chassis, modules, accessories) */
  pids: z.array(SwitchProductSKUSchema),

  /** Optic PIDs compatible with this series' uplinks */
  compatibleOptics: z.array(z.string()),

  /** Chassis PIDs this series' modules are compatible with (for module catalogs) */
  compatibleChassis: z.array(z.string()).optional(),

  // ----------------------------------------------------------
  // Stacking flags (fixed switches only)
  // ----------------------------------------------------------

  /** True if this series supports stacking (e.g., 9200, 9300) */
  isStackable: z.boolean().optional(),

  /** Maximum number of members in a stack */
  maxStackSize: z.number().int().positive().optional(),

  /** True for series that support StackPower (e.g., 9300; not 9200) */
  supportsStackPower: z.boolean().optional(),

  // ----------------------------------------------------------
  // Catalog flags
  // ----------------------------------------------------------

  /**
   * True if this series is a "module catalog" — its PIDs are slot
   * components (linecards, supervisors, etc.) rather than standalone
   * addable devices. Excluded from the "Add Device" dropdown.
   */
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