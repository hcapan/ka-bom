// ============================================================
// HARDWARE LIBRARY — Cisco Enterprise Catalog (Series → PIDs)
// ============================================================

export type DeviceType = "core" | "distribution" | "access" | "security";

export type PortSpeed =
  | "1G"
  | "2.5G"
  | "10G"
  | "25G"
  | "40G"
  | "50G"
  | "100G"
  | "400G";

export interface PortGroup {
  count: number;
  speed: PortSpeed;
  poe?: boolean;
}

export interface FaceplateConfig {
  accessPorts?: PortGroup;
  uplinkPorts?: PortGroup;
  rackUnits?: 1 | 2 | 3 | 4 | 5 | 7 | 10;
  /** For modular chassis: number of line-card slots */
  modularSlots?: number;
}

export interface ProductSKU {
  pid: string;
  description: string;
  faceplate?: FaceplateConfig;
}

export interface HardwareSeries {
  type: DeviceType;
  vendor: string;
  description: string;
  pids: ProductSKU[];
  compatibleOptics: string[];
}

// ============================================================
// HARDWARE LIBRARY
// ============================================================
export const HARDWARE_LIBRARY: Record<string, HardwareSeries> = {
  // ============================================================
  // CORE / DATA CENTER
  // ============================================================
  "Catalyst 9500": {
    type: "core",
    vendor: "Cisco",
    description: "Fixed Campus Core / Aggregation",
    compatibleOptics: [
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
      "SFP-10G-LR",
    ],
    pids: [
      {
        pid: "C9500-48Y4C-A",
        description: "48x 25G + 4x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
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
      },
      {
        pid: "C9500-24Y4C-A",
        description: "24x 25G + 4x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
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
      },
      {
        pid: "C9500-32C-A",
        description: "32x 100G — Network Advantage",
        faceplate: {
          accessPorts: { count: 32, speed: "100G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500-32C-E",
        description: "32x 100G — Network Essentials",
        faceplate: {
          accessPorts: { count: 32, speed: "100G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500-40X-A",
        description: "40x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 40, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500-40X-E",
        description: "40x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 40, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500-16X-A",
        description: "16x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500-16X-E",
        description: "16x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Catalyst 9500X": {
    type: "core",
    vendor: "Cisco",
    description: "Next-Gen High-Performance Core",
    compatibleOptics: [
      "QSFP-400G-SR4",
      "QSFP-400G-LR4",
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "SFP-25G-SR-S",
    ],
    pids: [
      {
        pid: "C9500X-28C8D-A",
        description: "28x 100G + 8x 400G — Network Advantage",
        faceplate: {
          accessPorts: { count: 28, speed: "100G" },
          uplinkPorts: { count: 8, speed: "400G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500X-28C8D-E",
        description: "28x 100G + 8x 400G — Network Essentials",
        faceplate: {
          accessPorts: { count: 28, speed: "100G" },
          uplinkPorts: { count: 8, speed: "400G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9500X-60L4D-A",
        description: "60x 50G + 4x 400G — Network Advantage",
        faceplate: {
          accessPorts: { count: 60, speed: "50G" },
          uplinkPorts: { count: 4, speed: "400G" },
          rackUnits: 2,
        },
      },
    ],
  },

  "Nexus 9000": {
    type: "core",
    vendor: "Cisco",
    description: "Data Center Spine / Leaf",
    compatibleOptics: [
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "QSFP-100G-AOC3M",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
    pids: [
      {
        pid: "N9K-C9336C-FX2",
        description: "36x 100G — DC Spine",
        faceplate: {
          accessPorts: { count: 36, speed: "100G" },
          rackUnits: 1,
        },
      },
      {
        pid: "N9K-C9336C-FX2-Z",
        description: "36x 100G — Cloud Scale Z",
        faceplate: {
          accessPorts: { count: 36, speed: "100G" },
          rackUnits: 1,
        },
      },
      {
        pid: "N9K-C93180YC-FX3",
        description: "48x 25G + 6x 100G — DC Leaf",
        faceplate: {
          accessPorts: { count: 48, speed: "25G" },
          uplinkPorts: { count: 6, speed: "100G" },
          rackUnits: 1,
        },
      },
      {
        pid: "N9K-C9364C",
        description: "64x 100G — DC Super-Spine",
        faceplate: {
          accessPorts: { count: 64, speed: "100G" },
          rackUnits: 2,
        },
      },
      {
        pid: "N9K-C9364C-GX",
        description: "64x 100G — Cloud Scale GX",
        faceplate: {
          accessPorts: { count: 64, speed: "100G" },
          rackUnits: 2,
        },
      },
      {
        pid: "N9K-C93600CD-GX",
        description: "28x 100G + 8x 400G — Modern Spine",
        faceplate: {
          accessPorts: { count: 28, speed: "100G" },
          uplinkPorts: { count: 8, speed: "400G" },
          rackUnits: 1,
        },
      },
    ],
  },

  // ============================================================
  // DISTRIBUTION / AGGREGATION
  // ============================================================
  "Catalyst 9400": {
    type: "distribution",
    vendor: "Cisco",
    description: "Modular Chassis — Distribution / Aggregation",
    compatibleOptics: [
      "QSFP-40G-SR4",
      "SFP-10G-SR",
      "SFP-10G-LR",
      "GLC-SX-MMD",
    ],
    pids: [
      {
        pid: "C9404R",
        description: "4-Slot Chassis",
        faceplate: { modularSlots: 4, rackUnits: 5 },
      },
      {
        pid: "C9407R",
        description: "7-Slot Chassis",
        faceplate: { modularSlots: 7, rackUnits: 7 },
      },
      {
        pid: "C9410R",
        description: "10-Slot Chassis",
        faceplate: { modularSlots: 10, rackUnits: 10 },
      },
      {
        pid: "C9400-SUP-1XL",
        description: "Supervisor 1XL — 240Gbps/slot",
        faceplate: {
          accessPorts: { count: 8, speed: "10G" },
          uplinkPorts: { count: 2, speed: "40G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9400-SUP-1XL-Y",
        description: "Supervisor 1XL-Y — Enhanced",
        faceplate: {
          accessPorts: { count: 8, speed: "25G" },
          uplinkPorts: { count: 2, speed: "40G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9400-SUP-2",
        description: "Supervisor 2 — 480Gbps/slot",
        faceplate: {
          accessPorts: { count: 8, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 1,
        },
      },
    ],
  },

  // ============================================================
  // ACCESS LAYER
  // ============================================================
  "Catalyst 9300": {
    type: "access",
    vendor: "Cisco",
    description: "Stackable Access / Distribution",
    compatibleOptics: [
      "SFP-10G-SR",
      "SFP-10G-LR",
      "QSFP-40G-SR4",
      "GLC-SX-MMD",
      "GLC-LH-SMD",
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
      },
      {
        pid: "C9300-48P-E",
        description: "48x 1G PoE+ + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-48T-A",
        description: "48x 1G + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-48T-E",
        description: "48x 1G + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
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
      },
      {
        pid: "C9300-24P-E",
        description: "24x 1G PoE+ + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-24T-A",
        description: "24x 1G + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-48UXM-A",
        description: "48x mGig UPOE + 8x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-48UXM-E",
        description: "48x mGig UPOE + 8x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300-24UX-A",
        description: "24x mGig UPOE + 8x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Catalyst 9300X": {
    type: "access",
    vendor: "Cisco",
    description: "Next-Gen Stackable Access with 25G/100G Uplinks",
    compatibleOptics: [
      "SFP-25G-SR-S",
      "SFP-10G-SR",
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
    ],
    pids: [
      {
        pid: "C9300X-48HXN-A",
        description: "48x mGig + 8x 25G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300X-48HXN-E",
        description: "48x mGig + 8x 25G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300X-24HXN-A",
        description: "24x mGig + 8x 25G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "2.5G", poe: true },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300X-12Y-A",
        description: "12x 25G — Aggregation",
        faceplate: {
          accessPorts: { count: 12, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9300X-24Y-A",
        description: "24x 25G — Aggregation",
        faceplate: {
          accessPorts: { count: 24, speed: "25G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Catalyst 9200": {
    type: "access",
    vendor: "Cisco",
    description: "Cost-Effective Stackable Access",
    compatibleOptics: ["SFP-10G-SR", "GLC-SX-MMD", "GLC-LH-SMD"],
    pids: [
      {
        pid: "C9200-48P-A",
        description: "48x 1G PoE+ + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200-48P-E",
        description: "48x 1G PoE+ + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200-48T-A",
        description: "48x 1G + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200-24P-A",
        description: "24x 1G PoE+ + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200-24P-E",
        description: "24x 1G PoE+ + 4x 10G — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200-24T-A",
        description: "24x 1G + 4x 10G — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Catalyst 9200L": {
    type: "access",
    vendor: "Cisco",
    description: "Lite Branch Access Switches",
    compatibleOptics: ["SFP-10G-SR", "GLC-SX-MMD"],
    pids: [
      {
        pid: "C9200L-48P-4X-A",
        description: "48x 1G PoE+ + 4x 10G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-48P-4X-E",
        description: "48x 1G PoE+ + 4x 10G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-48P-4G-A",
        description: "48x 1G PoE+ + 4x 1G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-48P-4G-E",
        description: "48x 1G PoE+ + 4x 1G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-48T-4X-A",
        description: "48x 1G + 4x 10G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 48, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-48T-4G-E",
        description: "48x 1G + 4x 1G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 48, speed: "1G" },
          uplinkPorts: { count: 4, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-24P-4X-A",
        description: "24x 1G PoE+ + 4x 10G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-24P-4G-E",
        description: "24x 1G PoE+ + 4x 1G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-24T-4X-A",
        description: "24x 1G + 4x 10G uplinks — Network Advantage",
        faceplate: {
          accessPorts: { count: 24, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "C9200L-24T-4G-E",
        description: "24x 1G + 4x 1G uplinks — Network Essentials",
        faceplate: {
          accessPorts: { count: 24, speed: "1G" },
          uplinkPorts: { count: 4, speed: "1G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Meraki MS Series": {
    type: "access",
    vendor: "Cisco Meraki",
    description: "Cloud-Managed Access Switches",
    compatibleOptics: ["MA-SFP-10GB-SR", "MA-SFP-10GB-LR", "MA-SFP-1GB-SX"],
    pids: [
      {
        pid: "MS390-48P-HW",
        description: "48x 1G PoE+ + 4x 10G — Cloud Managed",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "MS390-24P-HW",
        description: "24x 1G PoE+ + 4x 10G — Cloud Managed",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "MS250-48FP-HW",
        description: "48x 1G Full PoE + 4x 10G",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "MS250-24P-HW",
        description: "24x 1G PoE+ + 4x 10G",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "MS125-48FP-HW",
        description: "48x 1G Full PoE + 4x 10G — Compact",
        faceplate: {
          accessPorts: { count: 48, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "MS125-24P-HW",
        description: "24x 1G PoE+ + 4x 10G — Compact",
        faceplate: {
          accessPorts: { count: 24, speed: "1G", poe: true },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
    ],
  },

  // ============================================================
  // SECURITY / FIREWALL
  // ============================================================
  "Secure Firewall 1000": {
    type: "security",
    vendor: "Cisco",
    description: "Branch / SOHO NGFW",
    compatibleOptics: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD", "SFP-1G-T"],
    pids: [
      {
        pid: "FPR1010-NGFW-K9",
        description: "2 Gbps — 8x 1G RJ45 — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR1010-ASA-K9",
        description: "2 Gbps — 8x 1G RJ45 — ASA Code",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR1120-NGFW-K9",
        description: "3 Gbps — 8x 1G + 4x 10G — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR1140-NGFW-K9",
        description: "8.5 Gbps — 8x 1G + 4x 10G — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR1140-ASA-K9",
        description: "8.5 Gbps — 8x 1G + 4x 10G — ASA Code",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 4, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR1150-NGFW-K9",
        description: "10 Gbps — 8x 1G + 8x 10G — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Secure Firewall 3100": {
    type: "security",
    vendor: "Cisco",
    description: "Mid-Sized Enterprise NGFW",
    compatibleOptics: ["SFP-25G-SR-S", "SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
    pids: [
      {
        pid: "FPR3110-NGFW-K9",
        description: "17 Gbps — 8x 1G + 8x 10G — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR3110-ASA-K9",
        description: "17 Gbps — 8x 1G + 8x 10G — ASA",
        faceplate: {
          accessPorts: { count: 8, speed: "1G" },
          uplinkPorts: { count: 8, speed: "10G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR3120-NGFW-K9",
        description: "27 Gbps — 8x 1G + 8x 10G + 8x 25G — FTD",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR3130-NGFW-K9",
        description: "37 Gbps — 8x 1G + 8x 10G + 8x 25G — FTD",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR3140-NGFW-K9",
        description: "45 Gbps — 8x 1G + 8x 10G + 8x 25G — FTD",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR3140-ASA-K9",
        description: "45 Gbps — 8x 1G + 8x 10G + 8x 25G — ASA",
        faceplate: {
          accessPorts: { count: 16, speed: "10G" },
          uplinkPorts: { count: 8, speed: "25G" },
          rackUnits: 1,
        },
      },
    ],
  },

  "Secure Firewall 4100": {
    type: "security",
    vendor: "Cisco",
    description: "Enterprise / DC Edge NGFW",
    compatibleOptics: [
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
      "SFP-10G-LR",
    ],
    pids: [
      {
        pid: "FPR4112-NGFW-K9",
        description: "20 Gbps — Modular — FTD",
        faceplate: {
          accessPorts: { count: 8, speed: "10G" },
          uplinkPorts: { count: 4, speed: "40G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR4115-NGFW-K9",
        description: "55 Gbps — 8x 10G + 8x 25G + 4x 40G — FTD",
        faceplate: {
          accessPorts: { count: 16, speed: "25G" },
          uplinkPorts: { count: 4, speed: "40G" },
          rackUnits: 1,
        },
      },
      {
        pid: "FPR4125-NGFW-K9",
        description: "65 Gbps — Modular + 100G — FTD",
        faceplate: {
          accessPorts: { count: 16, speed: "25G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 2,
        },
      },
      {
        pid: "FPR4145-NGFW-K9",
        description: "80 Gbps — 16x 10G + 8x 40G + 4x 100G — FTD",
        faceplate: {
          accessPorts: { count: 24, speed: "10G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 2,
        },
      },
      {
        pid: "FPR4145-ASA-K9",
        description: "80 Gbps — 16x 10G + 8x 40G + 4x 100G — ASA",
        faceplate: {
          accessPorts: { count: 24, speed: "10G" },
          uplinkPorts: { count: 4, speed: "100G" },
          rackUnits: 2,
        },
      },
    ],
  },
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
};

// ============================================================
// HELPER: Look up faceplate config for a given device
// ============================================================
export function getFaceplate(model: string, pid: string): FaceplateConfig | null {
  const series = HARDWARE_LIBRARY[model];
  if (!series) return null;
  const product = series.pids.find((p) => p.pid === pid);
  return product?.faceplate ?? null;
}