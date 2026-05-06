export type DeviceType = "core" | "distribution" | "access" | "security";

export interface HardwareModel {
  type: DeviceType;
  category: string; // e.g., "Catalyst 9500", "Nexus 9000"
  description: string;
  ports: string; // human-readable port summary
  skus: string[]; // available transceiver/module SKUs for uplinks
}

export const HARDWARE_LIBRARY: Record<string, HardwareModel> = {
  // ============================================================
  // CORE / DATA CENTER SPINE
  // ============================================================
  "Catalyst 9500-48Y4C": {
    type: "core",
    category: "Catalyst 9500",
    description: "48x 25G SFP28 + 4x 100G QSFP28 — Campus Core",
    ports: "48x 25G + 4x 100G",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
  },
  "Catalyst 9500-24Y4C": {
    type: "core",
    category: "Catalyst 9500",
    description: "24x 25G SFP28 + 4x 100G QSFP28 — Campus Core",
    ports: "24x 25G + 4x 100G",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
  },
  "Catalyst 9500-32C": {
    type: "core",
    category: "Catalyst 9500",
    description: "32x 100G QSFP28 — High-Density Core",
    ports: "32x 100G",
    skus: ["QSFP-100G-SR4", "QSFP-100G-LR4", "QSFP-40G-SR4"],
  },
  "Catalyst 9500-40X": {
    type: "core",
    category: "Catalyst 9500",
    description: "40x 10G SFP+ — Mid-Density Core",
    ports: "40x 10G",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "QSFP-40G-SR4"],
  },
  "Nexus 9336C-FX2": {
    type: "core",
    category: "Nexus 9000",
    description: "36x 100G QSFP28 — Data Center Spine",
    ports: "36x 100G",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "QSFP-100G-AOC3M",
      "QSFP-40G-SR4",
    ],
  },
  "Nexus 93180YC-FX3": {
    type: "core",
    category: "Nexus 9000",
    description: "48x 25G SFP28 + 6x 100G QSFP28 — Data Center Leaf",
    ports: "48x 25G + 6x 100G",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
  },
  "Nexus 9364C": {
    type: "core",
    category: "Nexus 9000",
    description: "64x 100G QSFP28 — DC Spine / Super-Spine",
    ports: "64x 100G",
    skus: ["QSFP-100G-SR4", "QSFP-100G-LR4", "QSFP-100G-AOC3M"],
  },

  // ============================================================
  // DISTRIBUTION / AGGREGATION
  // ============================================================
  "Catalyst 9400-Sup-1XL": {
    type: "distribution",
    category: "Catalyst 9400",
    description: "Modular Chassis Supervisor — 240Gbps per slot",
    ports: "Modular (up to 384 ports)",
    skus: ["QSFP-40G-SR4", "SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
  },
  "Catalyst 9400-Sup-2": {
    type: "distribution",
    category: "Catalyst 9400",
    description: "High-Performance Modular Supervisor — 480Gbps per slot",
    ports: "Modular (up to 384 ports)",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
  },
  "Catalyst 9300-48UXM": {
    type: "distribution",
    category: "Catalyst 9300",
    description: "36x 2.5G + 12x 5G UPOE — Distribution / Aggregation",
    ports: "48x mGig UPOE + 8x 10G uplinks",
    skus: ["QSFP-40G-SR4", "SFP-10G-SR", "SFP-10G-LR"],
  },
  "Catalyst 9300-24UX": {
    type: "distribution",
    category: "Catalyst 9300",
    description: "24x mGig UPOE — Distribution",
    ports: "24x mGig + 8x 10G uplinks",
    skus: ["QSFP-40G-SR4", "SFP-10G-SR", "SFP-10G-LR"],
  },
  "Catalyst 9300X-48HXN": {
    type: "distribution",
    category: "Catalyst 9300X",
    description: "48x mGig + 8x 25G uplinks — Modern Aggregation",
    ports: "48x mGig + 8x 25G",
    skus: ["SFP-25G-SR-S", "SFP-10G-SR", "QSFP-40G-SR4"],
  },

  // ============================================================
  // ACCESS LAYER
  // ============================================================
  "Catalyst 9300-48P": {
    type: "access",
    category: "Catalyst 9300",
    description: "48x 1G PoE+ + 4x 10G uplinks — Standard Access",
    ports: "48x 1G PoE+ + 4x 10G",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD", "GLC-LH-SMD"],
  },
  "Catalyst 9300-24P": {
    type: "access",
    category: "Catalyst 9300",
    description: "24x 1G PoE+ + 4x 10G uplinks — Small Branch Access",
    ports: "24x 1G PoE+ + 4x 10G",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
  },
  "Catalyst 9300-48T": {
    type: "access",
    category: "Catalyst 9300",
    description: "48x 1G + 4x 10G — Data-Only Access",
    ports: "48x 1G + 4x 10G",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
  },
  "Catalyst 9200-48P": {
    type: "access",
    category: "Catalyst 9200",
    description: "48x 1G PoE+ + 4x 10G — Cost-Effective Access",
    ports: "48x 1G PoE+ + 4x 10G",
    skus: ["SFP-10G-SR", "GLC-SX-MMD", "GLC-LH-SMD"],
  },
  "Catalyst 9200-24P": {
    type: "access",
    category: "Catalyst 9200",
    description: "24x 1G PoE+ + 4x 10G — Small Branch",
    ports: "24x 1G PoE+ + 4x 10G",
    skus: ["SFP-10G-SR", "GLC-SX-MMD"],
  },
  "Catalyst 9200L-24T": {
    type: "access",
    category: "Catalyst 9200L",
    description: "24x 1G + 4x 10G — Lite Access (No PoE)",
    ports: "24x 1G + 4x 10G",
    skus: ["SFP-10G-SR", "GLC-SX-MMD"],
  },
  "Catalyst 9200L-48T": {
    type: "access",
    category: "Catalyst 9200L",
    description: "48x 1G + 4x 10G — Lite Access (No PoE)",
    ports: "48x 1G + 4x 10G",
    skus: ["SFP-10G-SR", "GLC-SX-MMD"],
  },
  "Meraki MS390-48P": {
    type: "access",
    category: "Meraki",
    description: "48x 1G PoE+ + 4x 10G — Cloud-Managed Access",
    ports: "48x 1G PoE+ + 4x 10G",
    skus: ["MA-SFP-10GB-SR", "MA-SFP-10GB-LR", "MA-SFP-1GB-SX"],
  },
  "Meraki MS250-48FP": {
    type: "access",
    category: "Meraki",
    description: "48x 1G Full PoE + 4x 10G — Cloud-Managed Access",
    ports: "48x 1G PoE+ + 4x 10G",
    skus: ["MA-SFP-10GB-SR", "MA-SFP-10GB-LR"],
  },

  // ============================================================
  // SECURITY / FIREWALL (Cisco Secure Firewall)
  // ============================================================
  "Secure Firewall 1010": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "2 Gbps NGFW — Small Branch / SOHO",
    ports: "8x 1G RJ45",
    skus: ["SFP-1G-T", "GLC-SX-MMD"],
  },
  "Secure Firewall 1140": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "8.5 Gbps NGFW — Branch Office",
    ports: "8x 1G + 4x 10G SFP+",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
  },
  "Secure Firewall 3110": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "17 Gbps NGFW — Mid-Sized Enterprise",
    ports: "8x 1G + 8x 10G SFP+",
    skus: ["SFP-10G-SR", "SFP-10G-LR", "GLC-SX-MMD"],
  },
  "Secure Firewall 3140": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "45 Gbps NGFW — Enterprise Edge",
    ports: "8x 1G + 8x 10G + 8x 25G SFP28",
    skus: ["SFP-25G-SR-S", "SFP-10G-SR", "SFP-10G-LR"],
  },
  "Secure Firewall 4115": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "55 Gbps NGFW — Data Center Perimeter",
    ports: "8x 10G + 8x 25G + 4x 40G QSFP+",
    skus: [
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
      "SFP-10G-LR",
    ],
  },
  "Secure Firewall 4145": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "80 Gbps NGFW — Large DC / Campus Core",
    ports: "16x 10G + 8x 40G QSFP+ + 4x 100G QSFP28",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
      "SFP-10G-SR",
    ],
  },
  "Secure Firewall 9300": {
    type: "security",
    category: "Cisco Secure Firewall",
    description: "240 Gbps NGFW — Service Provider / Large DC",
    ports: "Modular: up to 32x 100G QSFP28",
    skus: [
      "QSFP-100G-SR4",
      "QSFP-100G-LR4",
      "QSFP-40G-SR4",
      "SFP-25G-SR-S",
    ],
  },
};

// ============================================================
// LAYER VISUAL CONFIG (for React Flow canvas)
// ============================================================

export const LAYER_CONFIG: Record<
  DeviceType,
  { label: string; color: string; bg: string; y: number }
> = {
  security: {
    label: "SECURITY PERIMETER",
    color: "#ef4444",
    bg: "rgba(254, 242, 242, 0.6)",
    y: 0,
  },
  core: {
    label: "NETWORK CORE",
    color: "#8b5cf6",
    bg: "rgba(245, 243, 255, 0.6)",
    y: 250,
  },
  distribution: {
    label: "DISTRIBUTION",
    color: "#0ea5e9",
    bg: "rgba(240, 249, 255, 0.6)",
    y: 500,
  },
  access: {
    label: "ACCESS LAYER",
    color: "#3b82f6",
    bg: "rgba(239, 246, 255, 0.6)",
    y: 750,
  },
};