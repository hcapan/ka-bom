import {
  HARDWARE_LIBRARY,
  ChassisBundle,
  getBundle,
  getModule,
} from "../hardware/catalog";
import {
  ConfiguredDevice,
  GlobalDefaults,
  ContractTermYears,
  SmartnetTier,
  Region,
  SlotKind,
  DeviceGroup,
} from "../types";
import { BOMLine, BOMWarning ,BOMLineCategory} from "./types";

// ============================================================
// EFFECTIVE VALUE RESOLVERS
// (device override → global default)
// ============================================================
export function getEffectiveRegion(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults
): Region {
  return device.hardware.region ?? globalDefaults.region;
}

export function getEffectiveLicenseTerm(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults
): ContractTermYears {
  return device.license?.termYears ?? globalDefaults.licenseTermYears;
}

export function getEffectiveSmartnetTier(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults
): SmartnetTier {
  return device.smartnet?.tier ?? globalDefaults.smartnetTier;
}

export function getEffectiveSmartnetTerm(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults
): ContractTermYears {
  return device.smartnet?.termYears ?? globalDefaults.smartnetTermYears;
}

// ============================================================
// CHASSIS LOOKUP
// ============================================================
export function getChassisInfo(device: ConfiguredDevice) {
  const series = HARDWARE_LIBRARY[device.hardware.series];
  if (!series) return null;
  const product = series.pids.find(
    (p) => p.pid === device.hardware.chassisPid
  );
  if (!product) return null;
  return { series, product };
}

// ============================================================
// SHARED RESULT TYPE — used by every line builder below
// ============================================================
type Result = { lines: BOMLine[]; warnings: BOMWarning[] };

// ============================================================
// LINE BUILDERS — each returns lines + warnings
// ============================================================

/**
 * Builds the chassis line itself + all auto-included items.
 */
export function buildChassisLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  groupId: number
): Result {
  const excluded = new Set(device.hardware.excludedAutoIncludes ?? []);

  const lines: BOMLine[] = [
    {
      partNumber: device.hardware.chassisPid,
      quantity: 1,
      groupId,
      sourceDeviceId: device.id,
      category: "chassis",
      description: `${device.hardware.series} chassis`,
    },
    ...bundle.autoIncluded
      .filter((item) => !excluded.has(item.pid))
      .map<BOMLine>((item) => ({
        partNumber: item.pid,
        quantity: item.qty,
        sourceDeviceId: device.id,
        category: "auto-included",
        description: item.note,
      })),
  ];
  return { lines, warnings: [] };
}

/**
 * Builds the redundant PSU line if user opted in.
 */
export function buildPsuLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle
): Result {
  if (!device.hardware.redundantPsu || !bundle.redundantPsu) {
    return { lines: [], warnings: [] };
  }
  return {
    lines: [
      {
        partNumber: bundle.redundantPsu.pid,
        quantity: 1,
        sourceDeviceId: device.id,
        category: "psu",
        description: bundle.redundantPsu.description,
      },
    ],
    warnings: [],
  };
}

/**
 * Builds the power cord line.
 * Quantity auto-scales: 1 cord per PSU (1 if no redundancy, 2 if redundant PSU).
 */
export function buildPowerCordLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults
): Result {
  const region = getEffectiveRegion(device, globalDefaults);
  const cordPid = bundle.powerCord.byRegion[region];
  const warnings: BOMWarning[] = [];

  if (!cordPid) {
    warnings.push({
      severity: "warning",
      deviceId: device.id,
      message: `No power cord defined for region "${region}". Using fallback.`,
    });
    const fallbackPid = Object.values(bundle.powerCord.byRegion)[0];
    if (!fallbackPid) {
      return { lines: [], warnings };
    }
    return buildPowerCordLine(device, fallbackPid, bundle, warnings);
  }

  return buildPowerCordLine(device, cordPid, bundle, warnings);
}

function buildPowerCordLine(
  device: ConfiguredDevice,
  cordPid: string,
  bundle: ChassisBundle,
  warnings: BOMWarning[]
): Result {
  const psuCount = device.hardware.redundantPsu ? 2 : 1;
  const qty = Math.min(psuCount, bundle.powerCord.qty);

  return {
    lines: [
      {
        partNumber: cordPid,
        quantity: qty,
        sourceDeviceId: device.id,
        category: "power-cord",
      },
    ],
    warnings,
  };
}

/**
 * Builds the license entitlement + subscription lines.
 */
