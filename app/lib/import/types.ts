// ============================================================================
// CCW IMPORTER — TYPE DEFINITIONS
// Pure data shapes for the catalog enrichment pipeline.
// ============================================================================

import { SlotKind, Region, ContractTermYears, SmartnetTier } from "../types";

import { LicenseSpec } from "../hardware/catalog";
// ============================================================
// LAYER 1: RAW EXCEL ROWS
// What we get directly from xlsx after parsing the sheet.
// ============================================================

export interface RawCcwRow {
  /** Row index in the source sheet (1-based, after header). Used for error reporting. */
  rowIndex: number;
  partNumber: string;
  quantity: number;
  durationMonths: number | null;
  initialTermMonths: number | null;
  autoRenewTermMonths: number | null;
  billingModel: string | null;       // e.g. "Prepaid Term" | null
  referenceId: string | null;
  groupId: string | null;            // null when NaN
}

// ============================================================
// LAYER 2: PARSED STRUCTURE
// Hierarchical view: anchors + their children.
// ============================================================

export interface ParsedCcw {
  sourceFileName: string;
  parsedAt: string;                   // ISO timestamp
  totalRows: number;
  anchors: ParsedAnchor[];
  /** Rows that couldn't be assigned to any anchor (data-quality issue). */
  orphanRows: RawCcwRow[];
}

export interface ParsedAnchor {
  /** The anchor row itself. */
  anchor: RawCcwRow;
  /** All rows that follow until the next anchor. */
  children: RawCcwRow[];
}

// ============================================================
// LAYER 3: CLASSIFIED LINES
// Each row is classified by role using strict pattern matching.
// ============================================================

/** What kind of line is this in the catalog universe? */
export type LineRole =
  // Anchor roles
  | "chassis-modular"           // C9407R, C9606R, N9K-C9504
  | "chassis-fixed"             // C9300-24T-E, C9500-48Y4C-A
  | "optic-standalone"          // SFP-25G-SR-S=
  | "unknown-anchor"            // flag for human review

  // Child roles — modules
  | "supervisor"
  | "linecard"
  | "fabric-module"
  | "system-controller"         // N9K-SC-A (Nexus only)
  | "psu"
  | "psu-redundant"             // suffix /2
  | "ssd"
  | "fan"
  | "fan-power"                 // N9K-C9504-FAN-PWR

  // Child roles — licensing & support
  | "smartnet"                  // CON-SNT, CON-SNTP, CON-OSP, etc.
  | "license-dna-entitlement"   // C9400-DNA-A    (no term suffix)
  | "license-dna-subscription"  // C9400-DNA-A-3Y (term suffix present)
  | "license-network-base"      // C9400-NW-A     (auto-include with DNA)
  | "subscription-bundle"       // C1E1TN9500M4-3Y, SVS-B-N9K-ESS-M4 (Nexus prepaid)

  // Child roles — cables & accessories
  | "power-cord"                // CAB-CEE77-C19-EU, CAB-TA-EU
  | "console-cable"             // CAB-CON-C9K-RJ45
  | "cable-guide"               // CAB-GUIDE-7R, CAB-GUIDE-1RU
  | "stack-cable-data"          // STACK-T1-50CM, STACK-T3A-50CM, STACK-T4-50CM
  | "stack-cable-power"         // CAB-SPWR-30CM
  | "stack-kit"                 // C9200L-STACK-KIT, C9300L-STACK-KIT2
  | "stack-adapter"             // C9200-STACK, C9300L-STACK-A
  | "accessory"                 // C9K-ACC-*, C9K-ACC-RBFT, C9K-ACC-SCR-*, C9K-ACC-ADP-DB9

  // Child roles — software & misc auto-includes
  | "software-image"            // S9400UK9-1715, S9600UK9-1715, NXOS-CS-10.6.2F
  | "telemetry"                 // TE-EMBEDDED-T, TE-C9K-SW
  | "dnas-extension"            // D-DNAS-EXT-S-T, D-DNAS-EXT-S-3Y
  | "pnp-license"               // NETWORK-PNP-LIC
  | "nxos-mode"                 // MODE-NXOS, NXOS-CS-*, NXOS-SLP-*, N9K-C9500-ACK
  | "qsfp-cover"                // C9400-QSFP-CVR
  | "slot-blank"                // C9400-S-BLANK, C9606-SLOT-BLANK, PWR-C1-BLANK, C9K-F1-SSD-BLANK, C9500-SSD-NONE, C9300-SSD-NONE, C9300L-SPS-NONE, C9600-SSD-NONE
  | "rfid-tag"                  // C9500-RFID
  | "ccw-placeholder"           // C9600-OTHER, DCN-OTHER, SW-OTHER (mandatory CCW filler)

  // Catch-all
  | "unknown-child";             // flag for human review

export interface ClassifiedLine {
  raw: RawCcwRow;
  role: LineRole;

  /** Set when role is supervisor/linecard/fabric-module/psu/etc. */
  slotKind?: SlotKind;

  /** True when PID ends with "/2" — second of a redundant pair. */
  isRedundantPeer: boolean;

  /** Base PID without the /2 suffix. Same as raw.partNumber when not redundant. */
  basePid: string;

  /** Detected region for power cords (EU, NA, UK, AU, JP, BR, etc.). */
  region?: Region;

  /** For DNA subscriptions: term in years derived from "-3Y" / "-5Y" / "-7Y" suffix. */
  licenseTermYears?: ContractTermYears;

