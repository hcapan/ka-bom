// Shared edge styling system. Single source of truth for both CustomEdge & BundledEdge.

export type EdgeSpeed =
  | "1G"
  | "2.5G"
  | "10G"
  | "25G"
  | "40G"
  | "50G"
  | "100G"
  | "400G";

export interface EdgeSpeedTheme {
  color: string;
  strokeWidth: number;
  label: string;
  /** Bandwidth in Gbps for bundled-edge calculations */
  gbps: number;
}

export const EDGE_SPEED_THEMES: Record<EdgeSpeed, EdgeSpeedTheme> = {
  "1G":   { color: "#64748b", strokeWidth: 1.5, label: "1G",   gbps: 1   }, // slate
  "2.5G": { color: "#475569", strokeWidth: 1.5, label: "2.5G", gbps: 2.5 }, // slate-darker
  "10G":  { color: "#0ea5e9", strokeWidth: 2,   label: "10G",  gbps: 10  }, // sky (Cisco-blue)
  "25G":  { color: "#8b5cf6", strokeWidth: 2.25,label: "25G",  gbps: 25  }, // violet
  "40G":  { color: "#f59e0b", strokeWidth: 2.5, label: "40G",  gbps: 40  }, // amber
  "50G":  { color: "#f97316", strokeWidth: 2.5, label: "50G",  gbps: 50  }, // orange
  "100G": { color: "#ef4444", strokeWidth: 3,   label: "100G", gbps: 100 }, // red
  "400G": { color: "#10b981", strokeWidth: 3.5, label: "400G", gbps: 400 }, // emerald
};

/** Resolve a theme from a speed string. Falls back to 1G. */
export function getEdgeTheme(speed?: string): EdgeSpeedTheme {
  if (speed && speed in EDGE_SPEED_THEMES) {
    return EDGE_SPEED_THEMES[speed as EdgeSpeed];
  }
  return EDGE_SPEED_THEMES["1G"];
}

/** Resolve theme from total bandwidth (used by BundledEdge). */
export function getThemeForBandwidth(gbps: number): EdgeSpeedTheme {
  if (gbps >= 400) return EDGE_SPEED_THEMES["400G"];
  if (gbps >= 100) return EDGE_SPEED_THEMES["100G"];
  if (gbps >= 50)  return EDGE_SPEED_THEMES["50G"];
  if (gbps >= 40)  return EDGE_SPEED_THEMES["40G"];
  if (gbps >= 25)  return EDGE_SPEED_THEMES["25G"];
  if (gbps >= 10)  return EDGE_SPEED_THEMES["10G"];
  if (gbps >= 2.5) return EDGE_SPEED_THEMES["2.5G"];
  return EDGE_SPEED_THEMES["1G"];
}