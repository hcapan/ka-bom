// app/lib/hardware/schema/wireless.ts
// ============================================================
// WIRELESS SCHEMA — Access Points and (future) Wireless Controllers
// ============================================================

import { z } from "zod";
import {
  CURRENT_CATALOG_SCHEMA_VERSION,
  DeviceCategorySchema,
} from "./base";
import { BaseProductSchema, ChassisBundleSchema } from "./common";

// ------------------------------------------------------------
// AP-SPECIFIC ATTRIBUTES (for catalog filter chips)
// ------------------------------------------------------------

export const APAttrsSchema = z.object({
  kind: z.literal("access-point"),
  wifiStandard: z.enum(["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"]),
  radios: z.enum(["dual-band", "tri-band", "quad-radio"]),
  antenna: z.enum(["internal", "external"]),
  outdoor: z.boolean(),
  poeRequirement: z.enum(["PoE+", "UPOE", "DC"]),
  // optional — useful for filtering by deployment scenario
  maxClients: z.number().int().positive().optional(),
});
export type APAttrs = z.infer<typeof APAttrsSchema>;

// ------------------------------------------------------------
// AP PRODUCT SKU
// ------------------------------------------------------------

export const APProductSKUSchema = BaseProductSchema.extend({
  bundle: ChassisBundleSchema.optional(),
  attrs: APAttrsSchema.optional(),
  // No faceplate for APs — AccessPointNode renders a simple icon
});
export type APProductSKU = z.infer<typeof APProductSKUSchema>;

// ------------------------------------------------------------
// AP SERIES (e.g., "Catalyst 9100 Access Points")
// ------------------------------------------------------------

export const APSeriesSchema = z.object({
  productCategory: z.literal("wireless-ap"),
  category: DeviceCategorySchema.default("wireless"),
  type: z.literal("wireless"),
  vendor: z.string().min(1),
  description: z.string(),
  pids: z.array(APProductSKUSchema),
  // For future controller-pair validation
  compatibleControllers: z.array(z.string()).optional(),
});
export type APSeries = z.infer<typeof APSeriesSchema>;

// ------------------------------------------------------------
// CATALOG FILE SHAPE
// ------------------------------------------------------------

export const WirelessCatalogFileSchema = z.object({
  schemaVersion: z.literal(CURRENT_CATALOG_SCHEMA_VERSION),
  meta: z
    .object({
      generatedAt: z.string().optional(),
      description: z.string().optional(),
      sourceFile: z.string().optional(),
    })
    .optional(),
  series: z.record(z.string(), APSeriesSchema),
});
export type WirelessCatalogFile = z.infer<typeof WirelessCatalogFileSchema>;