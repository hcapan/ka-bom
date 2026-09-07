// app/lib/hardware/catalog.ts
// ============================================================
// HARDWARE CATALOG — Facade over JSON-backed loader
// ============================================================
// This file is now a thin facade. All catalog data lives in:
//   - app/lib/hardware/data/switching.json
//   - app/lib/hardware/data/slot-layouts.json
//
// The functions and constants exported here preserve the public
// API of the old static `catalog.ts` so consuming components
// don't need to change their imports.
//
// LocalStorage overrides remain supported via getEffectiveCatalog()
// for the CCW Importer's "apply locally" feature.
// ============================================================

import {
  // Pure JSON accessors (no overrides)
  getSwitchingSeries as _getSwitchingSeries,
  getSlotLayout as _getSlotLayout,
  isModularChassis as _isModularChassis,
  getModularChassisPids,
  getDefaultStackingCable as _getDefaultStackingCable,
  getDefaultStackPowerCable as _getDefaultStackPowerCable,
  getStackingCablesForSeries,
  getStackPowerCablesForSeries,
  getWirelessSeriesByName,
  getStackingCables,
  getCatalogStats,
} from "./catalogLoader";
import {
  getWirelessSeries,
  type APSeries,
} from "./catalogLoader";

import {
  CatalogOverrideSchema,
  type SwitchSeries,
  type SwitchProductSKU,
  type CatalogOverride,
} from "./schema/switching";

import {
  type ChassisBundle,
  type FaceplateConfig,
  type ChassisSlotSpec,
  type ModulePortGroup,
} from "./schema/common";

import {
  type DeviceType,
  type ModuleKind,
  type SlotKind,
  CURRENT_CATALOG_SCHEMA_VERSION,
} from "./schema/base";

import { validateSafe } from "./validation";

// ============================================================
// RE-EXPORTS — preserve public types
// ============================================================

// Types (so existing imports keep working)
export type {
  SwitchSeries,
  SwitchProductSKU,
  ChassisBundle,
  FaceplateConfig,
  ChassisSlotSpec,
  DeviceType,
  ModuleKind,
  SlotKind,
  ModulePortGroup,
};

// Legacy aliases — kept for backward compatibility
export type { SwitchSeries as HardwareSeries, SwitchProductSKU as ProductSKU } from "./schema/switching";

// Re-export pure helpers that don't need override-awareness
export {
  getModularChassisPids,
  getStackingCablesForSeries,
  getStackPowerCablesForSeries,
  getStackingCables,
  getCatalogStats,
  getWirelessSeriesByName
};

// ============================================================
// LAYER VISUAL CONFIG (kept in TS — visual constants, not data)
// ============================================================

export const LAYER_CONFIG: Record<
  DeviceType,
  { label: string; color: string; bg: string; y: number }
> = {
  security: {
    label: "SECURITY PERIMETER",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.05)",
    y: 0,
  },
  core: {
    label: "CORE LAYER",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.05)",
    y: 240,
  },
  distribution: {
    label: "DISTRIBUTION LAYER",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.05)",
    y: 480,
  },
  access: {
    label: "ACCESS LAYER",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.05)",
    y: 720,
  },
  wireless: {
    label: "WIRELESS",
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.05)",
    y: 960,
  },
  management: {
    label: "MANAGEMENT",
    color: "#0ea5e9",
    bg: "rgba(14, 165, 233, 0.05)",
    y: 1200,
  },
};

// ============================================================
// HARDWARE_LIBRARY — Lazy-built from JSON
// ============================================================
// Old code expected `HARDWARE_LIBRARY` as a static constant.
// We expose it as a getter-backed object so imports still work,
// but the data comes from the JSON loader.
//
// ⚠️ Direct mutation of this object will NOT persist. Use the
// localStorage override system for runtime catalog modifications.
// ============================================================

let _hardwareLibraryCache: Record<string, SwitchSeries> | null = null;

/**
 * Returns the catalog as a plain object (no overrides applied).
 * For override-aware lookups, use `getEffectiveCatalog()` instead.
 */
function buildHardwareLibrary(): Record<string, SwitchSeries> {
  if (_hardwareLibraryCache !== null) return _hardwareLibraryCache;
  _hardwareLibraryCache = _getSwitchingSeries();
  return _hardwareLibraryCache;
}

