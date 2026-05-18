// ============================================================
// HARDWARE LIBRARY — Cisco Enterprise Catalog (CCW-Aware)
// ============================================================

import {
  Region,
  SmartnetTier,
  ContractTermYears,
  ChassisSlotSpec,
  SlotKind,
  ModuleKind,
} from "../types";

export interface ModuleSpec {
  pid: string;
  description: string;
  kind: SlotKind;
  compatibleChassis?: string[];
}

export type DeviceType = "core" | "distribution" | "access" | "security" | "wireless" | "management";

export type PortSpeed =
  | "1G" | "2.5G" | "10G" | "25G" | "40G" | "50G" | "100G" | "400G";

export interface PortGroup {
  count: number;
  speed: PortSpeed;
  poe?: boolean;
}

export interface FaceplateConfig {
  accessPorts?: PortGroup;
  uplinkPorts?: PortGroup;
  rackUnits?: 1 | 2 | 3 | 4 | 5 | 7 | 10 | 13;
  modularSlots?: number;
}

// ============================================================
// CCW BUNDLE DEFINITIONS
// ============================================================
export interface BundleAutoItem {
  pid: string;
  qty: number;
  note?: string;
}

export interface PowerCordSpec {
  qty: number;                              // total cords needed (1 per PSU typically)
  byRegion: Partial<Record<Region, string>>;
}

export interface RedundantPsuSpec {
  pid: string;
  description: string;
}

export interface SmartnetSpec {
  baseSkuByTier: Partial<Record<SmartnetTier, string>>;
}

export interface LicenseSpec {
  tier: "Essentials" | "Advantage" | "Premier";
  entitlementPid: string;
  subscriptionByTerm: Partial<Record<ContractTermYears, string>>;
}

export interface StackingSpec {
  /** True if stack adapter must be ordered separately (9200/9200L) */
  adapterRequired: boolean;
  /** PIDs for stack adapter kit (if required) */
  adapterKits?: string[];
  /** Available data stack cables */
  dataCables?: { pid: string; length: string }[];
  /** Available power stack cables */
  powerCables?: { pid: string; length: string }[];
}

export interface ChassisBundle {
  /** Items always added to BOM, no user input needed */
  autoIncluded: BundleAutoItem[];
  /** Power cord (region-dependent) */
  powerCord: PowerCordSpec;
  /** Redundant PSU PID (if user opts in) */
  redundantPsu?: RedundantPsuSpec;
  /** SmartNet PID resolution */
  smartnet: SmartnetSpec;
  /** License entitlement + subscription PIDs */
  license: LicenseSpec;
  /** Stack accessory rules */
  stacking?: StackingSpec;
}

// ✨ M1 — Module port info (for linecards contributing to chassis port aggregation)
export interface ModulePortGroup {
  count: number;
  speed: PortSpeed;
  poe?: "PoE+" | "UPOE" | "UPOE+" | false;
}

export interface ProductSKU {
  pid: string;
  description: string;
  faceplate?: FaceplateConfig;
  bundle?: ChassisBundle;
  kind?: ModuleKind;             // "supervisor", "linecard", "psu", "fan", "stacking-cable", "stack-power-cable"
  slotKind?: SlotKind;           // which slot types this PID fits in (for sup/linecard)
  modulePorts?: ModulePortGroup; // contributed to chassis aggregation
  compatibleChassis?: string[];
}

export interface HardwareSeries {
  type: DeviceType;
  vendor: string;
  description: string;
  pids: ProductSKU[];
  compatibleOptics: string[];
  compatibleChassis?: string[];

  // ✨ M1 additions
  /** Modular chassis slot layout — present on series with `slots` */
  slotLayout?: ChassisSlotSpec[];
  /** True for 9200, 9300 (and 9300X) */
  isStackable?: boolean;
  /** Maximum members in a stack, typically 8 */
  maxStackSize?: number;
  /** True for 9300 (stack power supported); false for 9200 */
  supportsStackPower?: boolean;
  /** True if this series is a module catalog (not a standalone addable device) */
  isModuleCatalog?: boolean;
}

// ============================================================
// SHARED PRESETS — reduce repetition
// ============================================================

const POWER_CORDS_C9K = {
  qty: 2,
  byRegion: {
    EU: "CAB-9K10A-EU",
    US: "CAB-9K10A-NA",
    UK: "CAB-9K10A-UK",
    JP: "CAB-9K10A-JPN",
    AU: "CAB-9K10A-AUS",
    IN: "CAB-9K10A-IND",
    CN: "CAB-9K10A-CHN",
  },
};

const POWER_CORDS_TA = {
  qty: 1,
  byRegion: {
    EU: "CAB-TA-EU",
    US: "CAB-TA-NA",
    UK: "CAB-TA-UK",
    JP: "CAB-TA-JP",
    AU: "CAB-TA-AP",
    IN: "CAB-TA-IN",
    CN: "CAB-TA-CN",
  },
};

