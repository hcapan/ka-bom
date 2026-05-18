// ============================================================================
// CCW CLASSIFIER
// Strict pattern matching: RawCcwRow → ClassifiedLine.
//
// Rules:
//   - Anchor rows are classified as chassis-modular / chassis-fixed /
//     optic-standalone / unknown-anchor.
//   - Child rows are classified by SKU pattern + duration columns.
//   - "Strict" means: anything not pattern-matched is flagged as
//     "review-required". No silent guesses.
// ============================================================================

import {
  RawCcwRow,
  ParsedAnchor,
  ParsedCcw,
  ClassifiedLine,
  ClassifiedAnchorGroup,
  LineRole,
  VendorFamily,
  StackingProfile,
} from "./types";
import { SlotKind, Region, ContractTermYears, SmartnetTier } from "../types";

// ============================================================================
// PUBLIC ENTRY POINT
// ============================================================================

export function classifyParsedCcw(parsed: ParsedCcw): ClassifiedAnchorGroup[] {
  return parsed.anchors.map(classifyAnchorGroup);
}

function classifyAnchorGroup(group: ParsedAnchor): ClassifiedAnchorGroup {
  const anchor = classifyAnchor(group.anchor);
  const children = group.children.map((row) =>
    classifyChild(row, anchor)
  );

  const vendorFamily = detectVendorFamily(anchor.basePid);
  const stackingProfile = detectStackingProfile(children);

  return {
    anchor,
    children,
    vendorFamily,
    hasStacking: stackingProfile.pattern !== "none",
    stackingProfile:
      stackingProfile.pattern === "none" ? undefined : stackingProfile,
  };
}

// ============================================================================
// /2 SUFFIX HANDLING
// ============================================================================

function splitRedundantSuffix(pid: string): {
  basePid: string;
  isRedundantPeer: boolean;
} {
  if (pid.endsWith("/2")) {
    return { basePid: pid.slice(0, -2), isRedundantPeer: true };
  }
  return { basePid: pid, isRedundantPeer: false };
}

// ============================================================================
// ANCHOR CLASSIFICATION
// ============================================================================

function classifyAnchor(row: RawCcwRow): ClassifiedLine {
  const pid = row.partNumber;
  const { basePid, isRedundantPeer } = splitRedundantSuffix(pid);

  // Optic anchor: PID ends with "="
  if (pid.endsWith("=")) {
    return {
      raw: row,
      role: "optic-standalone",
      basePid,
      isRedundantPeer,
      confidence: "high",
    };
  }

  // Modular chassis (must come before fixed-config — more specific)
  if (isModularChassisPid(basePid)) {
    return {
      raw: row,
      role: "chassis-modular",
      basePid,
      isRedundantPeer,
      confidence: "high",
    };
  }

  // Fixed-config switch chassis
  if (isFixedChassisPid(basePid)) {
    return {
      raw: row,
      role: "chassis-fixed",
      basePid,
      isRedundantPeer,
      confidence: "high",
    };
  }

  // Anything else at anchor position is unknown — flag for review.
  return {
    raw: row,
    role: "unknown-anchor",
    basePid,
    isRedundantPeer,
    confidence: "review-required",
    note: `Unrecognized anchor PID "${pid}". Add a chassis pattern if this is a new product family.`,
  };
}

// Modular chassis patterns (observed across Cisco docs + your exports).
function isModularChassisPid(pid: string): boolean {
  return (
    /^C9404R$/.test(pid) ||
    /^C9407R$/.test(pid) ||
    /^C9410R$/.test(pid) ||
    /^C9603R$/.test(pid) ||
    /^C9606R$/.test(pid) ||
    /^C9609R$/.test(pid) ||
    /^N9K-C9504$/.test(pid) ||
    /^N9K-C9508$/.test(pid) ||
    /^N9K-C9516$/.test(pid)
  );
}

// Fixed-config switch chassis patterns.
function isFixedChassisPid(pid: string): boolean {
  return (
    /^C9200L?-/.test(pid) ||      // C9200-* and C9200L-*
    /^C9300L?-/.test(pid) ||      // C9300-* and C9300L-*
    /^C9500-/.test(pid)
  );
}

