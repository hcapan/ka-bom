// Visual tokens for the modular chassis (matches SwitchFaceplate aesthetic)
export const MODULAR_TOKENS = {
  // Chassis frame (matches faceplate metal body)
  bodyBg: "#c7ccd2",            // metal panel
  bodyBorder: "#8e959c",        // panel edge
  bodyHighlight: "#f4f6f8",     // top highlight (metal edge)
  bodyShadow: "#9aa3ab",        // bottom shadow

  // Brand accent
  brandBg: "#0ea5e9",           // cyan brand strip (same as faceplate)

  // Panel/slot interior
  slotPanelBg: "#dde1e5",       // lighter recess between slots
  slotDivider: "#9aa3ab",       // groove between slots
  slotEmptyBg: "#b8bec5",       // dimmed empty slot
  slotRequiredBorder: "#f59e0b", // amber for required-but-empty

  // Module surface (when populated)
  moduleBg: "#c7ccd2",          // matches chassis body
  moduleInsetBg: "#9aa3ab",     // port cavity tone

  // Module type accents (left edge tag)
  supervisorAccent: "#10b981",
  linecardAccent: "#0ea5e9",
  serviceAccent: "#a855f7",
  fabricAccent: "#f97316",      // for Nexus 9500 fabric modules

  // Port colors (reused from faceplate scheme via PORT_SPEED_COLORS)
  portCavityFill: "#9aa3ab",
  portCavityStroke: "#6b7280",
  portInner: "#2f3640",

  // Text
  textPrimary: "#1f2937",       // dark — readable on metal
  textSecondary: "#4b5563",
  textMuted: "#6b7280",

  // Status LEDs
  ledActive: "#22c55e",
  ledStandby: "#fbbf24",
  ledFault: "#ef4444",
} as const;

export const MODULAR_SIZES = {
  CHASSIS_WIDTH: 380,
  SLOT_HEIGHT: 56,         // taller for richer detail
  SLOT_GAP: 2,
  PADDING: 8,
  BRAND_STRIP_WIDTH: 3,
  HEADER_HEIGHT: 38,
} as const;

export const SLOT_HEIGHT = 44;
export const CHASSIS_WIDTH = 360;