export type DeviceType = "core" | "distribution" | "access" | "security";

export interface HardwareModel {
  type: DeviceType;
  skus: readonly string[];
}

export const HARDWARE_LIBRARY: Record<string, HardwareModel> = {
  "Cisco Catalyst 9500": {
    type: "core",
    skus: ["C9500-24Y4C", "C9500-48Y4C", "C9500X-28C8D"],
  },
  "Cisco Catalyst 9300": {
    type: "access",
    skus: ["C9300-24T", "C9300-48P", "C9300-48UXM"],
  },
  "FortiGate Next-Gen": {
    type: "security",
    skus: ["FG-40F", "FG-60F", "FG-100F"],
  },
};

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