const C9300_STACKING: StackingSpec = {
  adapterRequired: false,
  dataCables: [
    { pid: "STACK-T1-50CM", length: "50cm" },
    { pid: "STACK-T1-1M",   length: "1m" },
    { pid: "STACK-T1-3M",   length: "3m" },
  ],
  powerCables: [
    { pid: "CAB-SPWR-30CM",  length: "30cm" },
    { pid: "CAB-SPWR-150CM", length: "150cm" },
  ],
};

const C9200L_STACKING: StackingSpec = {
  adapterRequired: true,
  adapterKits: ["C9200L-STACK-KIT"],
  dataCables: [
    { pid: "STACK-T4-50CM", length: "50cm" },
    { pid: "STACK-T4-1M",   length: "1m" },
    { pid: "STACK-T4-3M",   length: "3m" },
  ],
};

// ============================================================
// ✨ M1 — CATALYST 9400 SLOT LAYOUTS
// ============================================================

const C9404R_LAYOUT: ChassisSlotSpec[] = [
  { slot: 1, kind: "linecard" },
  { slot: 2, kind: "linecard" },
  { slot: 3, kind: "supervisor", required: true, note: "Supervisor required" },
  { slot: 4, kind: "supervisor", note: "Optional redundant supervisor (HA)" },
];

const C9407R_LAYOUT: ChassisSlotSpec[] = [
  { slot: 1, kind: "linecard" },
  { slot: 2, kind: "linecard" },
  { slot: 3, kind: "supervisor", required: true, note: "Supervisor required" },
  { slot: 4, kind: "supervisor", note: "Optional redundant supervisor (HA)" },
  { slot: 5, kind: "linecard" },
  { slot: 6, kind: "linecard" },
  { slot: 7, kind: "linecard" },
];

const C9410R_LAYOUT: ChassisSlotSpec[] = [
  { slot: 1, kind: "linecard" },
  { slot: 2, kind: "linecard" },
  { slot: 3, kind: "linecard" },
  { slot: 4, kind: "linecard" },
  { slot: 5, kind: "supervisor", required: true, note: "Supervisor required" },
  { slot: 6, kind: "supervisor", note: "Optional redundant supervisor (HA)" },
  { slot: 7, kind: "linecard" },
  { slot: 8, kind: "linecard" },
  { slot: 9, kind: "linecard" },
  { slot: 10, kind: "linecard" },
];