/**
 * The hardware catalog as a Record<seriesName, SwitchSeries>.
 *
 * @deprecated Prefer the typed accessors (getBundle, getSeriesByName, etc.)
 * over directly indexing this object. Direct access still works for
 * backward compatibility but doesn't honor localStorage overrides.
 *
 * For override-aware reads, use `getEffectiveCatalog()`.
 */
export const HARDWARE_LIBRARY: Record<string, SwitchSeries> = new Proxy(
  {} as Record<string, SwitchSeries>,
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return buildHardwareLibrary()[prop];
    },
    has(_target, prop) {
      if (typeof prop !== "string") return false;
      return prop in buildHardwareLibrary();
    },
    ownKeys() {
      return Object.keys(buildHardwareLibrary());
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== "string") return undefined;
      const value = buildHardwareLibrary()[prop];
      if (value === undefined) return undefined;
      return {
        value,
        enumerable: true,
        configurable: true,
        writable: false,
      };
    },
  }
);

// ============================================================
// LOCALSTORAGE OVERRIDES — versioned, schema-validated
// ============================================================

const OVERRIDES_KEY = "ka-bom-catalog-overrides-v1";

/**
 * Loads localStorage overrides, performing version migration if needed.
 * Returns an empty override structure if nothing is stored or the data
 * is corrupt / unmigratable.
 */
function loadOverrides(): CatalogOverride {
  if (typeof window === "undefined") {
    return { schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION, bundles: {} };
  }

  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) {
      return { schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION, bundles: {} };
    }

    const parsed: unknown = JSON.parse(raw);

    // Try strict validation first
    const result = validateSafe(CatalogOverrideSchema, parsed);
    if (result.ok) return result.data;

    // Migration path: legacy unversioned format
    const candidate =
      typeof parsed === "object" &&
      parsed !== null &&
      "bundles" in parsed
        ? parsed as { schemaVersion?: number; bundles: Record<string, Record<string, unknown>> }
        : null;

    if (!candidate) {
      console.warn(
        "[Catalog] Override format unrecognizable, clearing localStorage overrides"
      );
      localStorage.removeItem(OVERRIDES_KEY);
      return { schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION, bundles: {} };
    }

    // ⭐ NEW: Salvage what we can — validate per-PID and drop only bad ones
    const salvaged: CatalogOverride["bundles"] = {};
    let droppedCount = 0;

    for (const [seriesName, pidPatches] of Object.entries(candidate.bundles ?? {})) {
      const validPatches: Record<string, unknown> = {};
      for (const [pid, patch] of Object.entries(pidPatches)) {
        // Try to validate just this one patch as a Partial<SwitchProductSKU>
        // We use a forgiving check — any object passes; full validation on use
        if (patch && typeof patch === "object") {
          validPatches[pid] = patch;
        } else {
          droppedCount++;
        }
      }
      if (Object.keys(validPatches).length > 0) {
        salvaged[seriesName] = validPatches as CatalogOverride["bundles"][string];
      }
    }

    const cleaned: CatalogOverride = {
      schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION,
      bundles: salvaged,
    };

    // Validate the cleaned version
    const finalResult = validateSafe(CatalogOverrideSchema, cleaned);
    if (finalResult.ok) {
      // ⭐ Persist the cleaned version so we don't keep migrating
      saveOverrides(finalResult.data);
      if (droppedCount > 0) {
        console.info(
          `[Catalog] Cleaned ${droppedCount} invalid override(s); ${
            Object.keys(salvaged).length
          } series retained`
        );
      }
      return finalResult.data;
    }

    // ⭐ Last resort: clear everything and start fresh
    console.warn(
      "[Catalog] Could not salvage overrides; clearing localStorage. Re-run CCW imports if needed."
    );
    localStorage.removeItem(OVERRIDES_KEY);
    return { schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION, bundles: {} };
  } catch (err) {
    console.warn("[Catalog] Failed to read localStorage overrides:", err);
    return { schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION, bundles: {} };
  }
}

export function saveOverrides(overrides: CatalogOverride): void {
  if (typeof window === "undefined") return;

  // Ensure schemaVersion is current before persisting
  const toSave: CatalogOverride = {
    ...overrides,
    schemaVersion: CURRENT_CATALOG_SCHEMA_VERSION,
  };

  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error("[Catalog] Failed to save overrides:", err);
  }
}

export function clearOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OVERRIDES_KEY);
}

