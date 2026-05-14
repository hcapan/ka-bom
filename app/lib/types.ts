// ============================================================
// SCHEMA — Project-centric, DB-migration-ready
// ============================================================

export const SCHEMA_VERSION = 4;

// ============================================================
// LAYERS
// ============================================================
export type DeviceType =
  | "core"
  | "distribution"
  | "access"
  | "security"
  | "wireless"      // Phase 2: APs, WLCs
  | "management";   // Phase 2: ISE, Catalyst Center, etc.

// ============================================================
// CONTRACT / SUPPORT
// ============================================================
export type SmartnetTier =
  | "SNT"    // SMARTnet 8x5xNBD
  | "SNTP"   // SMARTnet Premium 24x7x4
  | "OS"     // Solution Support 8x5xNBD
  | "OSP"    // Solution Support Premium 24x7x4
  | "PSUP"   // Partner Support
  | "ECMU"   // Embedded — software only
  | "NONE";

export type ContractTermYears = 1 | 2 | 3 | 4 | 5 | 7;

// ============================================================
// REGION (for power cord selection)
// ============================================================
export type Region = "EU" | "US" | "UK" | "JP" | "AU" | "IN" | "CN";

// ============================================================
// PROJECT — Top-level container
// ============================================================

export interface UISettings {
  bundleEdges: boolean;          
  expandedBundles: string[];     
}


export interface DeviceGroup {
  id: string;
  label: string;
  parentGroupId?: string;        // ← nesting
  collapsed: boolean;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  color?: string;
}


export interface Project {
  id: string;
  schemaVersion: number;
  metadata: ProjectMetadata;
  topology: Topology;
  globalDefaults: GlobalDefaults;
  createdAt: string;
  updatedAt: string;
  ui: UISettings; 
  
 
}


export interface ProjectMetadata {
  name: string;
  customer?: string;
  customerNumber?: string;     // CCW BU number
  opportunityId?: string;      // CCW Deal ID
  owner?: string;
  description?: string;
  tags?: string[];
  naming?: NamingConfig;
}

export interface Topology {
  devices: ConfiguredDevice[];
  links: Link[];
  groups: DeviceGroup[];
}

export interface NamingConfig {
  /** When true, auto-fill hostname from pattern */
  autoEnabled: boolean;
  /** Pattern with tokens like {LAYER}, {nn} */
  pattern: string;
}

export interface GlobalDefaults {
  region: Region;
  smartnetTier: SmartnetTier;
  smartnetTermYears: ContractTermYears;
  licenseTermYears: ContractTermYears;
  defaultOptic: string;
}

// ============================================================
// CONFIGURED DEVICE
// ============================================================
export interface ConfiguredDevice {
  id: string;                          // "CORE-01"
  name: string;                        // hostname
  type: DeviceType;
  position?: { x: number; y: number };

  hardware: HardwareConfig;
  license?: LicenseConfig;
  smartnet?: SmartnetConfig;

  notes?: string;
  customFields?: Record<string, string>;
  groupId?: string | null;
}

export interface HardwareConfig {
  series: string;                      // "Catalyst 9500"
  chassisPid: string;                  // "C9500-48Y4C-A"

  // Power options
  region?: Region;                     // overrides project default
  redundantPsu?: boolean;              // adds the /2 PSU SKU

  // Stacking (Chunk 5)
  stacking?: StackingConfig;

  // Future: modular chassis, firewall NMs
  expansionModules?: ExpansionModule[];
}

export interface LicenseConfig {
  termYears: ContractTermYears;
  perpetual?: boolean;
}

export interface SmartnetConfig {
  tier: SmartnetTier;
  termYears: ContractTermYears;
  overridden?: boolean;                // user changed from global default
}

export interface StackingConfig {
  enabled: boolean;
  adapterKitPid?: string;              // for 9200/9200L
  dataCablePid?: string;
  powerCablePid?: string;
}

export interface ExpansionModule {
  slot: number;
  pid: string;
}

// ============================================================
// LINK
// ============================================================
export interface Link {
  id: string;
  from: string;
  to: string;
  sourceHandle?: string;
  targetHandle?: string;
  isLateral?: boolean;
  optic: OpticConfig;
}

export interface OpticConfig {
  pid: string;                         // "SFP-10G-SR-S" (without =)
  /** Each link consumes 2 optics by default; override per link if asymmetric. */
  quantityPerLink?: number;
}

// ============================================================
// BOM
// ============================================================
export interface BOMLine {
  partNumber: string;
  quantity: number;
  durationMonths?: number;
  groupId?: number;                    // ties children to parent chassis
  notes?: string;
}

// ============================================================
// LEGACY TYPES (for migration only — remove after Chunk 2 stabilizes)
// ============================================================
/** @deprecated Use ConfiguredDevice */
export interface LegacyDevice {
  id: string;
  name: string;
  pid: string;
  model: string;
  type: DeviceType;
  position?: { x: number; y: number };
}

/** @deprecated Use Link */
export interface LegacyLink {
  id: string;
  from: string;
  to: string;
  sku: string;
  sourceHandle?: string;
  targetHandle?: string;
  isLateral?: boolean;
}

// Backward-compat aliases so existing components keep working until refactored
export type Device = ConfiguredDevice;