export function buildLicenseLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults
): Result {
  const term = getEffectiveLicenseTerm(device, globalDefaults);
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  lines.push({
    partNumber: bundle.license.entitlementPid,
    quantity: 1,
    sourceDeviceId: device.id,
    category: "license-entitlement",
    description: `${bundle.license.tier} entitlement`,
  });

  const subPid = bundle.license.subscriptionByTerm[term];
  if (!subPid) {
    warnings.push({
      severity: "warning",
      deviceId: device.id,
      message: `No ${term}Y subscription defined for ${bundle.license.tier} on ${device.hardware.chassisPid}.`,
    });
  } else {
    lines.push({
      partNumber: subPid,
      quantity: 1,
      durationMonths: term * 12,
      sourceDeviceId: device.id,
      category: "license-subscription",
      description: `${bundle.license.tier} ${term}Y subscription`,
    });
  }

  return { lines, warnings };
}

/**
 * Builds the SmartNet line.
 */
export function buildSmartnetLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults
): Result {
  const tier = getEffectiveSmartnetTier(device, globalDefaults);
  const term = getEffectiveSmartnetTerm(device, globalDefaults);

  if (tier === "NONE") {
    return { lines: [], warnings: [] };
  }

  const snPid = bundle.smartnet.baseSkuByTier[tier];
  if (!snPid) {
    return {
      lines: [],
      warnings: [
        {
          severity: "warning",
          deviceId: device.id,
          message: `No SmartNet PID defined for tier "${tier}" on ${device.hardware.chassisPid}.`,
        },
      ],
    };
  }

  return {
    lines: [
      {
        partNumber: snPid,
        quantity: 1,
        durationMonths: term * 12,
        sourceDeviceId: device.id,
        category: "smartnet",
        description: `${tier} ${term}Y service contract`,
      },
    ],
    warnings: [],
  };
}

/**
 * Legacy per-device stacking (fixed-config only).
 * For group-level stacks, see buildGroupStackingLines below.
 */
export function buildStackingLines(device: ConfiguredDevice): Result {
  const cfg = device.hardware.stacking;
  if (!cfg?.enabled) return { lines: [], warnings: [] };

  const lines: BOMLine[] = [];

  if (cfg.adapterKitPid) {
    lines.push({
      partNumber: cfg.adapterKitPid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: "stack-adapter",
    });
  }
  if (cfg.dataCablePid) {
    lines.push({
      partNumber: cfg.dataCablePid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: "stack-cable",
    });
  }
  if (cfg.powerCablePid) {
    lines.push({
      partNumber: cfg.powerCablePid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: "stack-power",
    });
  }

  return { lines, warnings: [] };
}

// ============================================================
// HELPER: full check whether device is BOM-ready
// ============================================================
export function isBomReady(device: ConfiguredDevice): boolean {
  return getBundle(device.hardware.series, device.hardware.chassisPid) !== null;
}
// ============================================================================
// SPRINT M2 ADDITIONS — Modular chassis & group-level stacking
// ============================================================================

const SLOT_KIND_ORDER: Record<SlotKind, number> = {
  psu: 1,
  supervisor: 2,
  ssd: 3,
  "fabric-module": 4,
  linecard: 5,
  fan: 6,
  blank: 99,
};

function categoryForSlotKind(kind: SlotKind): BOMLineCategory {
  switch (kind) {
    case "supervisor":    return "supervisor";
    case "linecard":      return "linecard";
    case "fabric-module": return "fabric-module";
    case "psu":           return "psu";
    case "ssd":           return "ssd";
    case "fan":           return "fan";
    default:              return "other";
  }
}
/**
 * Builds BOM lines for every populated slot in a modular chassis.
 * - Skips empty slots (no modulePid)
 * - Skips slots whose PID appears in excludedAutoIncludes
 * - Preserves slot identity via line.slotId so aggregation doesn't merge
 *   two physically distinct components (e.g., two SSDs in two supervisors).
 */
