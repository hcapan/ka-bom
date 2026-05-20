import {
  ChassisBundle,
  getBundle,
  getEffectiveCatalog,
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
import { BOMLine, BOMWarning, BOMLineCategory } from "./types";
// ⭐ NEW: PSU helpers
import {
  emitPsuLines as emitPsuLinesFromHelper,
  bundleUsesPsuOptions,
} from "./psuEmitter";
import {
  emitNetworkModuleLines,
} from "./networkModuleEmitter";
import { bundleUsesPsuConfig, emitModularPsuLines } from "./modularPsuEmitter";
import { getChassisSlotLayout,getSecondaryModulePid } from "../hardware/chassisHelpers";


// ============================================================
// EFFECTIVE VALUE RESOLVERS
// ============================================================
export function getEffectiveRegion(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults,
): Region {
  return device.hardware.region ?? globalDefaults.region;
}

export function getEffectiveLicenseTerm(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults,
): ContractTermYears {
  return device.license?.termYears ?? globalDefaults.licenseTermYears;
}

export function getEffectiveSmartnetTier(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults,
): SmartnetTier {
  return device.smartnet?.tier ?? globalDefaults.smartnetTier;
}

export function getEffectiveSmartnetTerm(
  device: ConfiguredDevice,
  globalDefaults: GlobalDefaults,
): ContractTermYears {
  return device.smartnet?.termYears ?? globalDefaults.smartnetTermYears;
}

// ============================================================
// CHASSIS LOOKUP
// ============================================================
export function getChassisInfo(device: ConfiguredDevice) {
  const catalog = getEffectiveCatalog()
  const series = catalog[device.hardware.series];
  if (!series) return null;
  const product = series.pids.find(
    (p) => p.pid === device.hardware.chassisPid,
  );
  if (!product) return null;
  return { series, product };
}

// ============================================================
// SHARED RESULT TYPE
// ============================================================
type Result = { lines: BOMLine[]; warnings: BOMWarning[] };

// ⭐ NEW: helper to detect PSU PIDs in autoIncluded[]
function isPsuPid(pid: string): boolean {
  return /^C9K-PWR-/i.test(pid);
}

// ============================================================
// LINE BUILDERS
// ============================================================

/**
 * Returns true if the device's chassis uses the modular psuConfig pattern
 * (count + SKU model picker). Used to switch BOM emission paths.
 */



/**
 * Builds the chassis line + auto-included items.
 * ⭐ Skips PSU PIDs from autoIncluded when bundle uses the new psuOptions
 *    shape (those are emitted by buildPsuLines instead).
 */
export function buildChassisLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  groupId: number,
): Result {
  const excluded = new Set(device.hardware.excludedAutoIncludes ?? []);
  const usesNewPsuShape = bundleUsesPsuOptions(bundle);
  const supervisorSlotIds = getPopulatedSupervisorSlotIds(device);

  const lines: BOMLine[] = [
    {
      partNumber: device.hardware.chassisPid,
      quantity: 1,
      groupId,
      sourceDeviceId: device.id,
      category: "chassis",
      description: `${device.hardware.series} chassis`,
    },
  ];

  for (const item of bundle.autoIncluded ?? []) {
    if (excluded.has(item.pid)) continue;
    if (usesNewPsuShape && isPsuPid(item.pid)) continue;

    // ⭐ Per-supervisor PIDs: emit ONE line per supervisor slot,
    //    each tagged with the supervisor's slotId for unique aggregation key
    if (PER_SUPERVISOR_PIDS.has(item.pid)) {
      if (supervisorSlotIds.length === 0) {
        // Fallback: no supervisors populated, still emit qty 1
        lines.push({
          partNumber: item.pid,
          quantity: item.qty,
          sourceDeviceId: device.id,
          category: "auto-included",
          description: item.note,
        });
      } else {
        for (const supSlotId of supervisorSlotIds) {
          lines.push({
            partNumber: item.pid,
            quantity: 1,
            sourceDeviceId: device.id,
            category: "auto-included",
            slotId: `sup-${supSlotId}-ssd`, // ⭐ unique per supervisor
            description: item.note,
          });
        }
      }
      continue;
    }

    // Regular auto-included items
    lines.push({
      partNumber: item.pid,
      quantity: item.qty,
      sourceDeviceId: device.id,
      category: "auto-included",
      description: item.note,
    });
  }

  return { lines, warnings: [] };
}