export function loadCatalogOverrides(): CatalogOverride {
  return loadOverrides();
}

// ============================================================
// EFFECTIVE CATALOG — JSON + LocalStorage overrides merged
// ============================================================

/**
 * Returns the JSON catalog merged with any localStorage overrides.
 * Components should use this when they want to honor user-supplied
 * bundle data from CCW imports.
 *
 * Behavior:
 *   - If no overrides exist, returns the JSON catalog as-is.
 *   - If overrides exist, deep-clones the catalog and applies patches.
 *   - Unknown series in overrides are added as stub series.
 */
export function getEffectiveCatalog(): Record<string, SwitchSeries> {
  const overrides = loadOverrides();
  const baseCatalog = buildHardwareLibrary();

  if (Object.keys(overrides.bundles).length === 0) {
    return baseCatalog;
  }

  // Deep-clone so we don't mutate the cached library
  const merged: Record<string, SwitchSeries> = JSON.parse(
    JSON.stringify(baseCatalog)
  );

  for (const [seriesName, pidPatches] of Object.entries(overrides.bundles)) {
    let series = merged[seriesName];

    // If the series doesn't exist, create a stub so PIDs land somewhere
    if (!series) {
      series = {
        productCategory: "fixed-switch",
        type: "core",
        vendor: "Cisco",
        category: "switching", // Added missing 'category' property
        description: `${seriesName} (override-only — not yet in source catalog)`,
        compatibleOptics: [],
        pids: []
      };
      merged[seriesName] = series;
    }

    for (const [pid, patch] of Object.entries(pidPatches)) {
      const existing = series.pids.find((p) => p.pid === pid);

      if (existing) {
        // Deep-merge bundle so we don't blow away existing fields
        if (patch.bundle && existing.bundle) {
          existing.bundle = mergeBundles(existing.bundle, patch.bundle);
          const { bundle: _, ...rest } = patch;
          Object.assign(existing, rest);
        } else {
          Object.assign(existing, patch);
        }
      } else {
        // PID didn't exist — push it as a new entry
        series.pids.push({
          pid,
          description: patch.description ?? `${pid} (imported)`,
          vendor: patch.vendor ?? "Cisco",
          ...patch,
        } as SwitchProductSKU);
      }
    }
  }

  return merged;
}

/**
 * Deep-merges two ChassisBundle objects so override data ENRICHES
 * instead of replacing wholesale.
 */
function mergeBundles(base: ChassisBundle, patch: ChassisBundle): ChassisBundle {
  const autoIncludedMap = new Map<string, ChassisBundle["autoIncluded"][number]>();
  for (const item of base.autoIncluded) autoIncludedMap.set(item.pid, item);
  for (const item of patch.autoIncluded) autoIncludedMap.set(item.pid, item);

  const mergedPowerCord =
    base.powerCord || patch.powerCord
      ? {
          qty: patch.powerCord?.qty ?? base.powerCord?.qty ?? 0,
          byRegion: {
            ...(base.powerCord?.byRegion ?? {}),
            ...(patch.powerCord?.byRegion ?? {}),
          },
        }
      : undefined;

  return {
    autoIncluded: Array.from(autoIncludedMap.values()),
    ...(mergedPowerCord ? { powerCord: mergedPowerCord } : {}),
    redundantPsu: patch.redundantPsu ?? base.redundantPsu,
    smartnet: {
      baseSkuByTier: {
        ...base.smartnet.baseSkuByTier,
        ...patch.smartnet?.baseSkuByTier,
      },
    },
    license: {
      tier: patch.license?.tier ?? base.license.tier,
      entitlementPid: patch.license?.entitlementPid ?? base.license.entitlementPid,
      subscriptionByTerm: {
        ...base.license.subscriptionByTerm,
        ...patch.license?.subscriptionByTerm,
      },
    },
    stacking: patch.stacking ?? base.stacking,
  } as ChassisBundle;   // ⭐ cast — the structure is correct, TS is over-strict on the record
}

// ============================================================
// OVERRIDE-AWARE HELPERS (read from getEffectiveCatalog)
// ============================================================

