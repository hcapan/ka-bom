// lib/hardware/data/switching/networkModules.ts
import type { PortSpeed } from "../../types";

export interface NetworkModuleSpec {
  pid: string;
  description: string;
  portCount: number;
  portSpeed: PortSpeed;
  compatibleSeries: string[]; // ["C9300"] or ["C9300X"]
}

export const NETWORK_MODULE_CATALOG: Record<string, NetworkModuleSpec> = {
  // ─── Catalyst 9300 modules ─────────────────────────────────
  "C9300-NM-4G": {
    pid: "C9300-NM-4G",
    description: "4 x 1G SFP",
    portCount: 4,
    portSpeed: "1G",
    compatibleSeries: ["C9300"],
  },
  "C9300-NM-4M": {
    pid: "C9300-NM-4M",
    description: "4 x Multigigabit (100M/1G/2.5G/5G/10G)",
    portCount: 4,
    portSpeed: "10G",
    compatibleSeries: ["C9300"],
  },
  "C9300-NM-8X": {
    pid: "C9300-NM-8X",
    description: "8 x 10G SFP+",
    portCount: 8,
    portSpeed: "10G",
    compatibleSeries: ["C9300"],
  },
  "C9300-NM-2Q": {
    pid: "C9300-NM-2Q",
    description: "2 x 40G QSFP+",
    portCount: 2,
    portSpeed: "40G",
    compatibleSeries: ["C9300"],
  },
  "C9300-NM-2Y": {
    pid: "C9300-NM-2Y",
    description: "2 x 25G SFP28",
    portCount: 2,
    portSpeed: "25G",
    compatibleSeries: ["C9300"],
  },

  // ─── Catalyst 9300X modules ────────────────────────────────
  "C9300X-NM-2C": {
    pid: "C9300X-NM-2C",
    description: "2 x 40G/100G QSFP28",
    portCount: 2,
    portSpeed: "100G",
    compatibleSeries: ["C9300X"],
  },
  "C9300X-NM-4C": {
    pid: "C9300X-NM-4C",
    description: "4 x 40G/100G QSFP28",
    portCount: 4,
    portSpeed: "100G",
    compatibleSeries: ["C9300X"],
  },
  "C9300X-NM-8M": {
    pid: "C9300X-NM-8M",
    description: "8 x Multigigabit",
    portCount: 8,
    portSpeed: "10G",
    compatibleSeries: ["C9300X"],
  },
  "C9300X-NM-8Y": {
    pid: "C9300X-NM-8Y",
    description: "8 x 25G/10G/1G SFP28",
    portCount: 8,
    portSpeed: "25G",
    compatibleSeries: ["C9300X"],
  },

  // ─── Catalyst 9300 modules ─────────────────────────────────
  "C9200-NM-2Y": {
    pid: "C9200-NM-2Y",
    description: "2 x 25G network module",
    portCount: 2,
    portSpeed: "25G",
    compatibleSeries: ["C9200"],
  },
  "C9200-NM-2Q": {
    pid: "C9200-NM-2Q",
    description: "2 x 40G network module",
    portCount: 2,
    portSpeed: "40G",
    compatibleSeries: ["C9200"],
  },
  "C9200-NM-4G": {
    pid: "C9200-NM-4G",
    description: "4 x 1G network module",
    portCount: 4,
    portSpeed: "1G",
    compatibleSeries: ["C9200"],
  },
  "C9200-NM-4X": {
    pid: "C9200-NM-4X",
    description: "4x 1G/10G network module",
    portCount: 4,
    portSpeed: "10G",
    compatibleSeries: ["C9200"],
  },
  "C9200-NM-BLANK": {
    pid: "C9200-NM-BLANK",
    description: "No network module",
    portCount: 0,
    portSpeed: "10G",
    compatibleSeries: ["C9200"],
  },
};




// ─── Helpers ──────────────────────────────────────────────────
export function getNetworkModuleSpec(
  pid: string | undefined
): NetworkModuleSpec | undefined {
  if (!pid) return undefined;
  return NETWORK_MODULE_CATALOG[pid];
}

export function getCompatibleModules(series: string): NetworkModuleSpec[] {
  return Object.values(NETWORK_MODULE_CATALOG).filter((m) =>
    m.compatibleSeries.includes(series)
  );
}

export function supportsModularUplinks(
  series: string,
  chassisPid: string
): boolean {
  // 9300L has FIXED uplinks
  if (chassisPid.startsWith("C9300L")) return false;
  // 9300 and 9300X support one modular uplink slot
  return series === "C9300" || series === "C9300X";
}