/**
 * Builds the network module line for fixed-switch chassis.
 * No-op for chassis without networkModuleOptions in catalog.
 */
export function buildNetworkModuleLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  const moduleLines = emitNetworkModuleLines(device, bundle);
  for (const line of moduleLines) {
    lines.push({
      partNumber: line.pid,
      quantity: line.qty,
      sourceDeviceId: device.id,
      category: "auto-included",   // groups with other auto-include items in BOM
      description: line.description,
    });
  }

  return { lines, warnings };
}


/**
 * Builds PSU lines.
 * ⭐ Two paths:
 *   1. New schema (psuOptions): emits primary + redundant /2 OR SPS-NONE
 *   2. Legacy schema (redundantPsu): emits redundant /2 only when toggled on
 *      (primary PSU comes from autoIncluded[] in legacy bundles)
 */
export function buildPsuLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  // ⭐ NEW PATH: psuOptions
  if (bundleUsesPsuOptions(bundle)) {
    const psuLines = emitPsuLinesFromHelper(device, bundle);
    for (const line of psuLines) {
      lines.push({
        partNumber: line.pid,
        quantity: line.qty,
        sourceDeviceId: device.id,
        category: "psu",
        description: line.description,
      });
    }
    return { lines, warnings };
  }

  // ⭐ LEGACY PATH: redundantPsu
  if (device.hardware.redundantPsu && bundle.redundantPsu) {
    lines.push({
      partNumber: bundle.redundantPsu.pid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: "psu",
      description: bundle.redundantPsu.description,
    });
  }

  return { lines, warnings };
}


/**
 * PIDs that should emit ONE line PER populated supervisor slot
 * (not aggregated). CCW expects separate rows for these.
 */
const PER_SUPERVISOR_PIDS = new Set([
  "C9400-SSD-NONE",
]);

function getPopulatedSupervisorSlotIds(device: ConfiguredDevice): string[] {
  return (device.hardware.slots ?? [])
    .filter((s) => s.slotKind === "supervisor" && s.modulePid)
    .map((s) => s.slotId);
}

/**
 * Builds the power cord line.
 * Quantity = 1 cord per PSU (1 if no redundancy, 2 if redundant).
 */
