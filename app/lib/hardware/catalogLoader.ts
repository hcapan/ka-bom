// app/lib/hardware/catalogLoader.ts
// ============================================================
// CATALOG LOADER — loads + validates JSON catalog files
// ============================================================
// Centralizes all JSON imports and Zod validation. Other code
// should import from here, not directly from JSON files.
//
// Caching: Validates once on first access, then memoizes the
// result for the lifetime of the module. Bundlers tree-shake
// unused exports, so this is efficient.
// ============================================================

import switchingDataRaw from "./data/switching.json";
import slotLayoutsDataRaw from "./data/slot-layouts.json";

import {
  SwitchingCatalogFileSchema,
  SlotLayoutsFileSchema,
  type SwitchingCatalogFile,
  type SlotLayoutsFile,
  type SwitchSeries,
  type SwitchProductSKU,
} from "./schema/switching";

import { ChassisSlotSpec } from "./schema/common";

import { validateOrThrow } from "./validation";

// ------------------------------------------------------------
// LAZY VALIDATION (runs once, caches result)
// ------------------------------------------------------------

let _switchingCatalog: SwitchingCatalogFile | null = null;
let _slotLayouts: SlotLayoutsFile | null = null;

/**
 * Returns the validated switching catalog. Validates on first call,
 * then returns the cached result on subsequent calls.
 *
 * @throws ZodError if switching.json fails schema validation
 */
function getSwitchingCatalog(): SwitchingCatalogFile {
  if (_switchingCatalog === null) {
    _switchingCatalog = validateOrThrow(
      SwitchingCatalogFileSchema,
      switchingDataRaw,
      "switching.json"
    );
  }
  return _switchingCatalog;
}

/**
 * Returns the validated slot layouts. Validates on first call,
 * then returns the cached result on subsequent calls.
 *
 * @throws ZodError if slot-layouts.json fails schema validation
 */
function getSlotLayoutsFile(): SlotLayoutsFile {
  if (_slotLayouts === null) {
    _slotLayouts = validateOrThrow(
      SlotLayoutsFileSchema,
      slotLayoutsDataRaw,
      "slot-layouts.json"
    );
  }
  return _slotLayouts;
}

// ------------------------------------------------------------
// PUBLIC ACCESSORS — Series & PIDs
// ------------------------------------------------------------

/**
 * Returns all switching series as a Record (keyed by series name).
 * This is the JSON-equivalent of HARDWARE_LIBRARY.
 */
export function getSwitchingSeries(): Record<string, SwitchSeries> {
  return getSwitchingCatalog().series;
}

/**
 * Returns a single series by name, or null if not found.
 */
export function getSeriesByName(name: string): SwitchSeries | null {
  return getSwitchingSeries()[name] ?? null;
}

/**
 * Returns all series names (sorted alphabetically).
 */
export function getAllSeriesNames(): string[] {
  return Object.keys(getSwitchingSeries()).sort();
}

/**
 * Returns all series names that should appear in the "Add Device"
 * dropdown — excludes module catalogs (linecards, supervisors, etc.)
 */
export function getAddableSeriesNames(): string[] {
  return Object.entries(getSwitchingSeries())
    .filter(([_, series]) => !series.isModuleCatalog)
    .map(([name]) => name)
    .sort();
}

/**
 * Returns a single PID's full SKU data, or null if not found.
 * Searches across all series.
 */
export function getProductSKU(seriesName: string, pid: string): SwitchProductSKU | null {
  const series = getSeriesByName(seriesName);
  if (!series) return null;
  return series.pids.find((p) => p.pid === pid) ?? null;
}

// ------------------------------------------------------------
// PUBLIC ACCESSORS — Bundles & Faceplates
// ------------------------------------------------------------

/**
 * Returns the chassis bundle for a given series + PID, or null
 * if the PID has no bundle (e.g., it's a module).
 */
export function getBundle(seriesName: string, pid: string) {
  const sku = getProductSKU(seriesName, pid);
  return sku?.bundle ?? null;
}

/**
 * Returns the faceplate config for a given series + PID, or null.
 */
export function getFaceplate(seriesName: string, pid: string) {
  const sku = getProductSKU(seriesName, pid);
  return sku?.faceplate ?? null;
}

/**
 * Returns true if the given series+PID has a configured chassis bundle.
 */
export function hasBundle(seriesName: string, pid: string): boolean {
  return getBundle(seriesName, pid) !== null;
}

// ------------------------------------------------------------
// PUBLIC ACCESSORS — Modular Chassis & Slot Layouts
// ------------------------------------------------------------

/**
 * Returns the slot layout for a chassis PID, or null if not modular.
 */
export function getSlotLayout(chassisPid: string): ChassisSlotSpec[] | null {
  return getSlotLayoutsFile().layouts[chassisPid] ?? null;
}

/**
 * Returns true if the given chassis PID has a defined slot layout.
 */
export function isModularChassis(chassisPid: string): boolean {
  return chassisPid in getSlotLayoutsFile().layouts;
}

/**
 * Returns all chassis PIDs that have slot layouts (i.e., all modular chassis).
 */
export function getModularChassisPids(): string[] {
  return Object.keys(getSlotLayoutsFile().layouts).sort();
}

// ------------------------------------------------------------
// PUBLIC ACCESSORS — Stacking
// ------------------------------------------------------------

