// app/lib/hardware/schema.ts
// ============================================================
// CATALOG SCHEMA — Zod runtime validation
// ============================================================
// This is the single source of truth for catalog shape.
// TypeScript types are DERIVED from these schemas (see types.ts).
// JSON files are VALIDATED against these schemas at load time.
// ============================================================

import { z } from "zod";

// ------------------------------------------------------------
// PRIMITIVE ENUMS
// ------------------------------------------------------------

export const RegionSchema = z.enum([
  "EU", "US", "UK", "JP", "AU", "IN", "CN",
]);

export const SmartnetTierSchema = z.enum([
  "SNT", "SNTP", "OS", "OSP",
]);

export const ContractTermYearsSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(5),
  z.literal(7),
]);

export const DeviceTypeSchema = z.enum([
  "core", "distribution", "access", "security", "wireless", "management",
]);

export const PortSpeedSchema = z.enum([
  "1G", "2.5G", "10G", "25G", "40G", "50G", "100G", "400G",
]);

export const PoEKindSchema = z.union([
  z.literal("PoE+"),
  z.literal("UPOE"),
  z.literal("UPOE+"),
  z.literal(false),
]);

export const SlotKindSchema = z.enum([
  "supervisor",
  "linecard",
  "psu",
  "fan",
  "ssd",
  "fabric-module",
  "uplink-module",
  "blank",
]);

export const ModuleKindSchema = z.enum([
  "supervisor",
  "linecard",
  "psu",
  "fan",
  "ssd",
  "fabric-module",
  "uplink-module",
  "stacking-cable",
  "stack-power-cable",
]);

export const LicenseTierSchema = z.enum([
  "Essentials", "Advantage", "Premier",
]);

export const RackUnitsSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(7), z.literal(10), z.literal(13),
]);

// ------------------------------------------------------------
// PORT & FACEPLATE
// ------------------------------------------------------------

export const PortGroupSchema = z.object({
  count: z.number().int().positive(),
  speed: PortSpeedSchema,
  poe: z.boolean().optional(),
});

export const ModulePortGroupSchema = z.object({
  count: z.number().int().positive(),
  speed: PortSpeedSchema,
  poe: PoEKindSchema.optional(),
});

export const FaceplateConfigSchema = z.object({
  accessPorts: PortGroupSchema.optional(),
  uplinkPorts: PortGroupSchema.optional(),
  rackUnits: RackUnitsSchema.optional(),
  modularSlots: z.number().int().positive().optional(),
});

// ------------------------------------------------------------
// SLOT SPECS (for modular chassis)
// ------------------------------------------------------------

export const ChassisSlotSpecSchema = z.object({
  slot: z.number().int().positive(),
  kind: SlotKindSchema,
  required: z.boolean().optional(),
  note: z.string().optional(),
});

// ------------------------------------------------------------
// BUNDLE SUB-PARTS
// ------------------------------------------------------------

export const BundleAutoItemSchema = z.object({
  pid: z.string().min(1),
  qty: z.number().int().positive(),
  note: z.string().optional(),
});

export const PowerCordSpecSchema = z.object({
  qty: z.number().int().positive(),
  byRegion: z.record(RegionSchema, z.string()),
});

export const RedundantPsuSpecSchema = z.object({
  pid: z.string().min(1),
  description: z.string(),
});

export const SmartnetSpecSchema = z.object({
  baseSkuByTier: z.record(SmartnetTierSchema, z.string()),
});

export const LicenseSpecSchema = z.object({
  tier: LicenseTierSchema,
  entitlementPid: z.string().min(1),
  subscriptionByTerm: z.record(
    z.string().regex(/^[1357]$/, "Term must be 1, 3, 5, or 7"),
    z.string()
  ),
});

export const StackingCableSpecSchema = z.object({
  pid: z.string().min(1),
  length: z.string(),
});

export const StackingSpecSchema = z.object({
  adapterRequired: z.boolean(),
  adapterKits: z.array(z.string()).optional(),
  dataCables: z.array(StackingCableSpecSchema).optional(),
  powerCables: z.array(StackingCableSpecSchema).optional(),
});

export const ChassisBundleSchema = z.object({
  autoIncluded: z.array(BundleAutoItemSchema),
  powerCord: PowerCordSpecSchema,
  redundantPsu: RedundantPsuSpecSchema.optional(),
  smartnet: SmartnetSpecSchema,
  license: LicenseSpecSchema,
  stacking: StackingSpecSchema.optional(),
});

// ------------------------------------------------------------
// PRODUCT SKU
// ------------------------------------------------------------

export const ProductSKUSchema = z.object({
  pid: z.string().min(1),
  description: z.string(),
  faceplate: FaceplateConfigSchema.optional(),
  bundle: ChassisBundleSchema.optional(),
  kind: ModuleKindSchema.optional(),
  slotKind: SlotKindSchema.optional(),
  modulePorts: ModulePortGroupSchema.optional(),
  compatibleChassis: z.array(z.string()).optional(),
});

// ------------------------------------------------------------
// HARDWARE SERIES
// ------------------------------------------------------------

export const HardwareSeriesSchema = z.object({
  type: DeviceTypeSchema,
  vendor: z.string().min(1),
  description: z.string(),
  pids: z.array(ProductSKUSchema),
  compatibleOptics: z.array(z.string()),
  compatibleChassis: z.array(z.string()).optional(),

  // Modular chassis support
  slotLayout: z.array(ChassisSlotSpecSchema).optional(),

  // Stacking flags
  isStackable: z.boolean().optional(),
  maxStackSize: z.number().int().positive().optional(),
  supportsStackPower: z.boolean().optional(),

  // Module catalog flag (excludes from "Add Device" dropdown)
  isModuleCatalog: z.boolean().optional(),
});

// ------------------------------------------------------------
// FULL CATALOG (with versioning)
// ------------------------------------------------------------

/** Current catalog schema version. Bump when making breaking changes. */
export const CURRENT_CATALOG_SCHEMA_VERSION = 1;

export const CatalogFileSchema = z.object({
  /** Schema version — must match CURRENT_CATALOG_SCHEMA_VERSION */
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),
  /** Optional human-readable metadata */
  meta: z.object({
    generatedAt: z.string().optional(),
    description: z.string().optional(),
    sourceFile: z.string().optional(),
  }).optional(),
  /** Series name → HardwareSeries */
  series: z.record(z.string(), HardwareSeriesSchema),
});

// ------------------------------------------------------------
// SLOT LAYOUTS (separate file for clarity)
// ------------------------------------------------------------

export const SlotLayoutsFileSchema = z.object({
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),
  /** Chassis PID → array of slot specs */
  layouts: z.record(z.string(), z.array(ChassisSlotSpecSchema)),
});

// ------------------------------------------------------------
// LOCALSTORAGE OVERRIDES (with versioning)
// ------------------------------------------------------------

export const CatalogOverrideSchema = z.object({
  /** Schema version of the override data — used for migration */
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),
  /** Series name → PID → partial ProductSKU patch */
  bundles: z.record(
    z.string(),
    z.record(z.string(), ProductSKUSchema.partial())
  ),
});