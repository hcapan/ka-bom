import {
  HARDWARE_LIBRARY,
  ChassisBundle,
  getBundle,
} from "../hardware";
import {
  ConfiguredDevice,
  GlobalDefaults,
  ContractTermYears,
  SmartnetTier,
  Region,
} from "../types";
import { BOMLine, BOMWarning } from "./types";

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
// LINE BUILDERS — each returns lines + warnings
// ============================================================
type Result = { lines: BOMLine[]; warnings: BOMWarning[] };

/**
 * Builds the chassis line itself + all auto-included items.
 */
export function buildChassisLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle,
  groupId: number
): Result {
  const lines: BOMLine[] = [
    {
      partNumber: device.hardware.chassisPid,
      quantity: 1,
      groupId,
      sourceDeviceId: device.id,
      category: "chassis",
      description: `${device.hardware.series} chassis`,
    },
    ...bundle.autoIncluded.map<BOMLine>((item) => ({
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
    // Fall back to first available region
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
  // Auto-scale: 1 cord if 1 PSU, 2 cords if redundant PSU enabled
  // (bundle.powerCord.qty is the per-chassis-when-fully-loaded count;
  //  here we honor user's actual PSU choice)
  const psuCount = device.hardware.redundantPsu ? 2 : 1;
  // Use bundle hint if it differs (some chassis ship with cord-per-cord rules)
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

  // Entitlement (always)
  lines.push({
    partNumber: bundle.license.entitlementPid,
    quantity: 1,
    sourceDeviceId: device.id,
    category: "license-entitlement",
    description: `${bundle.license.tier} entitlement`,
  });

  // Subscription (term-based)
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
 * Builds stack accessory lines (cables, power cables, adapter kits).
 * Only emits lines for what the user explicitly enabled in stacking config.
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