/**
 * Returns true if the given series supports stacking.
 */
export function isStackableSeries(seriesName: string): boolean {
  return getSeriesByName(seriesName)?.isStackable === true;
}

/**
 * Returns true if the given series supports StackPower (e.g., Cat 9300).
 */
export function supportsStackPower(seriesName: string): boolean {
  return getSeriesByName(seriesName)?.supportsStackPower === true;
}

/**
 * Returns true if the given series is a module catalog (excluded
 * from "Add Device" dropdown).
 */
export function isModuleCatalogSeries(seriesName: string): boolean {
  return getSeriesByName(seriesName)?.isModuleCatalog === true;
}

/**
 * Returns the default stacking cable PID for a series.
 * Picks the 50cm variant by convention (Cisco's most common ship default).
 * Returns null if the series isn't stackable.
 */
export function getDefaultStackingCable(seriesName: string): string | null {
  const series = getSeriesByName(seriesName);
  if (!series?.isStackable) return null;

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.dataCables;
    if (cables && cables.length > 0) {
      const fiftyCm = cables.find((c) => c.length === "50cm");
      return fiftyCm?.pid ?? cables[0].pid;
    }
  }
  return null;
}

/**
 * Returns the default StackPower cable PID for a series.
 * Returns null if the series doesn't support StackPower.
 */
export function getDefaultStackPowerCable(seriesName: string): string | null {
  const series = getSeriesByName(seriesName);
  if (!series?.supportsStackPower) return null;

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.powerCables;
    if (cables && cables.length > 0) {
      const thirtyCm = cables.find((c) => c.length === "30cm");
      return thirtyCm?.pid ?? cables[0].pid;
    }
  }
  return null;
}

/**
 * Returns all data cables available for stacking in a given series.
 */
export function getStackingCablesForSeries(
  seriesName: string
): { pid: string; length: string }[] {
  const series = getSeriesByName(seriesName);
  if (!series?.isStackable) return [];

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.dataCables;
    if (cables && cables.length > 0) return cables;
  }
  return [];
}

/**
 * Returns all StackPower cables available for a given series.
 */
export function getStackPowerCablesForSeries(
  seriesName: string
): { pid: string; length: string }[] {
  const series = getSeriesByName(seriesName);
  if (!series?.supportsStackPower) return [];

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.powerCables;
    if (cables && cables.length > 0) return cables;
  }
  return [];
}

// ------------------------------------------------------------
// PUBLIC ACCESSORS — Module Catalog Lookups
// ------------------------------------------------------------

/**
 * Returns all module PIDs of a given kind across the entire catalog.
 * Optionally filters by slotKind for slot-compatibility checks.
 *
 * @example
 *   getAvailableModules("supervisor")
 *   // → [{ pid: "C9400-SUP-1", description: "..." }, ...]
 */
export function getAvailableModules(
  kind: SwitchProductSKU["kind"],
  slotKind?: SwitchProductSKU["slotKind"]
): {
  pid: string;
  description: string;
  modulePorts?: SwitchProductSKU["modulePorts"];
}[] {
  const results: {
    pid: string;
    description: string;
    modulePorts?: SwitchProductSKU["modulePorts"];
  }[] = [];

  for (const series of Object.values(getSwitchingSeries())) {
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

/**
 * Looks up a single module across all module catalogs.
 * Returns minimal info (pid, description, kind, compatibleChassis).
 *
 * Used by slot-population logic when only a PID is known.
 */
export function getModule(pid: string): {
  pid: string;
  description: string;
  kind: SwitchProductSKU["slotKind"];
  compatibleChassis?: string[];
} | null {
  for (const series of Object.values(getSwitchingSeries())) {
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

/**
 * Returns all stacking cable PIDs (data + optional StackPower).
 */
export function getStackingCables(
  includeStackPower: boolean = false
): { pid: string; description: string }[] {
  const results: { pid: string; description: string }[] = [];
  for (const series of Object.values(getSwitchingSeries())) {
    for (const sku of series.pids) {
      if (sku.kind === "stacking-cable") {
        results.push({ pid: sku.pid, description: sku.description });
      } else if (includeStackPower && sku.kind === "stack-power-cable") {
        results.push({ pid: sku.pid, description: sku.description });
      }
    }
  }
  return results;
}

// ------------------------------------------------------------
// DEBUG HELPER — for sanity checks during development
// ------------------------------------------------------------

/**
 * Returns a summary of the catalog state. Useful for debugging
 * or displaying in admin/diagnostic UI.
 */
export function getCatalogStats() {
  const series = getSwitchingSeries();
  const seriesNames = Object.keys(series);
  const totalPids = Object.values(series).reduce(
    (sum, s) => sum + s.pids.length,
    0
  );
  const moduleCatalogs = seriesNames.filter(
    (n) => series[n].isModuleCatalog === true
  );
  const stackableSeries = seriesNames.filter(
    (n) => series[n].isStackable === true
  );
  const slotLayouts = Object.keys(getSlotLayoutsFile().layouts);

  return {
    seriesCount: seriesNames.length,
    totalPids,
    moduleCatalogs,
    stackableSeries,
    modularChassisCount: slotLayouts.length,
    modularChassisPids: slotLayouts,
  };
}