// ============================================================
// HARDWARE LIBRARY
// ============================================================
export const HARDWARE_LIBRARY: Record<string, HardwareSeries> = {
  // ============================================================
  // CATALYST 9500 — Campus Core
  // ============================================================
  "Catalyst 9500": {
    type: "core",
    vendor: "Cisco",
    description: "Fixed Campus Core / Aggregation",
    compatibleOptics: [
      "QSFP-100G-SR4", "QSFP-100G-LR4", "QSFP-40G-SR4",
      "SFP-25G-SR-S", "SFP-10G-SR", "SFP-10G-LR",
    ],
    pids: [
      // ----- 48Y4C variants -----
      {
        pid: "C9500-48Y4C-A",
        description: "48x 25G + 4x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-650WAC-R",  qty: 1, note: "Primary PSU" },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-A",        qty: 1, note: "Network Stack" },
            { pid: "S9500UK9-1715",     qty: 1, note: "IOS-XE image" },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-650WAC-R/2",
            description: "650W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9504YA4",
              SNTP: "CON-SNTP-C9504YA4",
              OS:   "CON-OS-C9504YA4",
              OSP:  "CON-OSP-C9504YA4",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9500-DNA-48Y4C-A",
            subscriptionByTerm: {
              1: "C9500-DNA-A-1Y",
              3: "C9500-DNA-A-3Y",
              5: "C9500-DNA-A-5Y",
              7: "C9500-DNA-A-7Y",
            },
          },
        },
      },
      {
        pid: "C9500-48Y4C-E",
        description: "48x 25G + 4x 100G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-650WAC-R",  qty: 1 },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-E",        qty: 1 },
            { pid: "S9500UK9-1715",     qty: 1 },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-650WAC-R/2",
            description: "650W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9504YE4",
              SNTP: "CON-SNTP-C9504YE4",
            },
          },
          license: {
            tier: "Essentials",
            entitlementPid: "C9500-DNA-48Y4C-E",
            subscriptionByTerm: {
              1: "C9500-DNA-E-1Y",
              3: "C9500-DNA-E-3Y",
              5: "C9500-DNA-E-5Y",
              7: "C9500-DNA-E-7Y",
            },
          },
        },
      },

      // ----- 24Y4C variants -----
      {
        pid: "C9500-24Y4C-A",
        description: "24x 25G + 4x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-650WAC-R",  qty: 1 },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-A",        qty: 1 },
            { pid: "S9500UK9-1715",     qty: 1 },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-650WAC-R/2",
            description: "650W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9502YA4",
              SNTP: "CON-SNTP-C9502YA4",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9500-DNA-24Y4C-A",
            subscriptionByTerm: {
              1: "C9500-DNA-A-1Y",
              3: "C9500-DNA-A-3Y",
              5: "C9500-DNA-A-5Y",
              7: "C9500-DNA-A-7Y",
            },
          },
        },
      },
      {
        pid: "C9500-24Y4C-E",
        description: "24x 25G + 4x 100G — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-650WAC-R",  qty: 1 },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-E",        qty: 1 },
            { pid: "S9500UK9-1715",     qty: 1 },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-650WAC-R/2",
            description: "650W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT: "CON-SNT-C9502YE4",
            },
          },
          license: {
            tier: "Essentials",
            entitlementPid: "C9500-DNA-24Y4C-E",
            subscriptionByTerm: {
              1: "C9500-DNA-E-1Y",
              3: "C9500-DNA-E-3Y",
              5: "C9500-DNA-E-5Y",
              7: "C9500-DNA-E-7Y",
            },
          },
        },
      },

      // ----- 32C variants -----
      {
        pid: "C9500-32C-A",
        description: "32x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 32, speed: "100G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-1500WAC-R", qty: 1 },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-A",        qty: 1 },
            { pid: "S9500UK9-1715",     qty: 1 },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-1500WAC-R/2",
            description: "1500W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C950032A",
              SNTP: "CON-SNTP-C950032A",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9500-DNA-32C-A",
            subscriptionByTerm: {
              1: "C9500-DNA-A-1Y",
              3: "C9500-DNA-A-3Y",
              5: "C9500-DNA-A-5Y",
              7: "C9500-DNA-A-7Y",
            },
          },
        },
      },

      // ----- 40X variants -----
      {
        pid: "C9500-40X-A",
        description: "40x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 40, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9K-PWR-650WAC-R",  qty: 1 },
            { pid: "C9K-F1-SSD-BLANK",  qty: 1 },
            { pid: "C9K-T1-FANTRAY",    qty: 2 },
            { pid: "C9500-NW-A",        qty: 1 },
            { pid: "S9500UK9-1715",     qty: 1 },
            { pid: "C9500-SSD-NONE",    qty: 1 },
            { pid: "C9500-RFID",        qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_C9K,
          redundantPsu: {
            pid: "C9K-PWR-650WAC-R/2",
            description: "650W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9500X40A",
              SNTP: "CON-SNTP-C9500X40A",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9500-DNA-40X-A",
            subscriptionByTerm: {
              1: "C9500-DNA-A-1Y",
              3: "C9500-DNA-A-3Y",
              5: "C9500-DNA-A-5Y",
              7: "C9500-DNA-A-7Y",
            },
          },
        },
      },
    ],
  },

  // ============================================================
  // ✨ M1 — CATALYST 9400 — Modular Campus Core/Distribution
  // ============================================================
  "Catalyst 9400": {
    type: "core",
    vendor: "Cisco",
    description: "Modular Campus Core/Distribution Chassis",
    compatibleOptics: [
      "QSFP-100G-SR4", "QSFP-100G-LR4", "QSFP-40G-SR4",
      "SFP-25G-SR-S", "SFP-10G-SR", "SFP-10G-LR",
      "GLC-SX-MMD", "GLC-LH-SMD",
    ],
    pids: [
      {
        pid: "C9404R",
        description: "Catalyst 9404R 4-slot chassis (2RU). 2 linecard + 2 supervisor slots.",
        faceplate: {
          modularSlots: 4,
          rackUnits: 2,
        },
      },
      {
        pid: "C9407R",
        description: "Catalyst 9407R 7-slot chassis (10RU). 5 linecard + 2 supervisor slots.",
        faceplate: {
          modularSlots: 7,
          rackUnits: 10,
        },
      },
      {
        pid: "C9410R",
        description: "Catalyst 9410R 10-slot chassis (13RU). 8 linecard + 2 supervisor slots.",
        faceplate: {
          modularSlots: 10,
          rackUnits: 13,
        },
      },
    ],
    // Note: slotLayout below applies as a fallback when chassis-specific
    // layout isn't found in CHASSIS_SLOT_LAYOUTS in hardware/index.ts
    // (We use the index helper because layout is per-PID, not per-series.)
  },

  // ============================================================
  // ✨ M1 — CATALYST 9400 SUPERVISORS (module catalog)
  // ============================================================
  "Catalyst 9400 Supervisors": {
    type: "core",
    vendor: "Cisco",
    description: "Catalyst 9400 Supervisor Engines",
    compatibleOptics: [
      "QSFP-100G-SR4", "QSFP-100G-LR4", "SFP-25G-SR-S",
      "SFP-10G-SR", "SFP-10G-LR",
    ],
    isModuleCatalog: true,
    pids: [
      {
        pid: "C9400-SUP-1",
        description: "Cat 9400 Supervisor Engine 1 (240Gbps per slot, 80G uplinks).",
        kind: "supervisor",
        slotKind: "supervisor",
      },
      {
        pid: "C9400-SUP-1XL",
        description: "Cat 9400 Supervisor Engine 1XL (480Gbps per slot).",
        kind: "supervisor",
        slotKind: "supervisor",
      },
      {
        pid: "C9400-SUP-1XL-Y",
        description: "Cat 9400 Supervisor 1XL with 25G uplinks.",
        kind: "supervisor",
        slotKind: "supervisor",
      },
      {
        pid: "C9400X-SUP-2",
        description: "Cat 9400X Supervisor Engine 2 (next-gen, recommended for new designs).",
        kind: "supervisor",
        slotKind: "supervisor",
      },
      {
        pid: "C9400X-SUP-2XL",
        description: "Cat 9400X Supervisor Engine 2XL (highest performance).",
        kind: "supervisor",
        slotKind: "supervisor",
      },
    ],
  },

  // ============================================================
  // ✨ M1 — CATALYST 9400 LINECARDS (module catalog)
  // ============================================================
  "Catalyst 9400 Linecards": {
    type: "core",
    vendor: "Cisco",
    description: "Catalyst 9400 Linecards",
    compatibleOptics: [
      "QSFP-100G-SR4", "QSFP-100G-LR4", "QSFP-40G-SR4",
      "SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD", "GLC-LH-SMD",
    ],
    isModuleCatalog: true,
    pids: [
      {
        pid: "C9400-LC-48U",
        description: "48-port 1G UPOE linecard.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 48, speed: "1G", poe: "UPOE" },
      },
      {
        pid: "C9400-LC-48P",
        description: "48-port 1G PoE+ linecard.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 48, speed: "1G", poe: "PoE+" },
      },
      {
        pid: "C9400-LC-48T",
        description: "48-port 1G data-only linecard.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 48, speed: "1G" },
      },
      {
        pid: "C9400-LC-48UX",
        description: "48-port multigigabit (1/2.5/5/10G) UPOE linecard.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 48, speed: "10G", poe: "UPOE" },
      },
      {
        pid: "C9400-LC-48XS",
        description: "48-port 10G SFP+ linecard for 10G aggregation.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 48, speed: "10G" },
      },
      {
        pid: "C9400-LC-24XS",
        description: "24-port 10G SFP+ linecard.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 24, speed: "10G" },
      },
      {
        pid: "C9400-LC-12QC",
        description: "12-port 40G/100G QSFP linecard for high-speed uplinks.",
        kind: "linecard",
        slotKind: "linecard",
        modulePorts: { count: 12, speed: "100G" },
      },
    ],
  },

  // ============================================================
  // ✨ M1 — CATALYST 9400 POWER & FANS (module catalog)
  // ============================================================
  "Catalyst 9400 Power & Fans": {
    type: "core",
    vendor: "Cisco",
    description: "Catalyst 9400 Power Supplies and Fan Trays",
    compatibleOptics: [],
    isModuleCatalog: true,
    pids: [
      {
        pid: "C9400-PWR-2100AC",
        description: "Cat 9400 2100W AC power supply.",
        kind: "psu",
      },
      {
        pid: "C9400-PWR-3200AC",
        description: "Cat 9400 3200W AC power supply.",
        kind: "psu",
      },
      {
        pid: "C9400-PWR-3200DC",
        description: "Cat 9400 3200W DC power supply.",
        kind: "psu",
      },
      {
        pid: "C9400-FAN",
        description: "Cat 9400 fan tray (model varies by chassis size).",
        kind: "fan",
      },
    ],
  },

  // ============================================================
  // CATALYST 9300 — Stackable Access / Distribution
  // ============================================================
  "Catalyst 9300": {
    type: "access",
    vendor: "Cisco",
    description: "Stackable Access / Distribution",
    compatibleOptics: [
      "SFP-10G-SR", "SFP-10G-LR", "QSFP-40G-SR4",
      "GLC-SX-MMD", "GLC-LH-SMD",
    ],

    // ✨ M1 additions
    isStackable: true,
    maxStackSize: 8,
    supportsStackPower: true,

    pids: [
      {
        pid: "C9300-48P-A",
        description: "48x 1G PoE+ + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "PWR-C1-715WAC-P",   qty: 1, note: "Primary PSU" },
            { pid: "C9300-NW-A-48",     qty: 1, note: "Network Advantage" },
            { pid: "C9300-NM-BLANK",    qty: 1, note: "Module slot blank" },
            { pid: "C9300-SPS-NONE",    qty: 1, note: "No StackPower" },
            { pid: "C9300-RFID",        qty: 1 },
            { pid: "S9300UK9-179",      qty: 1, note: "IOS-XE image" },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_TA,
          redundantPsu: {
            pid: "PWR-C1-715WAC-P/2",
            description: "715W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9348PA",
              SNTP: "CON-SNTP-C9348PA",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9300-DNA-A-48",
            subscriptionByTerm: {
              1: "C9300-DNA-A-48-1Y",
              3: "C9300-DNA-A-48-3Y",
              5: "C9300-DNA-A-48-5Y",
              7: "C9300-DNA-A-48-7Y",
            },
          },
          stacking: C9300_STACKING,
        },
      },
      {
        pid: "C9300-48P-E",
        description: "48x 1G PoE+ + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "PWR-C1-715WAC-P",   qty: 1 },
            { pid: "C9300-NW-E-48",     qty: 1 },
            { pid: "C9300-NM-BLANK",    qty: 1 },
            { pid: "C9300-SPS-NONE",    qty: 1 },
            { pid: "C9300-RFID",        qty: 1 },
            { pid: "S9300UK9-179",      qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_TA,
          redundantPsu: {
            pid: "PWR-C1-715WAC-P/2",
            description: "715W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT: "CON-SNT-C9348PE",
            },
          },
          license: {
            tier: "Essentials",
            entitlementPid: "C9300-DNA-E-48",
            subscriptionByTerm: {
              1: "C9300-DNA-E-48-1Y",
              3: "C9300-DNA-E-48-3Y",
              5: "C9300-DNA-E-48-5Y",
              7: "C9300-DNA-E-48-7Y",
            },
          },
          stacking: C9300_STACKING,
        },
      },
      {
        pid: "C9300-24P-A",
        description: "24x 1G PoE+ + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "PWR-C1-715WAC-P",   qty: 1 },
            { pid: "C9300-NW-A-24",     qty: 1 },
            { pid: "C9300-NM-BLANK",    qty: 1 },
            { pid: "C9300-SPS-NONE",    qty: 1 },
            { pid: "C9300-RFID",        qty: 1 },
            { pid: "S9300UK9-179",      qty: 1 },
            { pid: "NETWORK-PNP-LIC",   qty: 1 },
          ],
          powerCord: POWER_CORDS_TA,
          redundantPsu: {
            pid: "PWR-C1-715WAC-P/2",
            description: "715W AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C9324PA",
              SNTP: "CON-SNTP-C9324PA",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9300-DNA-A-24",
            subscriptionByTerm: {
              1: "C9300-DNA-A-24-1Y",
              3: "C9300-DNA-A-24-3Y",
              5: "C9300-DNA-A-24-5Y",
              7: "C9300-DNA-A-24-7Y",
            },
          },
          stacking: C9300_STACKING,
        },
      },
    ],
  },

  // ============================================================
  // CATALYST 9200L — Lite Branch Access
  // ============================================================
  "Catalyst 9200L": {
    type: "access",
    vendor: "Cisco",
    description: "Lite Branch Access Switches",
    compatibleOptics: ["SFP-10G-SR", "GLC-SX-MMD"],

    // ✨ M1 additions
    isStackable: true,
    maxStackSize: 8,
    supportsStackPower: false,

    pids: [
      {
        pid: "C9200L-24T-4X-E",
        description: "24x 1G + 4x 10G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9200L-NW-E-24",      qty: 1, note: "Network Essentials" },
            { pid: "PWR-C5-BLANK",        qty: 1 },
            { pid: "C9200-STACK-BLANK",   qty: 2 },
            { pid: "C9K-ACC-RBFT",        qty: 1 },
            { pid: "C9K-ACC-SCR-4",       qty: 1 },
            { pid: "CAB-GUIDE-1RU",       qty: 1 },
            { pid: "NETWORK-PNP-LIC",     qty: 1 },
          ],
          powerCord: POWER_CORDS_TA,
          smartnet: {
            baseSkuByTier: {
              SNT: "CON-SNT-C920L24X",
            },
          },
          license: {
            tier: "Essentials",
            entitlementPid: "C9200L-DNA-E-24",
            subscriptionByTerm: {
              1: "C9200L-DNA-E-24-1Y",
              3: "C9200L-DNA-E-24-3Y",
              5: "C9200L-DNA-E-24-5Y",
              7: "C9200L-DNA-E-24-7Y",
            },
          },
          stacking: C9200L_STACKING,
        },
      },
      {
        pid: "C9200L-48P-4X-A",
        description: "48x 1G PoE+ + 4x 10G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
        bundle: {
          autoIncluded: [
            { pid: "C9200L-NW-A-48",      qty: 1 },
            { pid: "PWR-C5-1KWAC",        qty: 1 },
            { pid: "C9200-STACK-BLANK",   qty: 2 },
            { pid: "C9K-ACC-RBFT",        qty: 1 },
            { pid: "C9K-ACC-SCR-4",       qty: 1 },
            { pid: "CAB-GUIDE-1RU",       qty: 1 },
            { pid: "NETWORK-PNP-LIC",     qty: 1 },
          ],
          powerCord: POWER_CORDS_TA,
          redundantPsu: {
            pid: "PWR-C5-1KWAC/2",
            description: "1KW AC Redundant PSU",
          },
          smartnet: {
            baseSkuByTier: {
              SNT:  "CON-SNT-C920L48A",
              SNTP: "CON-SNTP-C920L48A",
            },
          },
          license: {
            tier: "Advantage",
            entitlementPid: "C9200L-DNA-A-48",
            subscriptionByTerm: {
              1: "C9200L-DNA-A-48-1Y",
              3: "C9200L-DNA-A-48-3Y",
              5: "C9200L-DNA-A-48-5Y",
              7: "C9200L-DNA-A-48-7Y",
            },
          },
          stacking: C9200L_STACKING,
        },
      },
    ],
  },

  // ============================================================
  // ✨ M1 — STACKWISE CABLES (module catalog)
  // ============================================================
  "StackWise Cables": {
    type: "access",
    vendor: "Cisco",
    description: "StackWise data and power cables",
    compatibleOptics: [],
    isModuleCatalog: true,
    pids: [
      {
        pid: "STACK-T1-50CM",
        description: "StackWise-1T cable, 50cm. For Cat 9300 stacking.",
        kind: "stacking-cable",
      },
      {
        pid: "STACK-T1-1M",
        description: "StackWise-1T cable, 1m.",
        kind: "stacking-cable",
      },
      {
        pid: "STACK-T1-3M",
        description: "StackWise-1T cable, 3m.",
        kind: "stacking-cable",
      },
      {
        pid: "STACK-T4-50CM",
        description: "StackWise-T4 cable, 50cm. For Cat 9200/9200L stacking.",
        kind: "stacking-cable",
      },
      {
        pid: "STACK-T4-1M",
        description: "StackWise-T4 cable, 1m.",
        kind: "stacking-cable",
      },
      {
        pid: "STACK-T4-3M",
        description: "StackWise-T4 cable, 3m.",
        kind: "stacking-cable",
      },
      {
        pid: "CAB-SPWR-30CM",
        description: "StackPower cable, 30cm. Cat 9300 only.",
        kind: "stack-power-cable",
      },
      {
        pid: "CAB-SPWR-150CM",
        description: "StackPower cable, 150cm.",
        kind: "stack-power-cable",
      },
    ],
  },

  

};

