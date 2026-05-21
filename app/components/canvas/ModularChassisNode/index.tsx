"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConfiguredDevice } from "@/app/lib/types";
import {
  getChassisSlotLayout,
  normalizeSlots,
  type SlotLayoutEntry,
} from "@/app/lib/hardware/chassisHelpers";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import {
  MODULAR_TOKENS,
  MODULAR_SIZES,
  getChassisRolePalette,
} from "./chassisStyles";
import { SlotRow } from "./SlotRow";

export type ModularChassisNodeData = {
  device: ConfiguredDevice;
  onConfigureSlot: (deviceId: string, slotId: string) => void;
  onConfigureDevice?: (deviceId: string) => void;
};

// ───────── Decorative subcomponents (same as DeviceNode) ─────────
function StatusLED({ tone }: { tone: "green" | "blue" | "amber" }) {
  const palette = {
    green: { bg: "#10b981", glow: "rgba(16,185,129,0.65)" },
    blue: { bg: "#0ea5e9", glow: "rgba(14,165,233,0.65)" },
    amber: { bg: "#f59e0b", glow: "rgba(245,158,11,0.65)" },
  } as const;
  const c = palette[tone];
  return (
    <span
      aria-hidden
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        background: c.bg,
        boxShadow: `0 0 6px ${c.glow}`,
        display: "inline-block",
      }}
    />
  );
}

function PsuBays() {
  return (
    <div aria-hidden className="flex items-center gap-0.75" title="PSU bays">
      <span className="block h-3 w-1.25 rounded-sm bg-sky-400/80 shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
      <span className="block h-3 w-1.25 rounded-sm bg-sky-400/80 shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
    </div>
  );
}

