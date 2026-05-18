"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "./chassisStyles";

type Props = {
  hostname: string;
  pid: string;
  vendor?: string;
  description?: string;
  totalSlots: number;
  occupiedSlots: number;
};

export function ChassisHeader({
  hostname,
  pid,
  vendor = "Cisco",
  description,
  totalSlots,
  occupiedSlots,
}: Props) {
  return (
    <div
      style={{
        position: "relative",
        height: MODULAR_SIZES.HEADER_HEIGHT,
        background: MODULAR_TOKENS.bodyBg,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `0 ${MODULAR_SIZES.PADDING}px`,
        overflow: "hidden",
      }}
      title={description}
    >
      {/* Brand strip (matches faceplate) */}
      <div
        style={{
          position: "absolute",
          left: MODULAR_SIZES.PADDING / 2,
          top: 2,
          bottom: 2,
          width: MODULAR_SIZES.BRAND_STRIP_WIDTH,
          background: MODULAR_TOKENS.brandBg,
          borderRadius: 1,
        }}
      />

      {/* Vendor + PID block (mirrors faceplate label area) */}
      <div
        style={{
          marginLeft: MODULAR_SIZES.BRAND_STRIP_WIDTH + 6,
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: MODULAR_TOKENS.textPrimary,
            lineHeight: 1.1,
          }}
        >
          {vendor.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: MODULAR_TOKENS.textSecondary,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pid} · {hostname}
        </div>
      </div>

      {/* Slot summary badge */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: MODULAR_TOKENS.textSecondary,
          textAlign: "right",
          padding: "2px 6px",
          border: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
          borderRadius: 2,
          background: "#dde1e5",
        }}
      >
        {occupiedSlots}/{totalSlots} slots
      </div>
    </div>
  );
}