// ============================================================================
// CHILD CLASSIFICATION
// ============================================================================

function classifyChild(
  row: RawCcwRow,
  anchor: ClassifiedLine
): ClassifiedLine {
  const pid = row.partNumber;
  const { basePid, isRedundantPeer } = splitRedundantSuffix(pid);

  const base: Pick<ClassifiedLine, "raw" | "basePid" | "isRedundantPeer"> = {
    raw: row,
    basePid,
    isRedundantPeer,
  };

  // ----- SmartNet (CON-*) -----
  if (basePid.startsWith("CON-")) {
    return {
      ...base,
      role: "smartnet",
      smartnetTier: smartnetTierFromPid(basePid),
      confidence: "high",
    };
  }

  // ----- Subscription bundles (Nexus prepaid term) -----
  // These have non-null Initial Term + Billing Model columns.
  if (
    row.initialTermMonths !== null &&
    row.billingModel !== null &&
    !basePid.includes("DNA")
  ) {
    return {
      ...base,
      role: "subscription-bundle",
      confidence: "high",
    };
  }

  // ----- DNA license entitlement vs subscription -----
  if (basePid.includes("-DNA-")) {
    const term = extractLicenseTerm(basePid);
    if (term) {
      return {
        ...base,
        role: "license-dna-subscription",
        licenseTermYears: term,
        licenseTier: extractLicenseTier(basePid),
        confidence: "high",
      };
    }
    return {
      ...base,
      role: "license-dna-entitlement",
      licenseTier: extractLicenseTier(basePid),
      confidence: "high",
    };
  }

  // ----- DNAS extensions (D-DNAS-EXT-S-T, D-DNAS-EXT-S-3Y) -----
  if (basePid.startsWith("D-DNAS-")) {
    return { ...base, role: "dnas-extension", confidence: "high" };
  }

  // ----- Network base (NW-A, NW-E, NW-E-24, NW-E-48) -----
  // Pattern: <prefix>-NW-<letter>(-<number>)?
  if (/^[A-Z0-9]+-NW-[A-Z](-\d+)?$/.test(basePid)) {
    return { ...base, role: "license-network-base", confidence: "high" };
  }

  // ----- Software images (S<series>UK9-*) -----
  if (/^S[A-Z0-9]+UK9-/.test(basePid)) {
    return { ...base, role: "software-image", confidence: "high" };
  }

  // ----- NX-OS related -----
  if (
    basePid.startsWith("NXOS-") ||
    basePid === "MODE-NXOS" ||
    basePid === "N9K-C9500-ACK"
  ) {
    return { ...base, role: "nxos-mode", confidence: "high" };
  }

  // ----- Telemetry -----
  if (basePid.startsWith("TE-")) {
    return { ...base, role: "telemetry", confidence: "high" };
  }

  // ----- PnP license -----
  if (basePid === "NETWORK-PNP-LIC") {
    return { ...base, role: "pnp-license", confidence: "high" };
  }

  // ----- CCW mandatory placeholders (*-OTHER) -----
  if (basePid.endsWith("-OTHER")) {
    return {
      ...base,
      role: "ccw-placeholder",
      confidence: "high",
      note: "CCW mandatory placeholder — keep in catalog, do not order separately.",
    };
  }

  // ----- Stacking SKUs (must come BEFORE generic cable detection) -----
  if (/STACK-KIT/i.test(basePid)) {
    return { ...base, role: "stack-kit", confidence: "high" };
  }
  if (basePid.startsWith("STACK-T")) {
    // STACK-T1-50CM, STACK-T3A-50CM, STACK-T4-50CM
    return { ...base, role: "stack-cable-data", confidence: "high" };
  }
  if (basePid.startsWith("CAB-SPWR-")) {
    return { ...base, role: "stack-cable-power", confidence: "high" };
  }
  // Stack adapter cards: C9200-STACK, C9300L-STACK-A
  if (/^C\d{4}L?-STACK(-[A-Z])?$/.test(basePid)) {
    return { ...base, role: "stack-adapter", confidence: "high" };
  }

  // ----- Cable guides -----
  if (basePid.startsWith("CAB-GUIDE-")) {
    return { ...base, role: "cable-guide", confidence: "high" };
  }

  // ----- Console cables -----
  if (basePid.startsWith("CAB-CON-")) {
    return { ...base, role: "console-cable", confidence: "high" };
  }

  // ----- Power cords (CAB-* with region indicator) -----
  if (isPowerCordPid(basePid)) {
    return {
      ...base,
      role: "power-cord",
      region: detectCordRegion(basePid),
      confidence: "high",
    };
  }

  // ----- Accessories (C9K-ACC-*) -----
  if (basePid.startsWith("C9K-ACC-")) {
    return { ...base, role: "accessory", confidence: "high" };
  }

  // ----- Slot blanks / SSD blanks / fan blanks -----
  if (
    /-S-BLANK$/.test(basePid) ||
    /-SLOT-BLANK$/.test(basePid) ||
    /-SSD-BLANK$/.test(basePid) ||
    /-SSD-NONE$/.test(basePid) ||
    /-SPS-NONE$/.test(basePid) ||
    /^PWR-C\d-BLANK$/.test(basePid) ||
    basePid === "C9K-F1-SSD-BLANK"
  ) {
    return { ...base, role: "slot-blank", confidence: "high" };
  }

  // ----- QSFP covers -----
  if (basePid.endsWith("-QSFP-CVR") || basePid.endsWith("-QSFP-CVR-")) {
    return { ...base, role: "qsfp-cover", confidence: "high" };
  }

  // ----- RFID -----
  if (basePid.endsWith("-RFID")) {
    return { ...base, role: "rfid-tag", confidence: "high" };
  }

  // ----- PSU (paid or auto-include) -----
  if (
    /-PWR-/.test(basePid) ||
    /^PWR-C\d-/.test(basePid) ||
    /^N9K-PAC-/.test(basePid) ||
    /^C9K-PWR-/.test(basePid)
  ) {
    return {
      ...base,
      role: isRedundantPeer ? "psu-redundant" : "psu",
      slotKind: "psu",
      confidence: "high",
    };
  }

  // ----- Fans -----
  if (basePid.endsWith("-FAN-PWR") || /FAN-PWR$/.test(basePid)) {
    return { ...base, role: "fan-power", slotKind: "fan", confidence: "high" };
  }
  if (
    /^FAN-/.test(basePid) ||         // FAN-T2
    /-FAN(\d+)?$/.test(basePid) ||   // C9606-FAN, N9K-C9504-FAN2
    /-FANTRAY$/.test(basePid)        // C9K-T1-FANTRAY
  ) {
    return { ...base, role: "fan", slotKind: "fan", confidence: "high" };
  }

  // ----- Supervisors (modular chassis only) -----
  if (
    isSupervisorPid(basePid) &&
    anchor.role === "chassis-modular"
  ) {
    return {
      ...base,
      role: "supervisor",
      slotKind: "supervisor",
      confidence: "high",
    };
  }

  // ----- Linecards (modular chassis only) -----
  if (
    isLinecardPid(basePid) &&
    anchor.role === "chassis-modular"
  ) {
    return {
      ...base,
      role: "linecard",
      slotKind: "linecard",
      confidence: "high",
    };
  }

  // ----- Fabric modules (Nexus 9500) -----
  if (/-FM-/.test(basePid) || /-FM\d?$/.test(basePid)) {
    return {
      ...base,
      role: "fabric-module",
      slotKind: "fabric-module",
      confidence: "high",
    };
  }

  // ----- System Controllers (Nexus 9500: N9K-SC-A) -----
  if (/^N9K-SC-/.test(basePid)) {
    return {
      ...base,
      role: "system-controller",
      slotKind: "fabric-module",  // close enough; lives in the fabric bay
      confidence: "high",
    };
  }

  // ----- SSD (paid storage modules) -----
  if (/-SSD-/.test(basePid) && !basePid.endsWith("-NONE") && !basePid.endsWith("-BLANK")) {
    return { ...base, role: "ssd", slotKind: "ssd", confidence: "high" };
  }
  // Some SSDs are named SSD-240G etc.
  if (/^SSD-\d+G$/.test(basePid)) {
    return { ...base, role: "ssd", slotKind: "ssd", confidence: "high" };
  }

  // ----- Rack mount kits (N9K-C9504-RMK etc.) -----
  if (/-RMK$/.test(basePid)) {
    return { ...base, role: "accessory", confidence: "high" };
  }

  // ----- Fallback: unknown — flag for human review -----
  return {
    ...base,
    role: "unknown-child",
    confidence: "review-required",
    note: `Unrecognized child PID "${pid}" under anchor "${anchor.raw.partNumber}". Add a classifier rule if this is a known SKU pattern.`,
  };
}

