import { Project, Link } from "../types";
import { getBundle } from "../hardware";
import {
  BOMLine,
  BOMBuildResult,
  BOMWarning,
} from "./types";
import {
  buildChassisLines,
  buildPsuLines,
  buildPowerCordLines,
  buildLicenseLines,
  buildSmartnetLines,
  buildStackingLines,
} from "./skuResolver";

const STARTING_GROUP_ID = 100000000;

/**
 * Builds a complete BOM from a Project.
 * Returns flat lines, warnings, and stats.
 */
export function buildBOM(project: Project): BOMBuildResult {
  const allLines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];
  let groupCounter = STARTING_GROUP_ID;

  let devicesWithBundle = 0;
  let devicesWithoutBundle = 0;

  // ============================================================
  // 1. Walk every device
  // ============================================================
  for (const device of project.topology.devices) {
    const bundle = getBundle(
      device.hardware.series,
      device.hardware.chassisPid
    );

    if (!bundle) {
      devicesWithoutBundle++;
      warnings.push({
        severity: "warning",
        deviceId: device.id,
        pid: device.hardware.chassisPid,
        message: `Device "${device.name}" (${device.hardware.chassisPid}) has no CCW bundle defined. Skipped from BOM.`,
      });
      continue;
    }

    devicesWithBundle++;
    const groupId = ++groupCounter;

    // Build all line groups for this device
    const segments = [
      buildChassisLines(device, bundle, groupId),
      buildPsuLines(device, bundle),
      buildPowerCordLines(device, bundle, project.globalDefaults),
      buildLicenseLines(device, bundle, project.globalDefaults),
      buildSmartnetLines(device, bundle, project.globalDefaults),
      buildStackingLines(device),
    ];

    for (const segment of segments) {
      allLines.push(...segment.lines);
      warnings.push(...segment.warnings);
    }
  }

  // ============================================================
  // 2. Walk every link → optics
  // ============================================================
  const opticLines = buildOpticLines(project.topology.links, warnings);
  allLines.push(...opticLines);

  // ============================================================
  // 3. Aggregate identical PIDs
  // ============================================================
  const aggregated = aggregateLines(allLines);

  // ============================================================
  // 4. Compute stats
  // ============================================================
  const stats = {
    totalDevices: project.topology.devices.length,
    devicesWithBundle,
    devicesWithoutBundle,
    totalLines: aggregated.length,
    uniqueSkus: new Set(aggregated.map((l) => l.partNumber)).size,
    totalLinks: project.topology.links.length,
    totalOptics: opticLines.reduce((sum, l) => sum + l.quantity, 0),
  };

  return { lines: aggregated, warnings, stats };
}

// ============================================================
// OPTICS — 2 per link, with "=" suffix
// ============================================================
function buildOpticLines(links: Link[], warnings: BOMWarning[]): BOMLine[] {
  const opticCounts = new Map<string, number>();

  for (const link of links) {
    const basePid = link.optic.pid;
    if (!basePid) {
      warnings.push({
        severity: "warning",
        message: `Link ${link.id} has no optic defined.`,
      });
      continue;
    }

    // CCW expects "=" suffix for standalone/spare optics
    const opticPid = basePid.endsWith("=") ? basePid : `${basePid}=`;
    const qty = link.optic.quantityPerLink ?? 2;
    opticCounts.set(opticPid, (opticCounts.get(opticPid) ?? 0) + qty);
  }

  return Array.from(opticCounts.entries()).map<BOMLine>(([pid, qty]) => ({
    partNumber: pid,
    quantity: qty,
    category: "optic",
  }));
}

// ============================================================
// AGGREGATION — sum identical PIDs
// (preserves group IDs and durations on first occurrence)
// ============================================================
function aggregateLines(lines: BOMLine[]): BOMLine[] {
  const map = new Map<string, BOMLine>();

  for (const line of lines) {
    // Aggregation key: PID + duration (lines with different durations don't merge)
    const key = `${line.partNumber}|${line.durationMonths ?? "none"}`;
    const existing = map.get(key);

    if (existing) {
      existing.quantity += line.quantity;
      // Preserve groupId only on the first (chassis) line
    } else {
      map.set(key, { ...line });
    }
  }

  return Array.from(map.values());
}

// ============================================================
// SORT — for predictable display order
// ============================================================
const CATEGORY_ORDER: Record<BOMLine["category"], number> = {
  chassis: 1,
  "license-entitlement": 2,
  "license-subscription": 3,
  smartnet: 4,
  "power-cord": 5,
  psu: 6,
  "auto-included": 7,
  "stack-adapter": 8,
  "stack-cable": 9,
  "stack-power": 10,
  optic: 11,
  other: 99,
};

export function sortBOMLines(lines: BOMLine[]): BOMLine[] {
  return [...lines].sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] ?? 99;
    const cb = CATEGORY_ORDER[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.partNumber.localeCompare(b.partNumber);
  });
}