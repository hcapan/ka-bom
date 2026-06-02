// app/lib/hardware/schema/common.ts
// ============================================================
// COMMON SCHEMAS — sub-structures used by multiple categories
// ============================================================

import { z } from "zod";
import {
  RegionSchema,
  SmartnetTierSchema,
  PortSpeedSchema,
  PoEKindSchema,
  SlotKindSchema,
  ModuleKindSchema,
  LicenseTierSchema,
  RackUnitsSchema,
} from "./base";

// ------------------------------------------------------------
// PORT GROUPS & FACEPLATES
// ------------------------------------------------------------

export const PortGroupSchema = z.object({
  count: z.number().int().positive(),
  speed: PortSpeedSchema,
  poe: z.boolean().optional(),
});
export type PortGroup = z.infer<typeof PortGroupSchema>;

export const ModulePortGroupSchema = z.object({
  count: z.number().int().positive(),
  speed: PortSpeedSchema,
  poe: PoEKindSchema.optional(),
});
export type ModulePortGroup = z.infer<typeof ModulePortGroupSchema>;

export const FaceplateConfigSchema = z.object({
  accessPorts: PortGroupSchema.optional(),
  uplinkPorts: PortGroupSchema.optional(),
  rackUnits: RackUnitsSchema.optional(),
  modularSlots: z.number().int().positive().optional(),
});
export type FaceplateConfig = z.infer<typeof FaceplateConfigSchema>;

export const NetworkModuleOptionSchema = z.object({
  pid: z.string().min(1),
  label: z.string().min(1),
  default: z.boolean().optional(),
});

export const NetworkModuleOptionsSchema = z.object({
  options: z.array(NetworkModuleOptionSchema).min(1),
});

export type NetworkModuleOption = z.infer<typeof NetworkModuleOptionSchema>;
export type NetworkModuleOptions = z.infer<typeof NetworkModuleOptionsSchema>;

// ------------------------------------------------------------
// MODULAR CHASSIS SLOT SPECIFICATION
// ------------------------------------------------------------

export const ChassisSlotSpecSchema = z.object({
  slot: z.number().int().positive(),
  kind: SlotKindSchema,
  required: z.boolean().optional(),
  note: z.string().optional(),
});
export type ChassisSlotSpec = z.infer<typeof ChassisSlotSpecSchema>;

// ------------------------------------------------------------
// BUNDLE SUB-PARTS (for chassis with auto-included items)
// ------------------------------------------------------------

export const BundleAutoItemSchema = z.object({
  pid: z.string().min(1),
  qty: z.number().int().positive(),
  note: z.string().optional(),
});
export type BundleAutoItem = z.infer<typeof BundleAutoItemSchema>;

export const PowerCordSpecSchema = z.object({
  qty: z.number().int().positive(),
  byRegion: z.record(RegionSchema, z.string().optional()),
});
export type PowerCordSpec = z.infer<typeof PowerCordSpecSchema>;

export const RedundantPsuSpecSchema = z.object({
  pid: z.string().min(1),
  description: z.string(),
});
export type RedundantPsuSpec = z.infer<typeof RedundantPsuSpecSchema>;

export const SmartnetSpecSchema = z.object({
  baseSkuByTier: z.record(SmartnetTierSchema, z.string().optional()),
});
export type SmartnetSpec = z.infer<typeof SmartnetSpecSchema>;

/**
 * Subscription terms keyed by string form of years ("1", "3", "5", "7").
 * JSON keys must be strings, hence the regex constraint.
 */
export const LicenseSpecSchema = z.object({
  tier: LicenseTierSchema,
  entitlementPid: z.string().min(1),
  subscriptionByTerm: z.record(
    z.string().regex(/^[1357]$/, "Term must be '1', '3', '5', or '7'"),
    z.string(),
  ),
});
export type LicenseSpec = z.infer<typeof LicenseSpecSchema>;

// ------------------------------------------------------------
// STACKING (switching-specific but kept here for reuse if needed)
// ------------------------------------------------------------

export const StackingCableSpecSchema = z.object({
  pid: z.string().min(1),
  length: z.string(),
});
export type StackingCableSpec = z.infer<typeof StackingCableSpecSchema>;

export const StackingSpecSchema = z.object({
  adapterRequired: z.boolean(),
  adapterKits: z
    .array(
      z.object({
        pid: z.string().min(1),
        label: z.string().min(1),
        default: z.boolean().optional(),
      }),
    )
    .optional(),
  dataCables: z.array(StackingCableSpecSchema).optional(),
  powerCables: z.array(StackingCableSpecSchema).optional(),
});
export type StackingSpec = z.infer<typeof StackingSpecSchema>;

// ============================================================
// PSU Options (NEW)
// ============================================================
export const PsuOptionSchema = z.object({
  pid: z.string().min(1),
  label: z.string().min(1),
  default: z.boolean().optional(),
});

export const PsuOptionsSchema = z.object({
  emitPrimary: z.boolean().optional(),
  primary: z.array(PsuOptionSchema).min(1),
  secondaryPidMap: z.record(z.string(), z.string()),
  noRedundantPid: z.string().optional(),
});

export const PsuConfigSchema = z.object({
  options: z
    .array(
      z.object({
        pid: z.string().min(1),
        label: z.string().min(1),
        default: z.boolean().optional(),
      }),
    )
    .min(1),
  defaultQty: z.number().int().positive(),
  maxQty: z.number().int().positive(),
});

export type PsuConfig = z.infer<typeof PsuConfigSchema>;

export const LegacyRedundantPsuSchema = z.object({
  pid: z.string(),
  description: z.string().optional(),
});

export type PsuOption = z.infer<typeof PsuOptionSchema>;
export type PsuOptions = z.infer<typeof PsuOptionsSchema>;

// ------------------------------------------------------------
// CHASSIS BUNDLE (the full auto-included config for a chassis)
// ------------------------------------------------------------

export const ChassisBundleSchema = z.object({
  autoIncluded: z.array(BundleAutoItemSchema),
  powerCord: PowerCordSpecSchema,
  redundantPsu: LegacyRedundantPsuSchema.optional(),
  psuOptions: PsuOptionsSchema.optional(),
  psuConfig: PsuConfigSchema.optional(),
  networkModuleOptions: NetworkModuleOptionsSchema.optional(),
  smartnet: SmartnetSpecSchema,
  license: LicenseSpecSchema,
  stacking: StackingSpecSchema.optional(),
});
export type ChassisBundle = z.infer<typeof ChassisBundleSchema>;

// ------------------------------------------------------------
// BASE PRODUCT (fields ALL categories share)
// ------------------------------------------------------------

/**
 * Common fields for any product, regardless of category.
 * Category-specific schemas extend this with .extend({ ... }).
 */
export const BaseProductSchema = z.object({
  pid: z.string().min(1),
  description: z.string(),
  vendor: z.string().default("Cisco"),
  /** Optional end-of-life date in ISO format */
  eolDate: z.string().optional(),
  /** Optional free-text notes for this product */
  notes: z.string().optional(),
});
export type BaseProduct = z.infer<typeof BaseProductSchema>;
