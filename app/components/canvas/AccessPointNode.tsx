"use client";

import { Handle, Position, NodeProps, type Node } from "@xyflow/react";
import { motion } from "framer-motion";
import { Wifi, Antenna } from "lucide-react";
import { LAYER_CONFIG, DeviceType } from "../../lib/hardware/catalog";
import type { APAttrs } from "../../lib/hardware/schema/wireless";

// ============================================================
// DATA TYPE
// ============================================================
export type AccessPointNodeData = {
  name: string;
  pid: string;
  model: string;       // series name
  type: DeviceType;    // always "wireless"
  region?: string;
  attrs?: APAttrs;
  [key: string]: unknown;
};

export type AccessPointNodeType = Node<AccessPointNodeData, "ap">;

// ============================================================
// HANDLE STYLES (matches DeviceNode pattern)
// ============================================================
const handleBase: React.CSSProperties = {
  width: 10,
  height: 10,
  border: "2px solid rgba(255,255,255,0.95)",
  borderRadius: "9999px",
  boxShadow: "0 0 10px rgba(0,0,0,0.15)",
  transition: "all 0.2s ease",
};

const verticalHandle = (color: string): React.CSSProperties => ({
  ...handleBase,
  background: color,
  width: 12,
  height: 12,
  boxShadow: `0 0 12px ${color}`,
});

// ============================================================
// MAIN NODE
// ============================================================
export default function AccessPointNode({
  data,
  selected,
}: NodeProps<AccessPointNodeType>) {
  const cfg = LAYER_CONFIG[data.type] ?? {
    label: "WIRELESS",
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.05)",
    y: 0,
  };

  const wifi = data.attrs?.wifiStandard;
  const antenna = data.attrs?.antenna;
  const outdoor = data.attrs?.outdoor;
  const poe = data.attrs?.poeRequirement;

  return (
    <motion.div
      initial={false}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`
        group relative overflow-hidden rounded-2xl
        border backdrop-blur-xl
        transition-shadow duration-300
        hover:shadow-2xl
        ${selected ? "ring-2 ring-violet-400 ring-offset-2" : ""}
      `}
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(255,255,255,0.98),
            rgba(248,250,252,0.98)
          )
        `,
        borderColor: selected ? "#a855f7" : `${cfg.color}55`,
        padding: 12,
        minWidth: 180,
        boxShadow: selected
          ? `0 0 0 1px ${cfg.color}55, 0 14px 32px -10px rgba(15,23,42,0.18)`
          : "0 10px 26px -10px rgba(15,23,42,0.16)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          background: `radial-gradient(circle at top, ${cfg.color}, transparent 65%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${cfg.color}, transparent)`,
        }}
      />

      {/* ── HANDLES ──────────────────────────────────── */}
      {/* APs only have ONE uplink — bottom acts as both source and target */}
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={verticalHandle(cfg.color)}
      />
      <Handle
        id="t-src"
        type="source"
        position={Position.Top}
        style={{ ...verticalHandle(cfg.color), top: -6, opacity: 0 }}
      />

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="relative mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: cfg.color,
                boxShadow: `0 0 10px ${cfg.color}`,
              }}
            />
            <div
              className="truncate text-[12px] font-bold tracking-tight text-slate-800"
              title={data.name}
            >
              {data.name}
            </div>
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
            {data.pid}
          </div>
        </div>

        {/* Wireless layer badge */}
        <div
          className="
            shrink-0 rounded-full border px-2 py-0.5
            text-[9px] font-bold uppercase tracking-[0.12em]
            backdrop-blur-sm
          "
          style={{
            color: cfg.color,
            borderColor: `${cfg.color}33`,
            background: `${cfg.color}10`,
          }}
        >
          {cfg.label.split(" ")[0]}
        </div>
      </div>

      {/* ── AP VISUAL — radiating signal ─────────────── */}
      <div className="relative my-1 flex items-center justify-center py-2">
        {/* Background rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="absolute h-12 w-12 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${cfg.color}66 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute h-8 w-8 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${cfg.color}99 0%, transparent 70%)`,
            }}
          />
        </div>
        {/* Center icon */}
        <div
          className="relative flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: cfg.color,
            boxShadow: `0 0 16px ${cfg.color}88`,
          }}
        >
          {antenna === "external" ? (
            <Antenna size={14} className="text-white" />
          ) : (
            <Wifi size={14} className="text-white" />
          )}
        </div>
      </div>

      {/* ── ATTRIBUTES BADGES ─────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        {wifi && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              background: `${cfg.color}15`,
              color: cfg.color,
              border: `1px solid ${cfg.color}40`,
            }}
          >
            {wifi}
          </span>
        )}
        {poe && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
            {poe}
          </span>
        )}
        {outdoor && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
            Outdoor
          </span>
        )}
      </div>

      {/* ── FOOTER ────────────────────────────────────── */}
      <div className="relative mt-2 truncate text-center text-[9px] italic text-slate-400">
        {data.model}
      </div>
    </motion.div>
  );
}