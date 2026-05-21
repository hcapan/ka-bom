"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "../chassisStyles";
import type { ModuleCatalogEntry } from "@/app/lib/hardware/chassisHelpers";
import { PORT_SPEED_COLORS } from "../../chassisStyles";
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
        gap: 12,
        padding: `0 ${MODULAR_SIZES.PADDING}px 0 ${MODULAR_SIZES.PADDING + 4}px`,
        background: `linear-gradient(180deg, ${MODULAR_TOKENS.moduleBg} 0%, ${MODULAR_TOKENS.moduleBg} 55%, rgba(0,0,0,0.04) 100%)`,
        border: "none",
        borderRadius: 3,
        borderTop: `1px solid ${MODULAR_TOKENS.bodyHighlight}`,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.15)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "background 120ms ease",
      }}
    >
      {/* Left accent bar with subtle glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 3,
          width: 3,
          background: `linear-gradient(180deg, ${accentColor} 0%, ${MODULAR_TOKENS.linecardAccent} 100%)`,
          boxShadow: `0 0 6px ${accentColor}66`,
        }}
      />

      {/* Slot number tag */}
      <div
        style={{
          flex: "0 0 30px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: MODULAR_TOKENS.textPrimary,
          textAlign: "center",
          padding: "3px 0",
          background: "linear-gradient(180deg, #e4e8ec 0%, #d2d6da 100%)",
          border: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
          borderRadius: 3,
          letterSpacing: 0.4,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.08)",
        }}
      >
        {String(slotId).padStart(2, "0")}
      </div>

      {/* Kind label */}
      <div
        style={{
          flex: "0 0 22px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 9,
          fontWeight: 700,
          color: MODULAR_TOKENS.linecardAccent,
          letterSpacing: 1,
          textShadow: `0 0 4px ${MODULAR_TOKENS.linecardAccent}33`,
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
        }}
      >
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: MODULAR_TOKENS.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: 0.2,
          }}
        >
          {module.pid}
        </div>

        {/* Port cavity row */}
        <div style={{ display: "flex", alignItems: "center", gap: 1  }}>
          {Array.from({ length: visiblePorts }).map((_, i) => (
            <PortCavity key={i} color={accentColor} hasPoe={Boolean(poe)} />
          ))}
          {overflow > 0 && (
            <span
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 8,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: MODULAR_TOKENS.textMuted,
                marginLeft: 5,
                letterSpacing: 0.2,
              }}
            >
              +{overflow}
            </span>
          )}
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 8,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: MODULAR_TOKENS.textSecondary,
              marginLeft: 8,
              letterSpacing: 0.3,
              opacity: 0.85,
            }}
          >
            {portCount}× {portSpeed}
            {poe && (
              <span
                style={{
                  marginLeft: 4,
                  padding: "0 3px",
                  borderRadius: 2,
                  background: `${MODULAR_TOKENS.ledActive}22`,
                  color: MODULAR_TOKENS.ledActive,
                  fontSize: 7,
                  fontWeight: 700,
                }}
              >
                {poe}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Status LED with halo */}
      <div
        style={{
          position: "relative",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: MODULAR_TOKENS.ledActive,
          boxShadow: `0 0 4px ${MODULAR_TOKENS.ledActive}, 0 0 8px ${MODULAR_TOKENS.ledActive}88`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 1.5,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.4)",
          }}
        />
      </div>
    </button>
  );
}

function PortCavity({ color, hasPoe }: { color: string; hasPoe: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 8,
        height: 7,
        background: `linear-gradient(180deg, ${MODULAR_TOKENS.portCavityFill} 0%, #0a0a0a 100%)`,
        border: `0.5px solid ${MODULAR_TOKENS.portCavityStroke}`,
        borderRadius: 1.5,
        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)",
      }}
    >
      {/* Inner cavity depth */}
      <div
        style={{
          position: "absolute",
          inset: "1px 0.5px 0.5px 0.5px",
          background: MODULAR_TOKENS.portInner,
          borderRadius: 0.5,
          boxShadow: "inset 0 0.5px 1px rgba(0,0,0,0.8)",
        }}
      />
      {/* Speed LED hint along top edge */}
      <div
        style={{
          position: "absolute",
          top: 0.5,
          left: 1,
          right: 1,
          height: 1.25,
          background: color,
          opacity: 0.85,
          borderRadius: 0.5,
          boxShadow: `0 0 2px ${color}`,
        }}
      />
      {hasPoe && (
        <div
          style={{
            position: "absolute",
            bottom: 0.5,
            right: 0.5,
            width: 1.5,
            height: 1.5,
            borderRadius: "50%",
            background: MODULAR_TOKENS.ledActive,
            boxShadow: `0 0 2px ${MODULAR_TOKENS.ledActive}`,
          }}
        />
      )}
    </div>
  );
}