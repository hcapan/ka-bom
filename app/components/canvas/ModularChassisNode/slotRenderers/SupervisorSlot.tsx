"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "../chassisStyles";
import type { ModuleCatalogEntry } from "@/app/lib/hardware/chassisHelpers";

type Props = {
  slotId: string;
  module: ModuleCatalogEntry;
  onClick: () => void;
};

export function SupervisorSlot({ slotId, module, onClick }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={module.description}
      style={{
        position: "relative",
        height: MODULAR_SIZES.SLOT_HEIGHT,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 3,
        padding: `0 ${MODULAR_SIZES.PADDING}px`,
        background: MODULAR_TOKENS.moduleBg,
        border: "none",
        borderTop: `1px solid ${MODULAR_TOKENS.bodyHighlight}`,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* Left accent bar (kind indicator) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 3,
          width: 3,
          background: MODULAR_TOKENS.supervisorAccent,
        }}
      />

      {/* Slot number tag */}
      <div
        style={{
          flex: "0 0 32px",
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 800,
          color: MODULAR_TOKENS.textPrimary,
          textAlign: "center",
          padding: "2px 0",
          background: "#dde1e5",
          border: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
          borderRadius: 2,
          letterSpacing: 0.5,
        }}
      >
        {String(slotId).padStart(2, "0")}
      </div>

      {/* Kind label */}
      <div
        style={{
          flex: "0 0 50px",
          fontFamily: "system-ui, sans-serif",
          fontSize: 9,
          fontWeight: 800,
          color: MODULAR_TOKENS.supervisorAccent,
          letterSpacing: 1,
        }}
      >
        SUP
      </div>

      {/* PID + management ports area (mimics faceplate label region) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            color: MODULAR_TOKENS.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: 0.3,
          }}
        >
          {module.pid}
        </div>

        {/* Mini management port row */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <PortCavity color={MODULAR_TOKENS.linecardAccent} />
          <PortCavity color={MODULAR_TOKENS.textMuted} />
          <PortCavity color={MODULAR_TOKENS.textMuted} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: MODULAR_TOKENS.textMuted,
              marginLeft: 4,
            }}
          >
            mgmt · console · usb
          </span>
        </div>
      </div>

      {/* Status LEDs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Led color={MODULAR_TOKENS.ledActive} label="STS" />
        <Led color={MODULAR_TOKENS.ledStandby} label="HA" />
      </div>
    </button>
  );
}

function PortCavity({ color }: { color: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: 10,
        height: 6,
        background: MODULAR_TOKENS.portCavityFill,
        border: `0.5px solid ${MODULAR_TOKENS.portCavityStroke}`,
        borderRadius: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0.5px 0.5px 0.5px 0.5px",
          background: MODULAR_TOKENS.portInner,
          borderRadius: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0.5,
          left: 1,
          right: 1,
          height: 1,
          background: color,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

function Led({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 3px ${color}`,
        }}
      />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 6,
          color: MODULAR_TOKENS.textMuted,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </div>
  );
}