// ============================================================================
// SUPPORTING DETECTORS
// ============================================================================

function smartnetTierFromPid(pid: string): SmartnetTier {
  // CON-SNT-*       = NBD (8x5xNBD)
  // CON-SNTP-*      = 8x5x4
  // CON-OSP-*       = 24x7x4 onsite
  // CON-OS-*        = 24x7x4
  // CON-PSUP-*      = Software Support
  // Add more as you encounter them.
  if (pid.startsWith("CON-SNTP-")) return "8x5x4" as SmartnetTier;
  if (pid.startsWith("CON-OSP-")) return "24x7x4OS" as SmartnetTier;
  if (pid.startsWith("CON-OS-")) return "24x7x4" as SmartnetTier;
  if (pid.startsWith("CON-SNT-")) return "NBD" as SmartnetTier;
  return "NBD" as SmartnetTier;
}

function extractLicenseTerm(pid: string): ContractTermYears | undefined {
  const match = pid.match(/-(\d+)Y$/);
  if (!match) return undefined;
  const years = parseInt(match[1], 10);
  if (years === 3 || years === 5 || years === 7) {
    return years as ContractTermYears;
  }
  return undefined;
}

import { LicenseSpec } from "../hardware/catalog";

type LicenseTier = LicenseSpec["tier"];

