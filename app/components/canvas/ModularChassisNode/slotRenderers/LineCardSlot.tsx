"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "../chassisStyles";
import type { ModuleCatalogEntry } from "@/app/lib/hardware/chassisHelpers";
import { PORT_SPEED_COLORS } from "../../chassisStyles"; // ⭐ adjust path to your faceplate styles
import type { PortSpeed } from "@/app/lib/hardware/types";

type Props = {
  slotId: string;
  module: ModuleCatalogEntry;
  onClick: () => void;
};

export function LinecardSlot({ slotId, module, onClick }: Props) {
  const portCount = module.modulePorts?.count ?? 0;
  const portSpeed = (module.modulePorts?.speed ?? "1G") as PortSpeed;
  const poe = module.modulePorts?.poe;
  const accentColor = PORT_SPEED_COLORS[portSpeed] ?? MODULAR_TOKENS.linecardAccent;

  // Show all ports inline, but cap visible at a sensible amount for narrow rows
  const MAX_VISIBLE = 24;
  const visiblePorts = Math.min(portCount, MAX_VISIBLE);
  const overflow = portCount - visiblePorts;

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
        padding: `0 ${MODULAR_SIZES.PADDING}px`,
        background: MODULAR_TOKENS.moduleBg,
        border: "none",
        borderTop: `1px solid ${MODULAR_TOKENS.bodyHighlight}`,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: MODULAR_TOKENS.linecardAccent,
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
          flex: "0 0 30px",
          fontFamily: "system-ui, sans-serif",
          fontSize: 9,
          fontWeight: 800,
          color: MODULAR_TOKENS.linecardAccent,
          letterSpacing: 1,
        }}
      >
        LC
      </div>

      {/* PID + port grid */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 3,
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

        {/* Port cavity row */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {Array.from({ length: visiblePorts }).map((_, i) => (
            <PortCavity key={i} color={accentColor} hasPoe={Boolean(poe)} />
          ))}
          {overflow > 0 && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 700,
                color: MODULAR_TOKENS.textMuted,
                marginLeft: 4,
              }}
            >
              +{overflow}
            </span>
          )}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 700,
              color: MODULAR_TOKENS.textSecondary,
              marginLeft: 6,
            }}
          >
            {portCount}× {portSpeed}
            {poe && ` ${poe}`}
          </span>
        </div>
      </div>

      {/* Status LED */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: MODULAR_TOKENS.ledActive,
          boxShadow: `0 0 3px ${MODULAR_TOKENS.ledActive}`,
        }}
      />
    </button>
  );
}

function PortCavity({ color, hasPoe }: { color: string; hasPoe: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 7,
        height: 8,
        background: MODULAR_TOKENS.portCavityFill,
        border: `0.5px solid ${MODULAR_TOKENS.portCavityStroke}`,
        borderRadius: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0.5px",
          background: MODULAR_TOKENS.portInner,
          borderRadius: 0.5,
        }}
      />
      {/* Speed LED hint along top edge */}
      <div
        style={{
          position: "absolute",
          top: 0.5,
          left: 1,
          right: 1,
          height: 1,
          background: color,
          opacity: 0.7,
        }}
      />
      {hasPoe && (
        <div
          style={{
            position: "absolute",
            top: 0.5,
            right: 0.5,
            width: 1.5,
            height: 1.5,
            borderRadius: "50%",
            background: MODULAR_TOKENS.ledActive,
          }}
        />
      )}
    </div>
  );
}