// ============================================================
// ✨ M1 — CHASSIS SLOT LAYOUTS (per-PID, not per-series)
// ============================================================

const CHASSIS_SLOT_LAYOUTS: Record<string, ChassisSlotSpec[]> = {
  C9404R: C9404R_LAYOUT,
  C9407R: C9407R_LAYOUT,
  C9410R: C9410R_LAYOUT,
};

// ============================================================
// LAYER VISUAL CONFIG
// ============================================================
export const LAYER_CONFIG: Record<
  DeviceType,
  { label: string; color: string; bg: string; y: number }
> = {
  security: {
    label: "SECURITY PERIMETER",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.05)",
    y: 0,
  },
  core: {
    label: "CORE LAYER",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.05)",
    y: 240,
  },
  distribution: {
    label: "DISTRIBUTION LAYER",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.05)",
    y: 480,
  },
  access: {
    label: "ACCESS LAYER",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.05)",
    y: 720,
  },
  wireless: {
    label: "WIRELESS",
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.05)",
    y: 960,
  },
  management: {
    label: "MANAGEMENT",
    color: "#0ea5e9",
    bg: "rgba(14, 165, 233, 0.05)",
    y: 1200,
  },
};

// ============================================================
// HELPERS
// ============================================================
export function getFaceplate(model: string, pid: string): FaceplateConfig | null {
  const catalog = getEffectiveCatalog();   // ⭐ honors overrides
  const series = catalog[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.faceplate ?? null;
}

export function getBundle(model: string, pid: string): ChassisBundle | null {
  const catalog = getEffectiveCatalog();   // ⭐ honors overrides
  const series = catalog[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.bundle ?? null;
}

export function hasBundle(model: string, pid: string): boolean {
  return getBundle(model, pid) !== null;
}

// ============================================================
// ✨ M1 — MODULAR CHASSIS HELPERS
// ============================================================

/**
 * Returns the slot layout for a given chassis PID, or null if not modular.
 */
export function getSlotLayout(chassisPid: string): ChassisSlotSpec[] | null {
  return CHASSIS_SLOT_LAYOUTS[chassisPid] ?? null;
}

/**
 * Quick boolean test for whether a PID is a modular chassis.
 */
export function isModularChassis(chassisPid: string): boolean {
  return chassisPid in CHASSIS_SLOT_LAYOUTS;
}

/**
 * Boolean test for whether a series supports stacking.
 */
export function isStackableSeries(seriesName: string): boolean {
  const series = HARDWARE_LIBRARY[seriesName];
  return series?.isStackable === true;
}

/**
 * Boolean test for whether a series supports StackPower (only Cat 9300).
 */
export function supportsStackPower(seriesName: string): boolean {
  const series = HARDWARE_LIBRARY[seriesName];
  return series?.supportsStackPower === true;
}

/**
 * Boolean test for whether a series is a module catalog (not addable as a device).
 */
export function isModuleCatalogSeries(seriesName: string): boolean {
  const series = HARDWARE_LIBRARY[seriesName];
  return series?.isModuleCatalog === true;
}

/**
 * Returns all module PIDs across the catalog of a given kind, optionally
 * filtered by slotKind for compatibility.
 */
export function getAvailableModules(
  kind: ModuleKind,
  slotKind?: SlotKind
): { pid: string; description: string; listPrice?: number; modulePorts?: ModulePortGroup }[] {
  const results: {
    pid: string;
    description: string;
    listPrice?: number;
    modulePorts?: ModulePortGroup;
  }[] = [];

  for (const series of Object.values(HARDWARE_LIBRARY)) {
    for (const sku of series.pids) {
      if (sku.kind !== kind) continue;
      if (
        slotKind &&
        sku.slotKind &&
        sku.slotKind !== slotKind &&
        sku.slotKind !== "blank"
      ) {
        continue;
      }
      results.push({
        pid: sku.pid,
        description: sku.description,
        modulePorts: sku.modulePorts,
      });
    }
  }
  return results;
}

/**
 * Returns all stacking cable options (with optional StackPower filter).
 */
export function getStackingCables(
  includeStackPower: boolean = false
): { pid: string; description: string; listPrice?: number }[] {
  const results: { pid: string; description: string; listPrice?: number }[] = [];
  for (const series of Object.values(HARDWARE_LIBRARY)) {
    for (const sku of series.pids) {
      if (sku.kind === "stacking-cable") {
        results.push({
          pid: sku.pid,
          description: sku.description,
        });
      } else if (includeStackPower && sku.kind === "stack-power-cable") {
        results.push({
          pid: sku.pid,
          description: sku.description,
        });
      }
    }
  }
  return results;
}

/**
 * Returns a list of series names that should appear in the "Add Device"
 * dropdown — i.e., excludes module catalogs.
 */
export function getAddableSeriesNames(): string[] {
  const catalog = getEffectiveCatalog();   // ⭐ honors overrides
  return Object.entries(catalog)
    .filter(([_, series]) => !series.isModuleCatalog)
    .map(([name]) => name);
}
// ============================================================
// LOCALSTORAGE OVERRIDES (for catalog testing without code changes)
// ============================================================

const OVERRIDES_KEY = "ka-bom-catalog-overrides-v1";

export interface CatalogOverride {
  /** Series name → PID → partial ProductSKU patch */
  bundles: Record<string, Record<string, Partial<ProductSKU>>>;
}

function loadOverrides(): CatalogOverride {
  if (typeof window === "undefined") return { bundles: {} };
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return { bundles: {} };
    return JSON.parse(raw);
  } catch {
    return { bundles: {} };
  }
}

export function getModule(pid: string): ModuleSpec | null {
  const catalog = getEffectiveCatalog();   // ⭐ honors overrides
  for (const series of Object.values(catalog)) {
    if (!series.isModuleCatalog) continue;
    const found = series.pids.find((p) => p.pid === pid);
    if (found) {
      return {
        pid: found.pid,
        description: found.description ?? "",
        kind: found.slotKind ?? "linecard",
        compatibleChassis: found.compatibleChassis,
      };
    }
  }
  return null;
}
export function saveOverrides(overrides: CatalogOverride) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function clearOverrides() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OVERRIDES_KEY);
}