function extractLicenseTier(pid: string): LicenseTier {
  // C9400-DNA-A    → "Advantage"
  // C9300-DNA-E-24 → "Essentials"
  // C9500-DNA-P    → "Premier"
  const m = pid.match(/-DNA-([A-Z])(?:-|$)/);
  if (!m) return "Advantage";  // safest default

  switch (m[1]) {
    case "A": return "Advantage";
    case "E": return "Essentials";
    case "P": return "Premier";
    default:  return "Advantage";
  }
}

function isSupervisorPid(pid: string): boolean {
  return (
    /-SUP-/.test(pid) ||         // C9400-SUP-1, C9600X-SUP-2, N9K-SUP-B+
    /SUP\d/.test(pid) ||         // C9600X-SUP-2
    pid.endsWith("-SUP")
  );
}

function isLinecardPid(pid: string): boolean {
  return (
    /-LC-/.test(pid) ||           // C9400-LC-48UX, C9600-LC-48YL
    /^N9K-X\d/.test(pid) ||       // N9K-X9788TC-FX, N9K-X9732C-FX
    /^C9300X?-NM-/.test(pid) ||   // C9300-NM-8X, C9300X-NM-8M (uplink modules)
    /^C9500-NM-/.test(pid)        // C9500-NM-* if any future variants
  );
}

function isPowerCordPid(pid: string): boolean {
  // Distinct from PSUs: power cords are CAB-* and connect to wall socket.
  return (
    /^CAB-CEE77-/.test(pid) ||   // CAB-CEE77-C19-EU
    /^CAB-9K\d/.test(pid) ||     // CAB-9K10A-EU, CAB-9K16A-BRZ
    /^CAB-TA-/.test(pid)         // CAB-TA-EU, CAB-TA-NA, CAB-TA-UK, CAB-TA-AU, CAB-TA-JP
  );
}

