import { Project, Link, ConfiguredDevice } from "../types";
import { getBundle } from "../hardware/catalog";
import { BOMLine, BOMBuildResult, BOMWarning } from "./types";
import {
  buildChassisLines,
  buildPsuLines,
  buildPowerCordLines,
  buildLicenseLines,
  buildSmartnetLines,
  buildStackingLines,
  // ⭐ M2 imports
  buildSlotLines,
  buildModularPowerCordLines,
  buildGroupStackingLines,
  hasModularPsus,
  isStackMember,
} from "./skuResolver";

const STARTING_GROUP_ID = 100000000;

export function buildBOM(project: Project): BOMBuildResult {
  const allLines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];
  let groupCounter = STARTING_GROUP_ID;

  let devicesWithBundle = 0;
  let devicesWithoutBundle = 0;

  const groups = project.topology.groups ?? [];

  // ============================================================
  // 1. Walk every device
  // ============================================================
  for (const device of project.topology.devices) {
    const bundle = getBundle(
      device.hardware.series,
      device.hardware.chassisPid,
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

    // ⭐ CHANGE 1: Modular-aware segment selection
    const isModular = hasModularPsus(device);
    const inStackGroup = isStackMember(device, groups);

    const segments = [
      buildChassisLines(device, bundle, groupId),
      buildSmartnetLines(device, bundle, project.globalDefaults),
      buildLicenseLines(device, bundle, project.globalDefaults),

      // PSU + power cord: choose modular or fixed-config path
      isModular
        ? { lines: [], warnings: [] } // PSUs come from slots
        : buildPsuLines(device, bundle),

      isModular
        ? buildModularPowerCordLines(device, bundle, project.globalDefaults)
        : buildPowerCordLines(device, bundle, project.globalDefaults),

      // Slot explosion (no-op for fixed-config)
      buildSlotLines(device),

      // Legacy per-device stacking, only if NOT in a stack group
      inStackGroup ? { lines: [], warnings: [] } : buildStackingLines(device),
    ];

    for (const segment of segments) {
      allLines.push(...segment.lines);
      warnings.push(...segment.warnings);
    }
  }

  // ============================================================
  // ⭐ CHANGE 2: Walk stack groups → emit cables once per group
  // ============================================================
  for (const group of groups) {
  if (group.groupKind !== "stack") continue;

  // Count devices whose parentGroupId matches this group's id
  const memberCount = project.topology.devices.filter(
    (d) => d.parentGroupId === group.id
  ).length;

  const stackResult = buildGroupStackingLines(group, memberCount);
  allLines.push(...stackResult.lines);
  warnings.push(...stackResult.warnings);
}
  // ============================================================
  // 2. Walk every link → optics  (UNCHANGED)
  // ============================================================
  const opticLines = buildOpticLines(project.topology.links, warnings);
  allLines.push(...opticLines);

  // ============================================================
  // 3. Aggregate identical PIDs
  // ============================================================
  const aggregated = aggregateLines(allLines);

  // ============================================================
  // 4. Stats  (UNCHANGED)
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
// OPTICS — UNCHANGED
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
// ⭐ CHANGE 3: Aggregation now respects slotId
// Two C9400-SSD-480GB lines in different supervisor slots stay separate,
// matching CCW's row-preserving behavior.
// ============================================================
function aggregateLines(lines: BOMLine[]): BOMLine[] {
  const map = new Map<string, BOMLine>();

  for (const line of lines) {
    const key = [
      line.partNumber,
      line.durationMonths ?? "none",
      line.slotId ?? "no-slot", // ← this line should exist
    ].join("|");

    const existing = map.get(key);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      map.set(key, { ...line });
    }
  }

  return Array.from(map.values());
}

// ============================================================
// SORT — extended with new categories
// ============================================================
const CATEGORY_ORDER: Record<BOMLine["category"], number> = {
  chassis: 1,
  "license-entitlement": 2,
  "license-subscription": 3,
  smartnet: 4,
  "power-cord": 5,
  psu: 6,
  // ⭐ M2 modular components — emitted in CCW export order
  supervisor: 7,
  ssd: 8,
  "fabric-module": 9,
  linecard: 10,
  fan: 11,
  // legacy
  "auto-included": 12,
  "stack-adapter": 13,
  "stack-cable": 14,
  "stack-power": 15,
  optic: 16,
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