export function buildSlotLines(device: ConfiguredDevice): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  const slots = device.hardware.slots;
  if (!slots || slots.length === 0) {
    return { lines, warnings };
  }

  const excluded = new Set(device.hardware.excludedAutoIncludes ?? []);

  const sorted = [...slots].sort((a, b) => {
    const ka = SLOT_KIND_ORDER[a.slotKind] ?? 50;
    const kb = SLOT_KIND_ORDER[b.slotKind] ?? 50;
    if (ka !== kb) return ka - kb;
    return a.slotId.localeCompare(b.slotId, undefined, { numeric: true });
  });

  for (const slot of sorted) {
    if (!slot.modulePid) continue;
    if (excluded.has(slot.modulePid)) continue;

    const moduleSpec = getModule(slot.modulePid);

    if (!moduleSpec) {
      warnings.push({
        severity: "warning",
        deviceId: device.id,
        message: `Module "${slot.modulePid}" in slot ${slot.slotId} not found in catalog. Emitting line anyway.`,
      });
    }

    lines.push({
      partNumber: slot.modulePid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: categoryForSlotKind(slot.slotKind),
      slotId: slot.slotId,
      description:
        moduleSpec?.description ?? `Slot ${slot.slotId} (${slot.slotKind})`,
    });
  }

  return { lines, warnings };
}

/**
 * Returns true if the device's slots[] contains any populated PSU slots.
 * Used by bomBuilder to skip the legacy buildPsuLines path.
 */
export function hasModularPsus(device: ConfiguredDevice): boolean {
  return !!device.hardware.slots?.some(
    (s) => s.slotKind === "psu" && s.modulePid
  );
}

/**
 * Modular-aware power cord builder.
 * Quantity = number of populated PSU slots.
 */
export function buildModularPowerCordLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults
): Result {
  const psuSlots =
    device.hardware.slots?.filter(
      (s) => s.slotKind === "psu" && s.modulePid
    ) ?? [];

  if (psuSlots.length === 0) return { lines: [], warnings: [] };

  const region = getEffectiveRegion(device, globalDefaults);
  const warnings: BOMWarning[] = [];
  let cordPid = bundle.powerCord.byRegion[region];

  if (!cordPid) {
    warnings.push({
      severity: "warning",
      deviceId: device.id,
      message: `No power cord defined for region "${region}". Using fallback.`,
    });
    cordPid = Object.values(bundle.powerCord.byRegion)[0];
    if (!cordPid) return { lines: [], warnings };
  }

  if (device.hardware.excludedAutoIncludes?.includes(cordPid)) {
    return { lines: [], warnings };
  }

  return {
    lines: [
      {
        partNumber: cordPid,
        quantity: psuSlots.length,
        sourceDeviceId: device.id,
        category: "power-cord",
      },
    ],
    warnings,
  };
}

// ----------------------------------------------------------------------------
// GROUP-LEVEL STACKING
// One stack-cable line per group, qty = stackingCableQty override OR memberCount.
// Optional StackPower line if explicitly set on the group.
// ----------------------------------------------------------------------------

const DEFAULT_STACK_CABLE_PID = "STACK-T1-50CM";

export function buildGroupStackingLines(
  group: DeviceGroup,
  memberCount: number
): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  if (group.groupKind !== "stack") return { lines, warnings };
  if (memberCount < 2) {
    if (memberCount === 1) {
      warnings.push({
        severity: "info",
        message: `Stack group "${group.label}" has only 1 member. No stacking cables emitted.`,
      });
    }
    return { lines, warnings };
  }

  const cablePid = group.stackingCablePid ?? DEFAULT_STACK_CABLE_PID;
  // Honor explicit override on the group; fall back to ring topology (= memberCount)
  const cableQty = group.stackingCableQty ?? memberCount;

  lines.push({
    partNumber: cablePid,
    quantity: cableQty,
    category: "stack-cable",
    description: `Stack data cable (${memberCount}-member stack)`,
  });

  if (group.stackPowerCablePid) {
    const powerQty = group.stackPowerCableQty ?? memberCount;
    lines.push({
      partNumber: group.stackPowerCablePid,
      quantity: powerQty,
      category: "stack-power",
      description: `StackPower cable (${memberCount}-member stack)`,
    });
  }

  return { lines, warnings };
}

/**
 * Returns true if the device is a member of any stack group.
 * Uses device-side membership (device.groupId → group lookup).
 *
 * ⚠️ If your ConfiguredDevice uses a different field name
 *    (e.g., parentGroupId, parentId), change `device.groupId` below.
 */
export function isStackMember(
  device: ConfiguredDevice,
  groups: DeviceGroup[]
): boolean {
  if (!device.parentGroupId) return false;
  const group = groups.find((g) => g.id === device.parentGroupId);
  return group?.groupKind === "stack";
}

export function countGroupMembers(
  group: DeviceGroup,
  devices: ConfiguredDevice[]
): number {
  return devices.filter((d) => d.parentGroupId === group.id).length;
}