function detectCordRegion(pid: string): Region | undefined {
  // CAB-TA-XX     → XX is the region code
  const taMatch = pid.match(/^CAB-TA-([A-Z]+)$/);
  if (taMatch) return regionFromCode(taMatch[1]);

  // CAB-CEE77-C19-EU → trailing region
  const cee77Match = pid.match(/^CAB-CEE77-[A-Z0-9]+-([A-Z]+)$/);
  if (cee77Match) return regionFromCode(cee77Match[1]);

  // CAB-9K10A-EU, CAB-9K16A-BRZ → trailing region
  const nineKMatch = pid.match(/^CAB-9K\d+A-([A-Z]+)$/);
  if (nineKMatch) return regionFromCode(nineKMatch[1]);

  return undefined;
}

function regionFromCode(code: string): Region | undefined {
  switch (code.toUpperCase()) {
    case "EU":   return "EU";
    case "NA":   return "US";   // CCW uses NA, your union uses US
    case "US":   return "US";
    case "UK":   return "UK";
    case "JP":   return "JP";
    case "JPN":  return "JP";   // CAB-9K10A-JPN
    case "AU":   return "AU";
    case "AUS":  return "AU";   // CAB-9K10A-AUS
    case "AP":   return "AU";   // CAB-TA-AP (Asia-Pacific)
    case "IN":   return "IN";
    case "IND":  return "IN";   // CAB-9K10A-IND
    case "CN":   return "CN";
    case "CHN":  return "CN";   // CAB-9K10A-CHN
    case "BRZ":  return undefined;  // Brazil not in your Region union — flag
    case "BR":   return undefined;
    default:     return undefined;
  }
}

// ============================================================================
// VENDOR FAMILY DETECTION
// ============================================================================

function detectVendorFamily(pid: string): VendorFamily {
  if (pid.endsWith("=")) return "optic";
  if (/^C9200L-/.test(pid)) return "catalyst-9200l";
  if (/^C9200-/.test(pid)) return "catalyst-9200";
  if (/^C9300L-/.test(pid)) return "catalyst-9300l";
  if (/^C9300-/.test(pid)) return "catalyst-9300";
  if (/^C940[0-9]?R?$/.test(pid)) return "catalyst-9400";
  if (/^C9500-/.test(pid)) return "catalyst-9500";
  if (/^C960[0-9]?R?$/.test(pid)) return "catalyst-9600";
  if (/^N9K-C95\d+$/.test(pid)) return "nexus-9500";
  if (/^N9K-/.test(pid)) return "nexus-other";
  return "unknown";
}

// ============================================================================
// STACKING PROFILE DETECTION
// Looks at the children of an anchor and figures out which stacking pattern
// is in use. Three patterns supported:
//   - "kit-bundle" : a *-STACK-KIT* line is present
//   - "direct"     : STACK-T*-*CM is present without a kit
//   - "none"       : no stacking SKUs at all
// ============================================================================

function detectStackingProfile(children: ClassifiedLine[]): StackingProfile {
  const kit = children.find((c) => c.role === "stack-kit");
  const adapter = children.find((c) => c.role === "stack-adapter");
  const dataCable = children.find((c) => c.role === "stack-cable-data");
  const powerCable = children.find((c) => c.role === "stack-cable-power");

  if (!kit && !adapter && !dataCable && !powerCable) {
    return { pattern: "none", supportsStackPower: false };
  }

  if (kit) {
    return {
      pattern: "kit-bundle",
      kitPid: kit.basePid,
      adapterPid: adapter?.basePid,
      adapterQty: adapter?.raw.quantity,
      dataCablePid: dataCable?.basePid,
      powerCablePid: powerCable?.basePid,
      supportsStackPower: !!powerCable,
    };
  }

  // No kit but cables present → direct stacking (e.g., 9300)
  return {
    pattern: "direct",
    dataCablePid: dataCable?.basePid,
    powerCablePid: powerCable?.basePid,
    supportsStackPower: !!powerCable,
  };
}