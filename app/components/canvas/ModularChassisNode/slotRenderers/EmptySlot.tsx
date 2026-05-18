"use client";

import { MODULAR_TOKENS, MODULAR_SIZES } from "../chassisStyles";
import type { SlotKind } from "@/app/lib/types";

type Props = {
  slotId: string;
  slotKind: SlotKind;
  required?: boolean;
  note?: string;
  onClick: () => void;
};

const KIND_LABEL: Record<SlotKind, string> = {
  supervisor: "Supervisor",
  linecard: "Linecard",
  "fabric-module": "Fabric Module",
  psu: "PSU",
  fan: "Fan",
  ssd: "SSD",
  blank: "Blank",
};

export function EmptySlot({
  slotId,
  slotKind,
  required,
  note,
  onClick,
}: Props) {
  const accentBorder = required
    ? MODULAR_TOKENS.slotRequiredBorder
    : MODULAR_TOKENS.bodyShadow;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={note ?? `Click to configure ${KIND_LABEL[slotKind]}`}
      style={{
        position: "relative",
        height: MODULAR_SIZES.SLOT_HEIGHT,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: `0 ${MODULAR_SIZES.PADDING}px`,
        // Recessed empty bay
        background: MODULAR_TOKENS.slotEmptyBg,
        border: "none",
        borderTop: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyHighlight}`,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: `inset 0 1px 2px rgba(0,0,0,0.15)`,
      }}
    >
      {/* Slot number tag */}
      <div
        style={{
          flex: "0 0 32px",
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 800,
          color: MODULAR_TOKENS.textSecondary,
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

      {/* Kind tag (dashed border = empty) */}
      <div
        style={{
          flex: 1,
          padding: "4px 8px",
          fontSize: 10,
          color: MODULAR_TOKENS.textMuted,
          fontFamily: "monospace",
          fontStyle: "italic",
          letterSpacing: 0.3,
          border: `1px dashed ${accentBorder}`,
          borderRadius: 2,
          background: "rgba(255,255,255,0.3)",
        }}
      >
        + Add {KIND_LABEL[slotKind]}
        {required && (
          <span
            style={{
              color: MODULAR_TOKENS.slotRequiredBorder,
              marginLeft: 4,
              fontWeight: 700,
            }}
          >
            ★ required
          </span>
        )}
      </div>
    </button>
  );
}