// app/components/canvas/nodes/ModularChassisNode/chassisStyles.ts

// ─────────────────────────────────────────────────────────────
// Inner faceplate tokens (your existing — kept as-is)
// ─────────────────────────────────────────────────────────────
export const MODULAR_TOKENS = {
  bodyBg: "#c7ccd2",
  bodyBorder: "#8e959c",
  bodyHighlight: "#f4f6f8",
  bodyShadow: "#9aa3ab",

  brandBg: "#0ea5e9",

  slotPanelBg: "#dde1e5",
  slotDivider: "#9aa3ab",
  slotEmptyBg: "#b8bec5",
  slotRequiredBorder: "#f59e0b",

  moduleBg: "#c7ccd2",
  moduleInsetBg: "#9aa3ab",

  supervisorAccent: "#10b981",
  linecardAccent: "#0ea5e9",
  serviceAccent: "#a855f7",
  fabricAccent: "#f97316",

  portCavityFill: "#9aa3ab",
  portCavityStroke: "#6b7280",
  portInner: "#2f3640",

  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",

  ledActive: "#22c55e",
  ledStandby: "#fbbf24",
  ledFault: "#ef4444",
} as const;

export const MODULAR_SIZES = {
  CHASSIS_WIDTH: 300,
  SLOT_HEIGHT: 44,
  SLOT_GAP: 0.5,
  PADDING:4,
  BRAND_STRIP_WIDTH: 3,
  HEADER_HEIGHT: 38,
} as const;

export const SLOT_HEIGHT = 44;
export const CHASSIS_WIDTH = 360;

// ─────────────────────────────────────────────────────────────
// Outer card tokens (DeviceNode parity)
// ─────────────────────────────────────────────────────────────
export const CHASSIS_CARD_TOKENS = {
  cardBg:
    "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
  cardBorder: "rgba(14,165,233,0.22)",
  cardBorderSelected: "#0ea5e9",
  cardShadow: "0 12px 32px -10px rgba(15,23,42,0.18)",
  cardShadowSelected: "0 20px 45px rgba(14,165,233,0.20)",

  innerBayBg: "#eef2f7",
  innerBayBorder: "rgba(203,213,225,0.6)",
  innerBayPattern: "rgba(14,165,233,0.04)",

  rolePalettes: {
    access: { accent: "#10b981", glow: "rgba(16,185,129,0.45)", label: "ACCESS" },
    distribution: { accent: "#0ea5e9", glow: "rgba(14,165,233,0.45)", label: "DISTRIBUTION" },
    core: { accent: "#8b5cf6", glow: "rgba(139,92,246,0.45)", label: "CORE" },
    edge: { accent: "#f59e0b", glow: "rgba(245,158,11,0.45)", label: "EDGE" },
    wan: { accent: "#ec4899", glow: "rgba(236,72,153,0.45)", label: "WAN" },
  },
} as const;

export type ChassisRole = keyof typeof CHASSIS_CARD_TOKENS.rolePalettes;

export function getChassisRolePalette(role?: string) {
  const key = (role?.toLowerCase() as ChassisRole) ?? "core";
  return (
    CHASSIS_CARD_TOKENS.rolePalettes[key] ??
    CHASSIS_CARD_TOKENS.rolePalettes.core
  );
}