export function buildPowerCordLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults,
): Result {
  // ⭐ Defensive: powerCord may be optional in your new schema
  if (!bundle.powerCord) return { lines: [], warnings: [] };

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
  warnings: BOMWarning[],
): Result {
  if (!bundle.powerCord) return { lines: [], warnings };

  const psuCount = device.hardware.redundantPsu ? 2 : 1;
  const cordsPerPsu = bundle.powerCord.qty ?? 1;
  const totalCords = psuCount * cordsPerPsu;

  return {
    lines: [
      {
        partNumber: cordPid,
        quantity: totalCords,
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
  globalDefaults: GlobalDefaults,
): Result {
  // ⭐ Defensive: license may be optional
  if (!bundle.license) return { lines: [], warnings: [] };

  const term = getEffectiveLicenseTerm(device, globalDefaults);
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  if (bundle.license.entitlementPid) {
    lines.push({
      partNumber: bundle.license.entitlementPid,
      quantity: 1,
      sourceDeviceId: device.id,
      category: "license-entitlement",
      description: `${bundle.license.tier} entitlement`,
    });
  }

  const subPid = bundle.license.subscriptionByTerm?.[String(term)];
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
  globalDefaults: GlobalDefaults,
): Result {
  // ⭐ Defensive
  if (!bundle.smartnet) return { lines: [], warnings: [] };

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
// IS BOM-READY
// ============================================================
export function isBomReady(device: ConfiguredDevice): boolean {
  return getBundle(device.hardware.series, device.hardware.chassisPid) !== null;
}

// ============================================================
// SPRINT M2 — Modular chassis & group-level stacking
// ============================================================

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
    case "supervisor":
      return "supervisor";
    case "linecard":
      return "linecard";
    case "fabric-module":
      return "fabric-module";
    case "psu":
      return "psu";
    case "ssd":
      return "ssd";
    case "fan":
      return "fan";
    default:
      return "other";
  }
}

export function buildSlotLines(device: ConfiguredDevice): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  const slots = device.hardware.slots;
  if (!slots || slots.length === 0) {
    return { lines, warnings };
  }

  // ⭐ FIX 1: Compute redundant slot IDs from the chassis layout
  const layout = getChassisSlotLayout(device.hardware.chassisPid);
  const redundantSlotIds = new Set(
    layout
      .filter((s) => s.isRedundantSlot)
      .map((s) => String(s.slot)),
  );

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

    // If this slot is a redundant position, swap to the /2 PID
    let emittedPid = slot.modulePid;
    if (redundantSlotIds.has(slot.slotId)) {
      const secondaryPid = getSecondaryModulePid(slot.modulePid);
      if (secondaryPid) {
        emittedPid = secondaryPid;
      } else {
        warnings.push({
          severity: "warning",
          deviceId: device.id,
          message: `No /2 mapping found for ${slot.modulePid} in redundant slot ${slot.slotId}. Emitting base PID — CCW may reject.`,
        });
      }
    }

    lines.push({
      partNumber: emittedPid,                    // ⭐ FIX 2: was slot.modulePid
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


export function hasModularPsus(device: ConfiguredDevice): boolean {
  const catalog = getEffectiveCatalog()
  const series = catalog[device.hardware.series];
  const chassisPidEntry = series?.pids.find(
    (p) => p.pid === device.hardware.chassisPid,
  );
  const bundle = (chassisPidEntry as { bundle?: ChassisBundle })?.bundle;
  return bundleUsesPsuConfig(bundle);
}

export function buildModularPsuLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  const psuLines = emitModularPsuLines(device, bundle);
  for (const line of psuLines) {
    lines.push({
      partNumber: line.pid,
      quantity: line.qty,
      sourceDeviceId: device.id,
      category: "psu",
      description: line.description,
    });
  }

  return { lines, warnings };
}
/**
 * Builds PSU lines for modular chassis (count + SKU model).
 */


export function buildModularPowerCordLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  globalDefaults: GlobalDefaults,
): Result {
  if (!bundle.powerCord) return { lines: [], warnings: [] };

  const psuConfig = bundle.psuConfig;
  const psuCount =
    device.hardware.modularPsuQty ?? psuConfig?.defaultQty ?? 0;

  if (psuCount === 0) return { lines: [], warnings: [] };

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

  const cordsPerPsu = bundle.powerCord.qty ?? 1;

  return {
    lines: [
      {
        partNumber: cordPid,
        quantity: psuCount * cordsPerPsu,
        sourceDeviceId: device.id,
        category: "power-cord",
      },
    ],
    warnings,
  };
}

// ============================================================
// GROUP-LEVEL STACKING
// ============================================================
const DEFAULT_STACK_CABLE_PID = "STACK-T1-50CM";

export function buildGroupStackingLines(
  group: DeviceGroup,
  memberCount: number,
): Result {
  const lines: BOMLine[] = [];
  const warnings: BOMWarning[] = [];

  // ⭐ FIELD NAME: your DeviceGroup uses `kind` (not `groupKind`)
  if (group.kind !== "stack") return { lines, warnings };

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
 * ⭐ FIELD NAME: your DeviceGroup uses `kind` (not `groupKind`)
 */
export function isStackMember(
  device: ConfiguredDevice,
  groups: DeviceGroup[],
): boolean {
  if (!device.parentGroupId) return false;
  const group = groups.find((g) => g.id === device.parentGroupId);
  return group?.kind === "stack";
}

export function countGroupMembers(
  group: DeviceGroup,
  devices: ConfiguredDevice[],
): number {
  return devices.filter((d) => d.parentGroupId === group.id).length;
}