/**
 * Returns the catalog merged with any localStorage overrides.
 * Components should use this instead of HARDWARE_LIBRARY directly
 * when they want to honor user-supplied bundle data.
 */
export function getEffectiveCatalog(): typeof HARDWARE_LIBRARY {
  const overrides = loadOverrides();
  if (Object.keys(overrides.bundles).length === 0) return HARDWARE_LIBRARY;

  // Deep-clone so we don't mutate the source library.
  const merged: typeof HARDWARE_LIBRARY = JSON.parse(
    JSON.stringify(HARDWARE_LIBRARY)
  );

  for (const [seriesName, pidPatches] of Object.entries(overrides.bundles)) {
    let series = merged[seriesName];

    // 🆕 If the series doesn't exist yet, create a stub so override PIDs
    //    can land somewhere. The user is responsible for filling out
    //    series-level metadata (type, vendor, etc.) via code edit later.
    if (!series) {
      series = {
        type: "core",                  // sensible default; user can refine
        vendor: "Cisco",
        description: `${seriesName} (override-only — not yet in source catalog)`,
        compatibleOptics: [],
        pids: [],
      };
      merged[seriesName] = series;
    }

    for (const [pid, patch] of Object.entries(pidPatches)) {
      const existing = series.pids.find((p) => p.pid === pid);

      if (existing) {
        // 🆕 Deep-merge bundle so we don't blow away existing fields.
        if (patch.bundle && existing.bundle) {
          existing.bundle = mergeBundles(existing.bundle, patch.bundle);
          // Then merge other top-level fields (description, faceplate, etc.)
          const { bundle: _, ...rest } = patch;
          Object.assign(existing, rest);
        } else {
          Object.assign(existing, patch);
        }
      } else {
        // 🆕 PID didn't exist — push it as a new ProductSKU.
        series.pids.push({
          pid,
          description: patch.description ?? `${pid} (imported)`,
          ...patch,
        } as ProductSKU);
      }
    }
  }

  return merged;
}