function ModularChassisNodeImpl({ data, selected }: NodeProps) {
  const { device, onConfigureSlot, onConfigureDevice } =
    data as ModularChassisNodeData;

  const layout: SlotLayoutEntry[] = getChassisSlotLayout(
    device.hardware.chassisPid,
  );

  // 🎨 Role-driven palette (access/distribution/core/edge/wan)
  const palette = getChassisRolePalette(device.type);

  if (layout.length === 0) {
    return (
      <div
        style={{
          background: MODULAR_TOKENS.bodyBg,
          color: "#ef4444",
          padding: 12,
          borderRadius: 4,
          border: "2px solid #ef4444",
          fontFamily: "monospace",
          fontSize: 11,
          minWidth: MODULAR_SIZES.CHASSIS_WIDTH,
        }}
      >
        ⚠ No modular layout for {device.hardware.chassisPid}
      </div>
    );
  }

  const catalog = getEffectiveCatalog();
  const series = catalog[device.hardware.series];
  const chassisPidEntry = series?.pids.find(
    (p) => p.pid === device.hardware.chassisPid,
  );

  const slots = normalizeSlots(device);
  const occupied = slots.filter((s) => s.modulePid).length;
  const totalSlots = layout.length;
  const hasUnfilledRequired = layout.some(
    (s) =>
      s.required && !slots.find((x) => x.slotId === String(s.slot))?.modulePid,
  );

  return (
    <div
      style={{
        position: "relative",
        width: MODULAR_SIZES.CHASSIS_WIDTH,
        background: `linear-gradient(180deg, 
      ${palette.accent}08 0%, 
      rgba(255,255,255,0.95) 40%, 
      rgba(255,255,255,0.98) 100%)`,
        border: `1px solid ${
          selected ? palette.accent : MODULAR_TOKENS.bodyBorder
        }`,
        borderRadius: 12,
        boxShadow: selected
          ? `0 0 0 2px ${palette.accent}55, 0 4px 10px rgba(0,0,0,0.15)`
          : `0 2px 6px rgba(0,0,0,0.15)`,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onDoubleClick={() => onConfigureDevice?.(device.id)}
    >
      {/* 🎨 Ambient glow (role-driven) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(circle at top right, ${palette.glow}, transparent 60%)`,
        }}
      />

      {/* 🎨 Top accent line (role-driven) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${palette.accent}, transparent)`,
          zIndex: 2,
        }}
      />

      {/* Top metal-edge highlight (matches faceplate) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: MODULAR_TOKENS.bodyHighlight,
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />

      {/* Bottom metal-edge shadow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: MODULAR_TOKENS.bodyShadow,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* All content above the glow */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ⭐ NEW: DeviceNode-style top header (status dot + name + pills) */}
        <div className="relative flex items-start justify-between gap-3 px-3 pt-3 pb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: hasUnfilledRequired ? "#ffffff" : palette.accent,
                  boxShadow: `0 0 10px ${
                    hasUnfilledRequired ? "#f59e0b" : palette.accent
                  }`,
                }}
              />
              <div
                className="truncate text-[12px] font-bold tracking-tight text-slate-800"
                title={device.name}
              >
                {device.name}
              </div>
            </div>
            <div className="mt-1 truncate text-[10px] text-slate-500">
              {chassisPidEntry?.description ?? device.hardware.chassisPid}
            </div>
          </div>

          {/* Right side: slot fill pill + role badge */}
          <div className="flex items-center gap-1.5">
            <div
              className={`
                rounded-full border px-1.5 py-0.5
                text-[9px] font-bold uppercase tracking-wider
                backdrop-blur-sm
                ${
                  occupied === totalSlots
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : occupied > 0
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white/70 text-slate-600"
                }
              `}
              title={`${occupied}/${totalSlots} slots occupied`}
            >
              {occupied}/{totalSlots}
            </div>

            <div
              className="
                rounded-full border px-2 py-1
                text-[9px] font-bold uppercase tracking-[0.12em]
                backdrop-blur-sm
              "
              style={{
                color: palette.accent,
                borderColor: `${palette.accent}33`,
                background: `${palette.accent}10`,
              }}
            >
              {device.type?.toUpperCase() ?? "CORE"}
            </div>
          </div>
        </div>

        {/* ⭐ NEW: Inner panel wrapper (mirrors DeviceNode faceplate wrapper) */}
        <div
          className="
            relative mx-2 mb-2 mt-1 overflow-hidden rounded-xl
            border border-slate-200/70
            bg-linear-to-b from-slate-50 to-white
            p-1 shadow-inner
          "
        >
          {/* subtle role-tinted grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(to right, ${palette.accent} 1px, transparent 1px),
                linear-gradient(to bottom, ${palette.accent} 1px, transparent 1px)
              `,
              backgroundSize: "16px 16px",
            }}
          />

          {/* Slot tower (UNCHANGED — your original) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: MODULAR_SIZES.SLOT_GAP,
              padding: `${MODULAR_SIZES.SLOT_GAP}px 0`,
              background: MODULAR_TOKENS.slotPanelBg,
              borderRadius: 6,
              position: "relative",
            }}
          >
            {layout.map((slotSpec) => {
              const slotId = String(slotSpec.slot);
              const assignment = slots.find((s) => s.slotId === slotId);
              return (
                <SlotRow
                  key={slotId}
                  deviceId={device.id}
                  slotId={slotId}
                  slotKind={slotSpec.kind}
                  modulePid={assignment?.modulePid}
                  required={slotSpec.required}
                  note={slotSpec.note}
                  onClick={() => onConfigureSlot(device.id, slotId)}
                />
              );
            })}
          </div>
        </div>

        {/* ⭐ NEW: Footer (PID + PSU bays + status LED cluster) */}
        <div className="relative flex items-center justify-between gap-2 px-3 pb-2.5">
          <div className="truncate text-[10px] text-slate-400">
            {device.hardware.chassisPid}
          </div>

          <div className="flex items-center gap-2">
            <PsuBays />
            <div className="flex items-center gap-1.5">
              <StatusLED tone="green" />
              <StatusLED tone={hasUnfilledRequired ? "amber" : "green"} />
              <StatusLED tone="blue" />
            </div>
          </div>
        </div>
      </div>

      {/* Chassis-level handles for high-level diagrams */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${device.id}::chassis::top`}
        style={{
          background: palette.accent,
          width: 10,
          height: 10,
          border: `2px solid white`,
          boxShadow: `0 0 8px ${palette.accent}`,
          zIndex: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${device.id}::chassis::bottom`}
        style={{
          background: palette.accent,
          width: 10,
          height: 10,
          border: `2px solid white`,
          boxShadow: `0 0 8px ${palette.accent}`,
          zIndex: 10,
        }}
      />

      {/* ⭐ Compatibility handles — match DeviceNode short IDs (t/b/l/r) */}
      <Handle
        type="target"
        position={Position.Top}
        id="t"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          top: 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          bottom: 0,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="l"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          left: 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          right: 0,
        }}
      />
    </div>
  );
}

export const ModularChassisNode = memo(ModularChassisNodeImpl);
