// ============================================================
// HARDWARE LIBRARY — Cisco Enterprise Catalog (CCW-Aware)
// ============================================================

import { Region, SmartnetTier, ContractTermYears } from "../types";

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
  rackUnits?: 1 | 2 | 3 | 4 | 5 | 7 | 10;
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

export interface ProductSKU {
  pid: string;
  description: string;
  faceplate?: FaceplateConfig;
  bundle?: ChassisBundle;     // ✅ NEW — CCW BOM data
}

export interface HardwareSeries {
  type: DeviceType;
  vendor: string;
  description: string;
  pids: ProductSKU[];
  compatibleOptics: string[];
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
  adapterRequired: false,                       // included
  dataCables: [
    { pid: "STACK-T1-50CM",  length: "50cm" },
    { pid: "STACK-T1-1M",    length: "1m" },
    { pid: "STACK-T1-3M",    length: "3m" },
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

      // (Keep your existing entries for C9500-32C-E, C9500-40X-E, C9500-16X-A/E
      // — same pattern, just swap NW-E and DNA-*-E. Add when needed.)
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

      // (Add C9300-24P-E, 48T-A/E, 24T-A, 48UXM-A/E, 24UX-A
      //  same pattern with their respective NW/DNA SKUs)
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

      // (Add other 9200L variants similarly — 4G uplink versions, T variants, etc.)
    ],
  },

  // ============================================================
  // OTHER SERIES (faceplate-only, bundle to be added in Phase 2)
  // ============================================================
  // Keep your existing 9500X, Nexus 9000, 9400, 9300X, 9200, Meraki,
  // Secure Firewall entries here unchanged. We'll enrich them later.
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
  const series = HARDWARE_LIBRARY[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.faceplate ?? null;
}

export function getBundle(model: string, pid: string): ChassisBundle | null {
  const series = HARDWARE_LIBRARY[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.bundle ?? null;
}

/** Returns true if the chassis has a CCW bundle defined */
export function hasBundle(model: string, pid: string): boolean {
  return getBundle(model, pid) !== null;
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

  const merged: typeof HARDWARE_LIBRARY = JSON.parse(
    JSON.stringify(HARDWARE_LIBRARY)
  );

  for (const [seriesName, pidPatches] of Object.entries(overrides.bundles)) {
    const series = merged[seriesName];
    if (!series) continue;
    for (const [pid, patch] of Object.entries(pidPatches)) {
      const product = series.pids.find((p) => p.pid === pid);
      if (product) {
        Object.assign(product, patch);
      }
    }
  }

  return merged;
}

export function loadCatalogOverrides(): CatalogOverride {
  return loadOverrides();
}