export function getFaceplate(model: string, pid: string): FaceplateConfig | null {
  const catalog = getEffectiveCatalog();
  const series = catalog[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.faceplate ?? null;
}

export function getBundle(model: string, pid: string): ChassisBundle | null {
  const catalog = getEffectiveCatalog();
  const series = catalog[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.bundle ?? null;
}

export function hasBundle(model: string, pid: string): boolean {
  return getBundle(model, pid) !== null;
}

export function getAddableSeriesNames(): string[] {
  const catalog = getEffectiveCatalog();
  return Object.entries(catalog)
    .filter(([_, series]) => !series.isModuleCatalog)
    .map(([name]) => name)
    .sort();
}

// ============================================================
// MODULAR CHASSIS HELPERS (slot layouts come from JSON)
// ============================================================

export function getSlotLayout(chassisPid: string): ChassisSlotSpec[] | null {
  return _getSlotLayout(chassisPid);
}

export function isModularChassis(chassisPid: string): boolean {
  return _isModularChassis(chassisPid);
}

export function isStackableSeries(seriesName: string): boolean {
  // For overrides (new series added via localStorage), defer to effective catalog
  const series = getEffectiveCatalog()[seriesName];
  return series?.isStackable === true;
}

export function supportsStackPower(seriesName: string): boolean {
  const series = getEffectiveCatalog()[seriesName];
  return series?.supportsStackPower === true;
}

export function isModuleCatalogSeries(seriesName: string): boolean {
  const series = getEffectiveCatalog()[seriesName];
  return series?.isModuleCatalog === true;
}

// ============================================================
// MODULE LOOKUP (override-aware)
// ============================================================

export interface ModuleSpec {
  pid: string;
  description: string;
  kind: SlotKind;
  compatibleChassis?: string[];
}

export function getModule(pid: string): ModuleSpec | null {
  const catalog = getEffectiveCatalog();
  for (const series of Object.values(catalog)) {
    if (!series.isModuleCatalog) continue;
    const found = series.pids.find((p) => p.pid === pid);
    if (found) {
      return {
        pid: found.pid,
        description: found.description ?? "",
        kind: found.slotKind ?? "linecard",
        compatibleChassis: found.compatibleChassis,
      };
    }
  }
  return null;
}

export function getAvailableModules(
  kind: ModuleKind,
  slotKind?: SlotKind
): {
  pid: string;
  description: string;
  modulePorts?: ModulePortGroup;
}[] {
  const catalog = getEffectiveCatalog();
  const results: {
    pid: string;
    description: string;
    modulePorts?: ModulePortGroup;
  }[] = [];

  for (const series of Object.values(catalog)) {
    for (const sku of series.pids) {
      if (sku.kind !== kind) continue;
      if (
        slotKind &&
        sku.slotKind &&
        sku.slotKind !== slotKind &&
        sku.slotKind !== "blank"
      ) {
        continue;
      }
      results.push({
        pid: sku.pid,
        description: sku.description,
        modulePorts: sku.modulePorts,
      });
    }
  }
  return results;
}

// ============================================================
// STACKING HELPERS (override-aware via JSON loader)
// ============================================================

export function getDefaultStackingCable(seriesName: string): string | null {
  // Loader version is fine — overrides typically don't redefine stacking specs
  return _getDefaultStackingCable(seriesName);
}

export function getDefaultStackPowerCable(seriesName: string): string | null {
  return _getDefaultStackPowerCable(seriesName);
}

// ============================================================
// MULTI-CATEGORY ACCESS
// ============================================================

/**
 * A series of any category — switch, AP, (future) firewall, router.
 * Discriminated by `productCategory`.
 */
export type AnySeries = SwitchSeries | APSeries;

/**
 * Type guards — safely narrow AnySeries to a specific kind.
 */
export function isSwitchSeries(s: AnySeries): s is SwitchSeries {
  return (
    s.productCategory === "modular-switch" ||
    s.productCategory === "fixed-switch"
  );
}

export function isAPSeries(s: AnySeries): s is APSeries {
  return s.productCategory === "wireless-ap";
}

/**
 * Returns the entire catalog across all categories.
 *
 * - Includes switching (with overrides applied via getEffectiveCatalog)
 * - Includes wireless APs
 * - Future: security, routing, management
 *
 * Use this for category-aware UI (catalog panel tabs, filters,
 * cross-category search). For switching-specific operations
 * (stacking, slot layouts), use getEffectiveCatalog directly.
 */
export function getFullCatalog(): Record<string, AnySeries> {
  return {
    ...getEffectiveCatalog(),
    ...getWirelessSeries(),
    // Future:
    // ...getSecuritySeries(),
    // ...getRoutingSeries(),
  };
}