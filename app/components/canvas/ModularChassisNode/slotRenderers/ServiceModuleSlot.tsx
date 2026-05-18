"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "../chassisStyles";
import type { ModuleCatalogEntry } from "@/app/lib/hardware/chassisHelpers";

type Props = {
  slotId: string;
  module: ModuleCatalogEntry;
  onClick: () => void;
};

export function ServiceModuleSlot({ slotId, module, onClick }: Props) {
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
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: MODULAR_TOKENS.serviceAccent,
        }}
      />

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
        }}
      >
        {String(slotId).padStart(2, "0")}
      </div>

      <div
        style={{
          flex: "0 0 30px",
          fontFamily: "system-ui, sans-serif",
          fontSize: 9,
          fontWeight: 800,
          color: MODULAR_TOKENS.serviceAccent,
          letterSpacing: 1,
        }}
      >
        SVC
      </div>

      <div
        style={{
          flex: 1,
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
    </button>
  );
}