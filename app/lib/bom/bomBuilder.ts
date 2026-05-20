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
  buildSlotLines,
  buildModularPowerCordLines,
  buildGroupStackingLines,
  buildNetworkModuleLines,
  buildModularPsuLines,
  hasModularPsus,
  isStackMember,
} from "./skuResolver";

const STARTING_GROUP_ID = 100000000;

/**
 * Categories that are scoped to a chassis family.
 * Lines from devices with the SAME chassisPid merge.
 * Lines from devices with DIFFERENT chassisPids stay separate.
 */
const CHASSIS_SCOPED_CATEGORIES = new Set<BOMLine["category"]>([
  "auto-included",
  "psu",
  "power-cord",
  "license-entitlement",
  "license-subscription",
  "smartnet",
  "supervisor",
  "linecard",
  "ssd",
  "fabric-module",
  "fan",
  "stack-adapter",
]);

export function buildBOM(project: Project): BOMBuildResult {
  const allLines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  // ⭐ Group ID is per chassis PID (identical chassis share an anchor)
  const groupIdByChassis = new Map<string, number>();
  let nextGroupId = STARTING_GROUP_ID;

  function getGroupIdForChassis(chassisPid: string): number {
    let id = groupIdByChassis.get(chassisPid);
    if (id === undefined) {
      nextGroupId++;
      id = nextGroupId;
      groupIdByChassis.set(chassisPid, id);
    }
    return id;
  }

  let devicesWithBundle = 0;
  let devicesWithoutBundle = 0;

  const groups = project.topology.groups ?? [];

  // ============================================================
  // 1. Walk every device — emit lines, tag with chassisPid
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
    const groupId = getGroupIdForChassis(device.hardware.chassisPid);
    const chassisPid = device.hardware.chassisPid;

    const isModular = hasModularPsus(device);
    const inStackGroup = isStackMember(device, groups);

    const segments = [
      buildChassisLines(device, bundle, groupId),
      buildSmartnetLines(device, bundle, project.globalDefaults),
      buildLicenseLines(device, bundle, project.globalDefaults),
       isModular
    ? buildModularPsuLines(device, bundle)
    : buildPsuLines(device, bundle),
      isModular
        ? buildModularPowerCordLines(device, bundle, project.globalDefaults)
        : buildPowerCordLines(device, bundle, project.globalDefaults),
      buildSlotLines(device),
      buildNetworkModuleLines(device, bundle),   
      inStackGroup ? { lines: [], warnings: [] } : buildStackingLines(device),
    ];

    // ⭐ Tag every line with the chassisPid for aggregation discrimination
    for (const segment of segments) {
      for (const line of segment.lines) {
        if (!line.chassisContext) {
          line.chassisContext = chassisPid;
        }
        if (!line.sourceDeviceId) {
          line.sourceDeviceId = device.id;
        }
      }
      allLines.push(...segment.lines);
      warnings.push(...segment.warnings);
    }
  }

  // ============================================================
  // 2. Stack groups
  // ============================================================
  for (const group of groups) {
    if (group.kind !== "stack") continue;

    const memberCount = project.topology.devices.filter(
      (d) => d.parentGroupId === group.id || d.groupId === group.id,
    ).length;

    const stackResult = buildGroupStackingLines(group, memberCount);
    allLines.push(...stackResult.lines);
    warnings.push(...stackResult.warnings);
  }

  // ============================================================
  // 3. Optics — global aggregation
  // ============================================================
  const opticLines = buildOpticLines(project.topology.links, warnings);
  allLines.push(...opticLines);

  // ============================================================
  // 4. Aggregate
  // ============================================================
  const aggregated = aggregateLines(allLines);

  // ============================================================
  // 5. Stats
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
// OPTICS
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
// AGGREGATION
//   • Chassis-scoped lines: merge across same chassisPid, separate across different
//   • Optics, stack-cables: merge globally
//   • Anchor (chassis itself): merge globally (same PID = same anchor)
// ============================================================
function aggregateLines(lines: BOMLine[]): BOMLine[] {
  const map = new Map<string, BOMLine>();

  for (const line of lines) {
    const isChassisScoped = CHASSIS_SCOPED_CATEGORIES.has(line.category);

    const scopeKey = isChassisScoped
      ? line.chassisContext ?? "no-chassis"
      : "global";

    const key = [
      line.partNumber,
      line.durationMonths ?? "none",
      line.slotId ?? "no-slot",
      scopeKey,
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
// SORT
// ============================================================
const CATEGORY_ORDER: Record<BOMLine["category"], number> = {
  chassis: 1,
  "license-entitlement": 2,
  "license-subscription": 3,
  smartnet: 4,
  "power-cord": 5,
  psu: 6,
  supervisor: 7,
  ssd: 8,
  "fabric-module": 9,
  linecard: 10,
  fan: 11,
  "auto-included": 12,
  "stack-adapter": 13,
  "stack-cable": 14,
  "stack-power": 15,
  optic: 16,
  other: 99,
};

export function sortBOMLines(lines: BOMLine[]): BOMLine[] {
  return [...lines].sort((a, b) => {
    // Sort by chassis context first so each family's lines stay together
    const ca_ctx = a.chassisContext ?? "zzz-global";
    const cb_ctx = b.chassisContext ?? "zzz-global";
    if (ca_ctx !== cb_ctx) return ca_ctx.localeCompare(cb_ctx);

    const ca = CATEGORY_ORDER[a.category] ?? 99;
    const cb = CATEGORY_ORDER[b.category] ?? 99;
    if (ca !== cb) return ca - cb;

    return a.partNumber.localeCompare(b.partNumber);
  });
}