// app/lib/hardware/schema/base.ts
// ============================================================
// BASE SCHEMA — primitive enums shared across all categories
// ============================================================

import { z } from "zod";

// ------------------------------------------------------------
// REGIONS & GEOGRAPHIC
// ------------------------------------------------------------

export const RegionSchema = z.enum([
  "EU", "US", "UK", "JP", "AU", "IN", "CN",
  "BR", "INTL", "IL", "CH", "IT", "TW",
]);
export type Region = z.infer<typeof RegionSchema>;

// ------------------------------------------------------------
// CISCO SERVICE TIERS
// ------------------------------------------------------------

/**
 * Cisco SmartNet/Solution Support tier codes.
 * Matches the prefix in CON-<TIER>-<CHASSIS> PIDs.
 *   SNT  — 8x5xNBD (Smart Net Total Care)
 *   SNTP — 8x5x4 (4-hour parts)
 *   OS   — 24x7x4 onsite
 *   OSP  — 24x7x4 onsite premium
 */
export const SmartnetTierSchema = z.enum([
  "SNT",   // 8x5xNBD
  "SNTP",  // 8x5x4
  "OS",    // 24x7x4 onsite
  "OSP",   // 24x7x4 premium
  "PSUP",  // ⭐ Partner Support
  "ECMU",  // ⭐ Software only
  "NONE",  // ⭐ No support
]);
export type SmartnetTier = z.infer<typeof SmartnetTierSchema>;

export const ContractTermYearsSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(5),
  z.literal(7),
]);
export type ContractTermYears = z.infer<typeof ContractTermYearsSchema>;

// ------------------------------------------------------------
// PRODUCT CATEGORY DISCRIMINATOR
// ------------------------------------------------------------

/**
 * Top-level product category. Used as discriminator in the
 * full Product union schema (added in future phases).
 */
export const ProductCategorySchema = z.enum([
  "modular-switch",
  "fixed-switch",
  // Future categories — placeholders for when you expand:
  "wireless-ap",
  "wireless-controller",
  "physical-appliance",
  "virtual-appliance",
  "saas",
  "optic",
  "cable",
]);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;


export const DeviceCategorySchema = z.enum([
  "switching",
  "security",
  "wireless",
  "routing",
  "management",
  "compute",
  "appliance",
  "saas"
]);
export type DeviceCategory = z.infer<typeof DeviceCategorySchema>;

// ------------------------------------------------------------
// DEVICE TOPOLOGY LAYER
// ------------------------------------------------------------

export const DeviceTypeSchema = z.enum([
  "core",
  "distribution",
  "access",
  "security",
  "wireless",
  "management",
]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

// ------------------------------------------------------------
// PORT SPECIFICATIONS
// ------------------------------------------------------------

export const PortSpeedSchema = z.enum([
  "1G", "2.5G", "10G", "25G", "40G", "50G", "100G", "400G",
]);
export type PortSpeed = z.infer<typeof PortSpeedSchema>;

export const PoEKindSchema = z.union([
  z.literal("PoE+"),
  z.literal("UPOE"),
  z.literal("UPOE+"),
  z.literal(false),
]);
export type PoEKind = z.infer<typeof PoEKindSchema>;

// ------------------------------------------------------------
// SLOT & MODULE TYPES (modular chassis)
// ------------------------------------------------------------

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
export type SlotKind = z.infer<typeof SlotKindSchema>;

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
export type ModuleKind = z.infer<typeof ModuleKindSchema>;

// ------------------------------------------------------------
// LICENSE TIERS (Cisco DNA)
// ------------------------------------------------------------

export const LicenseTierSchema = z.enum([
  "Essentials", "Advantage", "Premier",
]);
export type LicenseTier = z.infer<typeof LicenseTierSchema>;

// ------------------------------------------------------------
// PHYSICAL DIMENSIONS
// ------------------------------------------------------------

export const RackUnitsSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(7), z.literal(10), z.literal(13),
]);
export type RackUnits = z.infer<typeof RackUnitsSchema>;

// ------------------------------------------------------------
// SCHEMA VERSIONING
// ------------------------------------------------------------

/** Current catalog schema version. Bump when making breaking changes. */
export const CURRENT_CATALOG_SCHEMA_VERSION = 1;