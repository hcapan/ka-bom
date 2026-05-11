import { ConfiguredDevice } from "../types";

// ============================================================
// BOM LINE — matches CCW import format
// ============================================================
export interface BOMLine {
  /** Cisco Product ID (the SKU) */
  partNumber: string;
  /** Quantity to order */
  quantity: number;
  /** Months — only set for SmartNet & subscription items */
  durationMonths?: number;
  /** Groups child items with their parent chassis */
  groupId?: number;
  /** Internal — which device generated this line (for debugging) */
  sourceDeviceId?: string;
  /** Internal — categorization for display/sorting */
  category: BOMLineCategory;
  /** Internal — readable description (not exported to CCW) */
  description?: string;
}

export type BOMLineCategory =
  | "chassis"
  | "psu"
  | "power-cord"
  | "auto-included"
  | "license-entitlement"
  | "license-subscription"
  | "smartnet"
  | "stack-cable"
  | "stack-power"
  | "stack-adapter"
  | "optic"
  | "other";

// ============================================================
// BUILD RESULT
// ============================================================
export interface BOMBuildResult {
  lines: BOMLine[];
  warnings: BOMWarning[];
  stats: BOMStats;
}

export interface BOMWarning {
  severity: "info" | "warning" | "error";
  message: string;
  deviceId?: string;
  pid?: string;
}

export interface BOMStats {
  totalDevices: number;
  devicesWithBundle: number;
  devicesWithoutBundle: number;
  totalLines: number;
  uniqueSkus: number;
  totalLinks: number;
  totalOptics: number;
}

// ============================================================
// CONTEXT — passed through resolution functions
// ============================================================
export interface ResolverContext {
  device: ConfiguredDevice;
  groupId: number;
  globalDefaults: import("../types").GlobalDefaults;
}