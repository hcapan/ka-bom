// ============================================================================
// CCW → CATALOG PATCH ASSEMBLER
// Converts classified anchor groups into a structured CatalogPatch.
//
// Responsibilities:
//   - Build one ChassisBundlePatch per chassis anchor
//   - Aggregate auto-includes with their observed quantities
//   - Map power cords to byRegion[]
//   - Map DNA license entitlement + subscription to license object
//   - Map CON-* line to smartnet object with term in months
//   - Build module list (supervisors, linecards, fabric modules, PSUs, SSDs)
//   - Build optic list (standalone optic anchors)
//   - Track all "review-required" lines for human follow-up
// ============================================================================

import {
  ClassifiedAnchorGroup,
  ClassifiedLine,
  CatalogPatch,
  ChassisBundlePatch,
  ModulePatch,
  OpticPatch,
  AutoIncludePatch,
  LineRole,
} from "./types";
import { Region, ContractTermYears, SlotKind } from "../types";
import { LicenseSpec } from "../hardware/catalog";
type LicenseTier = LicenseSpec["tier"];

// ============================================================================
// PUBLIC ENTRY POINT
// ============================================================================

export interface AssembleInput {
  sourceFileName: string;
  classifiedGroups: ClassifiedAnchorGroup[];
}

export function assembleCatalogPatch(input: AssembleInput): CatalogPatch {
  const chassisBundles: ChassisBundlePatch[] = [];
  const moduleMap = new Map<string, ModulePatch>();
  const opticMap = new Map<string, OpticPatch>();
  const needsReview: ClassifiedLine[] = [];

  for (const group of input.classifiedGroups) {
    // Collect any review-required children regardless of anchor type.
    if (group.anchor.confidence === "review-required") {
      needsReview.push(group.anchor);
    }
    for (const child of group.children) {
      if (child.confidence === "review-required") {
        needsReview.push(child);
      }
    }

    // Branch on anchor role
    switch (group.anchor.role) {
      case "chassis-modular":
      case "chassis-fixed":
        chassisBundles.push(buildChassisBundle(group));
        collectModulesFromGroup(group, moduleMap);
        break;

      case "optic-standalone":
        addOptic(opticMap, group.anchor);
        break;

      case "unknown-anchor":
        // Already added to needsReview above; nothing to assemble.
        break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFileName: input.sourceFileName,
    chassisBundles,
    modules: Array.from(moduleMap.values()).sort((a, b) =>
      a.pid.localeCompare(b.pid)
    ),
    optics: Array.from(opticMap.values()).sort((a, b) =>
      a.pid.localeCompare(b.pid)
    ),
    needsReview,
  };
}

// ============================================================================
// CHASSIS BUNDLE ASSEMBLY
// ============================================================================

function buildChassisBundle(
  group: ClassifiedAnchorGroup
): ChassisBundlePatch {
  const chassisPid = group.anchor.basePid;
  const isModular = group.anchor.role === "chassis-modular";

  const bundle: ChassisBundlePatch = {
    chassisPid,
    vendorFamily: group.vendorFamily,
    isModular,
    autoIncluded: [],
    powerCordByRegion: {},
    observedPsuQty: 0,
    stackingProfile: group.stackingProfile,
  };

  // Track DNA license parts (entitlement + subscription) so we can pair them.
  let dnaEntitlementPid: string | undefined;
  let dnaTier: LicenseTier | undefined;          // ⭐ was: string | undefined
  const dnaSubscriptions: Partial<Record<ContractTermYears, string>> = {};

  for (const child of group.children) {
    routeChildToBundle(child, bundle, {
      onDnaEntitlement: (pid, tier) => {
        dnaEntitlementPid = pid;
        if (tier) dnaTier = tier;
      },
      onDnaSubscription: (term, pid, tier) => {
        dnaSubscriptions[term] = pid;
        if (tier && !dnaTier) dnaTier = tier;
      },
    });
  }

  if (dnaEntitlementPid && dnaTier) {
    bundle.license = {
      tier: dnaTier,                              // ⭐ now properly typed
      entitlementPid: dnaEntitlementPid,
      subscriptionByTerm: dnaSubscriptions,
    };
  }

  return bundle;
}

// ============================================================================
// CHILD ROUTING
// Each classified child gets routed to the appropriate bundle field based
// on its role.
// ============================================================================

interface RouteCallbacks {
  onDnaEntitlement: (pid: string, tier: LicenseTier | undefined) => void;
  onDnaSubscription: (
    term: ContractTermYears,
    pid: string,
    tier: LicenseTier | undefined
  ) => void;
}

function routeChildToBundle(
  child: ClassifiedLine,
  bundle: ChassisBundlePatch,
  cb: RouteCallbacks
): void {
  const pid = child.basePid;
  const qty = child.raw.quantity;

  switch (child.role) {
    // -----------------------------------------------------------
    // SmartNet → bundle.smartnet
    // -----------------------------------------------------------
    case "smartnet": {
      if (!child.smartnetTier) {
        // Classifier couldn't determine tier; surface in review instead.
        break;
      }
      const termMonths = child.raw.durationMonths ?? 36;
      bundle.smartnet = {
        tier: child.smartnetTier,
        pid: child.raw.partNumber,
        termMonths,
      };
      break;
    }

    // -----------------------------------------------------------
    // DNA license entitlement (no -NY suffix)
    // -----------------------------------------------------------
    case "license-dna-entitlement":
      cb.onDnaEntitlement(pid, child.licenseTier);
      break;

    // -----------------------------------------------------------
    // DNA license subscription (-3Y / -5Y / -7Y)
    // -----------------------------------------------------------
    case "license-dna-subscription":
      if (child.licenseTermYears) {
        cb.onDnaSubscription(child.licenseTermYears, pid, child.licenseTier);
      }
      break;

    // -----------------------------------------------------------
    // Power cord → bundle.powerCordByRegion[region]
    // -----------------------------------------------------------
    case "power-cord": {
      if (child.region) {
        if (!bundle.powerCordByRegion[child.region]) {
          bundle.powerCordByRegion[child.region] = pid;
        }
      }
      bundle.observedPsuQty = Math.max(bundle.observedPsuQty, qty);
      addAutoInclude(bundle, child);
      break;
    }

    // -----------------------------------------------------------
    // PSU → counts toward observedPsuQty AND added as auto-include
    // -----------------------------------------------------------
    case "psu":
    case "psu-redundant": {
      bundle.observedPsuQty = Math.max(bundle.observedPsuQty, qty);
      addAutoInclude(bundle, child);
      break;
    }

    // -----------------------------------------------------------
    // Module-class items — collected separately by collectModulesFromGroup
    // -----------------------------------------------------------
    case "supervisor":
    case "linecard":
    case "fabric-module":
    case "system-controller":
    case "ssd":
    case "fan":
    case "fan-power":
      break;

    // -----------------------------------------------------------
    // Stacking SKUs — captured in stackingProfile, also kept as auto-includes
    // -----------------------------------------------------------
    case "stack-kit":
    case "stack-adapter":
    case "stack-cable-data":
    case "stack-cable-power":
      addAutoInclude(bundle, child);
      break;

    // -----------------------------------------------------------
    // All other auto-include classes
    // -----------------------------------------------------------
    case "license-network-base":
    case "dnas-extension":
    case "telemetry":
    case "software-image":
    case "nxos-mode":
    case "pnp-license":
    case "ccw-placeholder":
    case "qsfp-cover":
    case "slot-blank":
    case "rfid-tag":
    case "console-cable":
    case "cable-guide":
    case "accessory":
    case "subscription-bundle":
      addAutoInclude(bundle, child);
      break;

    // -----------------------------------------------------------
    // Anchor-only roles — should never appear as children, but
    // TypeScript's exhaustiveness check requires them to be handled.
    // -----------------------------------------------------------
    case "chassis-modular":
    case "chassis-fixed":
    case "optic-standalone":
      break;

    // -----------------------------------------------------------
    // Unknowns — already tracked in needsReview at top level.
    // -----------------------------------------------------------
    case "unknown-child":
    case "unknown-anchor":
      break;

    default:
      assertNeverRole(child.role);
  }
}

// ============================================================================
// AUTO-INCLUDE HELPER
// ============================================================================

function addAutoInclude(
  bundle: ChassisBundlePatch,
  child: ClassifiedLine
): void {
  const existing = bundle.autoIncluded.find(
    (a) => a.pid === child.basePid && a.role === child.role
  );

  if (existing) {
    // Same PID seen twice in this anchor (rare, but possible) — sum qty.
    existing.qty += child.raw.quantity;
    return;
  }

  const entry: AutoIncludePatch = {
    pid: child.basePid,
    qty: child.raw.quantity,
    role: child.role,
  };
  if (child.note) entry.note = child.note;
  bundle.autoIncluded.push(entry);
}

// ============================================================================
// MODULE COLLECTION
// Walks an anchor group and adds all module-class items to the global
// module map. If the same module PID appears under multiple chassis,
// observedInChassis is merged.
// ============================================================================

function collectModulesFromGroup(
  group: ClassifiedAnchorGroup,
  moduleMap: Map<string, ModulePatch>
): void {
  const chassisPid = group.anchor.basePid;

  for (const child of group.children) {
    if (!isModuleRole(child.role) || !child.slotKind) continue;

    const existing = moduleMap.get(child.basePid);
    if (existing) {
      if (!existing.observedInChassis.includes(chassisPid)) {
        existing.observedInChassis.push(chassisPid);
      }
    } else {
      moduleMap.set(child.basePid, {
        pid: child.basePid,
        slotKind: child.slotKind,
        observedInChassis: [chassisPid],
        description: defaultModuleDescription(child.basePid, child.slotKind),
      });
    }
  }
}

function isModuleRole(role: LineRole): boolean {
  return (
    role === "supervisor" ||
    role === "linecard" ||
    role === "fabric-module" ||
    role === "system-controller" ||
    role === "ssd" ||
    role === "fan" ||
    role === "fan-power"
  );
}

// Tentative description — engineer can refine before merging into catalog.ts.
function defaultModuleDescription(pid: string, kind: SlotKind): string {
  switch (kind) {
    case "supervisor":     return `Supervisor module ${pid}`;
    case "linecard":       return `Linecard ${pid}`;
    case "fabric-module":  return `Fabric module ${pid}`;
    case "psu":            return `Power supply ${pid}`;
    case "ssd":            return `SSD storage ${pid}`;
    case "fan":            return `Fan tray ${pid}`;
    default:               return pid;
  }
}

// ============================================================================
// OPTIC COLLECTION
// ============================================================================

function addOptic(
  opticMap: Map<string, OpticPatch>,
  anchor: ClassifiedLine
): void {
  // Standalone optic PIDs already include the trailing "=".
  const pid = anchor.raw.partNumber;
  if (opticMap.has(pid)) return;

  opticMap.set(pid, {
    pid,
    description: defaultOpticDescription(pid),
  });
}

function defaultOpticDescription(pid: string): string {
  // Strip the trailing "=" for description purposes.
  const base = pid.endsWith("=") ? pid.slice(0, -1) : pid;
  // Best-effort speed parsing: SFP-25G-..., QSFP-100G-..., GLC-..., etc.
  const speedMatch = base.match(/(\d+)G/);
  const speed = speedMatch ? `${speedMatch[1]}G ` : "";
  if (base.startsWith("QSFP")) return `${speed}QSFP optic ${base}`;
  if (base.startsWith("SFP"))  return `${speed}SFP optic ${base}`;
  if (base.startsWith("GLC"))  return `${speed}GLC optic ${base}`;
  return `Optic ${base}`;
}

// ============================================================================
// EXHAUSTIVENESS HELPER
// ============================================================================

function assertNeverRole(_role: never): never {
  throw new Error(`Unhandled LineRole in routeChildToBundle: ${String(_role)}`);
}

function inferTier(): string {
  return "NBD";
}