/**
 * Deep-merge two ChassisBundle objects so override data ENRICHES instead of
 * replacing. Specifically:
 *   - autoIncluded: union by pid (override wins on conflict)
 *   - powerCord.byRegion: merge maps
 *   - smartnet.baseSkuByTier: merge maps
 *   - license.subscriptionByTerm: merge maps
 *   - license top-level: override wins (tier, entitlementPid)
 */
function mergeBundles(
  base: ChassisBundle,
  patch: ChassisBundle
): ChassisBundle {
  const autoIncludedMap = new Map<string, BundleAutoItem>();
  for (const item of base.autoIncluded) autoIncludedMap.set(item.pid, item);
  for (const item of patch.autoIncluded) autoIncludedMap.set(item.pid, item);

  return {
    autoIncluded: Array.from(autoIncludedMap.values()),
    powerCord: {
      qty: patch.powerCord?.qty ?? base.powerCord.qty,
      byRegion: {
        ...base.powerCord.byRegion,
        ...patch.powerCord?.byRegion,
      },
    },
    redundantPsu: patch.redundantPsu ?? base.redundantPsu,
    smartnet: {
      baseSkuByTier: {
        ...base.smartnet.baseSkuByTier,
        ...patch.smartnet?.baseSkuByTier,
      },
    },
    license: {
      tier: patch.license?.tier ?? base.license.tier,
      entitlementPid: patch.license?.entitlementPid ?? base.license.entitlementPid,
      subscriptionByTerm: {
        ...base.license.subscriptionByTerm,
        ...patch.license?.subscriptionByTerm,
      },
    },
    stacking: patch.stacking ?? base.stacking,
  };
}

