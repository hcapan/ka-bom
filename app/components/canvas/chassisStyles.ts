// app/components/canvas/chassisStyles.ts
// ============================================================
// CHASSIS STYLES — shared visual tokens for faceplates
// ============================================================

// ⭐ Import from types instead of catalog (catalog no longer re-exports it)
import type { PortSpeed } from "../../lib/hardware/types";

/** Color tokens — dark Cisco-style palette */
export const CHASSIS_COLORS = {
  // Body
  bodyBg: "#1e293b",
  bodyEdgeTop: "#334155",
  bodyEdgeBottom: "#0a0f1c",
  bodyBorder: "#0f172a",

  // Brand strip
  brandBg: "#005EB8",
  brandText: "#ffffff",

  // Slots / sections
  slotBg: "#0a0f1c",
  slotDivider: "#475569",
  slotHighlight: "#3b4a5e",

  // Empty states
  emptyBg: "#0f1419",
  emptyHatching: "rgba(255,255,255,0.04)",
  emptyText: "#475569",

  // Text
  textPrimary: "#cbd5e1",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",

  // Special slot indicators
  supervisorBadge: "#fbbf24",
  redundantBadge: "#a78bfa",
  fanBadge: "#06b6d4",
  psuBadge: "#22c55e",

  // PoE indicator
  poeIndicator: "#eab308",
} as const;

/** Port speed → port stroke color */
export const PORT_SPEED_COLORS: Record<PortSpeed, string> = {
  "1G": "#94a3b8",
  "2.5G": "#22c55e",
  "10G": "#0ea5e9",
  "25G": "#06b6d4",
  "40G": "#7c3aed",
  "50G": "#8b5cf6",
  "100G": "#9333ea",
  "400G": "#ec4899",
};

/** Slot kind → accent color (for modular chassis) */
export const SLOT_KIND_COLORS = {
  supervisor: CHASSIS_COLORS.supervisorBadge,
  linecard: PORT_SPEED_COLORS["10G"],
  "fabric-module": CHASSIS_COLORS.redundantBadge,
  psu: CHASSIS_COLORS.psuBadge,
  fan: CHASSIS_COLORS.fanBadge,
  ssd: "#f59e0b",
  blank: CHASSIS_COLORS.emptyText,
} as const;

/** Standard sizes */
export const CHASSIS_SIZES = {
  PORT_W: 5,
  PORT_H: 4,
  PORT_GAP: 1,
  ROW_GAP: 1.5,
  PADDING: 7,
  BRAND_W: 38,
  RU_HEIGHT: 20,

  // Slot row sizes (for modular chassis)
  SLOT_ROW_HEIGHT: 24,
  SLOT_LABEL_W: 24,
} as const;