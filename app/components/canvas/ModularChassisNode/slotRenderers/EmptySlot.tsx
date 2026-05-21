// app/components/canvas/nodes/ModularChassisNode/slotRenderers/EmptySlot.tsx
"use client";

import { Plus, Star } from "lucide-react";
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

  const accentText = required
    ? MODULAR_TOKENS.textMuted
    : MODULAR_TOKENS.textMuted;

  const accentBg = required
    ? "rgba(245,158,11,0.08)"
    : "rgba(255,255,255,0.35)";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={note ?? `Click to configure ${KIND_LABEL[slotKind]}`}
      className="group/empty"
      style={{
        position: "relative",
        height: MODULAR_SIZES.SLOT_HEIGHT,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: `0 ${MODULAR_SIZES.PADDING}px`,
        background: MODULAR_TOKENS.slotEmptyBg,
        border: "none",
        borderTop: `1px solid ${MODULAR_TOKENS.bodyShadow}`,
        borderBottom: `1px solid ${MODULAR_TOKENS.bodyHighlight}`,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: `inset 0 1px 2px rgba(0,0,0,0.15)`,
        transition: "background 150ms ease",
      }}
    >
      {/* Slot number tag */}
      <div
        style={{
          flex: "0 0 32px",
          fontFamily: "Inter",
          fontSize: 11,
          fontWeight: 800,
          color: required
            ? MODULAR_TOKENS.slotRequiredBorder
            : MODULAR_TOKENS.textSecondary,
          textAlign: "center",
          padding: "2px 0",
          background: required ? "#fef3c7" : "#dde1e5",
          border: `1px solid ${
            required
              ? MODULAR_TOKENS.slotRequiredBorder
              : MODULAR_TOKENS.bodyShadow
          }`,
          borderRadius: 2,
          letterSpacing: 0.5,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
        }}
      >
        {String(slotId).padStart(2, "0")}
      </div>

      {/* Add-module pill (dashed border = empty) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          fontSize: 10,
          color: accentText,
          fontFamily: "Inter",
          fontStyle: "italic",
          letterSpacing: 0.3,
          border: `1px dashed ${accentBorder}`,
          borderRadius: 4,
          background: accentBg,

          transition: "all 150ms ease",
        }}
      >
        {/* Plus icon — rotates on hover */}
        <span
          className="transition-transform duration-150 group-hover/empty:rotate-90"
          style={{
            display: "inline-flex",
            color: accentText,
          }}
        >
          <Plus size={11} strokeWidth={2.5} />
        </span>


        {required ? (
          <span style={{ flex: 1 }}>Add {KIND_LABEL[slotKind]}</span>
        ) : (
          <span style={{ flex: 1 }}>Add {KIND_LABEL[slotKind]}</span>
        )}

        {required && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 6px",
              borderRadius: 999,
              border: `1px solid ${MODULAR_TOKENS.slotRequiredBorder}`,
              background: "rgba(255,255,255,0.7)",
              color: MODULAR_TOKENS.slotRequiredBorder,
              fontSize: 8,
              fontWeight: 800,
              fontStyle: "normal",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            <Star
              size={8}
              strokeWidth={2}
              fill={MODULAR_TOKENS.slotRequiredBorder}
              style={{ color: MODULAR_TOKENS.slotRequiredBorder }}
            />
            Required
          </span>
        )}
      </div>
    </button>
  );
}