export function loadCatalogOverrides(): CatalogOverride {
  return loadOverrides();
}


// ============================================================
// ✨ STACKING HELPERS
// ============================================================

/**
 * Returns the default stacking cable PID for a given series.
 * Picks the standard 50cm variant — user can override in the popover.
 */
export function getDefaultStackingCable(seriesName: string): string | null {
  const series = HARDWARE_LIBRARY[seriesName];
  if (!series?.isStackable) return null;

  // Find the first stacking cable referenced in the series' bundle config.
  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.dataCables;
    if (cables && cables.length > 0) {
      // Prefer 50cm — Cisco's most common shipping default.
      const fiftyCm = cables.find((c) => c.length === "50cm");
      return fiftyCm?.pid ?? cables[0].pid;
    }
  }
  return null;
}

/**
 * Returns the default StackPower cable PID for a series, if supported.
 */
export function getDefaultStackPowerCable(seriesName: string): string | null {
  const series = HARDWARE_LIBRARY[seriesName];
  if (!series?.supportsStackPower) return null;

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.powerCables;
    if (cables && cables.length > 0) {
      const thirtyCm = cables.find((c) => c.length === "30cm");
      return thirtyCm?.pid ?? cables[0].pid;
    }
  }
  return null;
}

/**
 * Returns all available stacking data cables for a series.
 */
export function getStackingCablesForSeries(
  seriesName: string
): { pid: string; length: string }[] {
  const series = HARDWARE_LIBRARY[seriesName];
  if (!series?.isStackable) return [];

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.dataCables;
    if (cables && cables.length > 0) return cables;
  }
  return [];
}

/**
 * Returns all available StackPower cables for a series.
 */
export function getStackPowerCablesForSeries(
  seriesName: string
): { pid: string; length: string }[] {
  const series = HARDWARE_LIBRARY[seriesName];
  if (!series?.supportsStackPower) return [];

  for (const sku of series.pids) {
    const cables = sku.bundle?.stacking?.powerCables;
    if (cables && cables.length > 0) return cables;
  }
  return [];
}