  /** For DNA entitlement/subscription: tier extracted from PID (e.g. "DNA-A", "DNA-E"). */
  licenseTier?: LicenseSpec["tier"];

  /** For SmartNet: tier code (SNT, SNTP, OSP, etc.) → mapped to SmartnetTier. */
  smartnetTier?: SmartnetTier;

  /** Free-text annotation surfaced in the review UI (e.g. "CCW mandatory placeholder"). */
  note?: string;

  /** Confidence flag — strict mode marks anything not pattern-matched as low confidence. */
  confidence: "high" | "review-required";
}

// ============================================================
// LAYER 4: ANCHOR GROUPS
// Each anchor + its classified children, ready for catalog assembly.
// ============================================================

export interface ClassifiedAnchorGroup {
  anchor: ClassifiedLine;
  children: ClassifiedLine[];

  /** Detected vendor family from the anchor PID. */
  vendorFamily: VendorFamily;

  /** True if this anchor block contains stacking SKUs. */
  hasStacking: boolean;

  /** Stacking pattern detected (only meaningful when hasStacking is true). */
  stackingProfile?: StackingProfile;
}

export type VendorFamily =
  | "catalyst-9200"
  | "catalyst-9200l"
  | "catalyst-9300"
  | "catalyst-9300l"
  | "catalyst-9400"
  | "catalyst-9500"
  | "catalyst-9600"
  | "nexus-9500"
  | "nexus-other"
  | "optic"
  | "unknown";

/**
 * How stacking is configured for this chassis.
 *  - "kit-bundle"  : stack kit SKU + adapters + cables (e.g., 9200L, 9300L)
 *  - "direct"      : just stack-cable + stack-power, no kit (e.g., 9300)
 *  - "none"        : chassis present in export but no stacking SKUs found
 */
export interface StackingProfile {
  pattern: "kit-bundle" | "direct" | "none";
  kitPid?: string;                  // C9200L-STACK-KIT, C9300L-STACK-KIT2
  adapterPid?: string;              // C9200-STACK, C9300L-STACK-A
  adapterQty?: number;              // observed quantity (e.g., 2)
  dataCablePid?: string;            // STACK-T1-50CM, STACK-T3A-50CM, STACK-T4-50CM
  powerCablePid?: string;           // CAB-SPWR-30CM
  supportsStackPower: boolean;      // true if a CAB-SPWR-* line was found
}

// ============================================================
// LAYER 5: CATALOG PATCH
// What gets serialized to TypeScript code at the end.
// ============================================================

export interface CatalogPatch {
  generatedAt: string;
  sourceFileName: string;
  /** Per-chassis bundle additions/updates. */
  chassisBundles: ChassisBundlePatch[];
  /** Standalone modules to add to the module catalog (supervisors, linecards, etc.). */
  modules: ModulePatch[];
  /** Standalone optics from optic-anchor rows. */
  optics: OpticPatch[];
  /** PIDs that need human review (unknown anchors or unknown children). */
  needsReview: ClassifiedLine[];
}

export interface ChassisBundlePatch {
  chassisPid: string;
  vendorFamily: VendorFamily;
  isModular: boolean;

  /** Auto-includes carry their qty as observed in the export. */
  autoIncluded: AutoIncludePatch[];

  /** Power cord by region: only the region(s) observed are filled in. */
  powerCordByRegion: Partial<Record<Region, string>>;
  /** PSU count observed in the source row. */
  observedPsuQty: number;

  /** License info if a DNA pair was detected. */
  license?: {
    tier: LicenseSpec["tier"];                          // "DNA-A", "DNA-E", etc.
    entitlementPid: string;                // C9400-DNA-A
    subscriptionByTerm: Partial<Record<ContractTermYears, string>>; // { 3: "C9400-DNA-A-3Y" }
  };

  /** SmartNet info if a CON-* line was detected. */
  smartnet?: {
    tier: SmartnetTier;
    pid: string;                           // CON-SNT-C9407R
    termMonths: number;                    // 36
  };

  /** Stacking profile for fixed-config chassis that support stacking. */
  stackingProfile?: StackingProfile;
}

export interface AutoIncludePatch {
  pid: string;
  qty: number;
  note?: string;          // e.g., "CCW mandatory placeholder" for *-OTHER
  role: LineRole;         // for traceability
}

export interface ModulePatch {
  pid: string;
  slotKind: SlotKind;
  /** Which chassis this module was observed alongside. */
  observedInChassis: string[];
  /** Tentative description — engineer can refine before merging. */
  description: string;
}

export interface OpticPatch {
  pid: string;                  // includes the trailing "="
  description: string;          // best-effort from PID parsing
}

// ============================================================
// LAYER 6: VALIDATION & TEMPLATE GUARD
// ============================================================

/** Required column headers for the canonical CCW estimate template. */
export const REQUIRED_COLUMNS = [
  "Part Number",
  "Quantity",
  "Duration (Mnths)",
  "Initial Term(Months)",
  "Auto Renew Term(Months)",
  "Billing Model",
  "Reference id",
  "Group id",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

export interface TemplateValidationResult {
  isValid: boolean;
  missingColumns: RequiredColumn[];
  extraColumns: string[];
  message?: string;
}

// ============================================================
// PIPELINE RESULT — the full output of the importer
// ============================================================

export interface ImportPipelineResult {
  validation: TemplateValidationResult;
  parsed: ParsedCcw | null;
  classifiedAnchors: ClassifiedAnchorGroup[];
  patch: CatalogPatch | null;
  /** Top-level errors (file unreadable, no rows, etc.) */
  errors: string[];
}