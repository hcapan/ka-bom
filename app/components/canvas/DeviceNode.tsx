"use client";
import { useMemo } from "react";

import { Handle, Position, NodeProps, type Node } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  LAYER_CONFIG,
  DeviceType,
  getFaceplate,
} from "../../lib/hardware/catalog";
import SwitchFaceplate from "./SwitchFaceplate";
import { getNetworkModuleSpec } from "@/app/lib/hardware/data/switching/networkModules";
import type { UplinkModule } from "../../lib/types";
import type { PortSpeed } from "../../lib/hardware/types";



export type DeviceData = {
  name: string;
  pid: string;
  model: string;
  type: DeviceType;
  region?: string;
  networkModulePid?: string;
   uplinkPortCount?: number;
  uplinkPortSpeed?: PortSpeed;
  hasPoe?: boolean;
  [key: string]: unknown;
};

export type DeviceNodeType = Node<DeviceData, "device">;

// ──────────────────────────────────────────────────────────────────────────
// Handles
// ──────────────────────────────────────────────────────────────────────────

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

const lateralHandle = (color: string): React.CSSProperties => ({
  ...handleBase,
  background: color,
  width: 10,
  height: 10,
  boxShadow: `0 0 10px ${color}`,
});

// ──────────────────────────────────────────────────────────────────────────
// Decorative subcomponents
// ──────────────────────────────────────────────────────────────────────────

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

/** Small decorative PSU bay indicator. Two slim vertical bars (filled = installed). */
function PsuBays() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-0.75"
      title="PSU bays"
    >
      <span className="block h-3 w-1.25 rounded-sm bg-sky-400/80 shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
      <span className="block h-3 w-1.25 rounded-sm bg-sky-400/80 shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main node
// ──────────────────────────────────────────────────────────────────────────

export default function DeviceNode({
  data,
  selected,
}: NodeProps<DeviceNodeType>) {
  const cfg = LAYER_CONFIG[data.type] ?? {
    label: "UNKNOWN",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.05)",
    y: 0,
  };

  const networkModule = getNetworkModuleSpec(data.networkModulePid);

  const uplinkModules = networkModule
  ? [
      {
        pid: networkModule.pid,
        portCount: networkModule.portCount,
        portSpeed: networkModule.portSpeed,
      },
    ]
  : undefined;


  const faceplate = getFaceplate(data.model, data.pid);

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
        ${selected ? "ring-2 ring-sky-400 ring-offset-2" : ""}
      `}
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(255,255,255,0.98),
            rgba(248,250,252,0.98)
          )
        `,
        borderColor: selected ? "#38bdf8" : `${cfg.color}55`,
        padding: 10,
        minWidth: 210,
        boxShadow: selected
          ? `0 0 0 1px ${cfg.color}55, 0 14px 32px -10px rgba(15,23,42,0.18)`
          : "0 10px 26px -10px rgba(15,23,42,0.16)",
        position: "relative",
      }}
    >
      {/* Ambient Glow (driven by role color) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${cfg.color}, transparent 60%)`,
        }}
      />

      {/* Top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${cfg.color}, transparent)`,
        }}
      />

      {/* HANDLES (unchanged) */}
      <Handle id="t" type="target" position={Position.Top} style={verticalHandle(cfg.color)} />
      <Handle id="t-src" type="source" position={Position.Top} style={{ ...verticalHandle(cfg.color), top: -6, opacity: 0 }} />
      <Handle id="b-tgt" type="target" position={Position.Bottom} style={{ ...verticalHandle(cfg.color), bottom: -6, opacity: 0 }} />
      <Handle id="b" type="source" position={Position.Bottom} style={verticalHandle(cfg.color)} />
      <Handle id="l-tgt" type="target" position={Position.Left} style={{ ...lateralHandle("#f59e0b"), opacity: 0 }} />
      <Handle id="l" type="source" position={Position.Left} style={lateralHandle("#f59e0b")} />
      <Handle id="r-tgt" type="target" position={Position.Right} style={{ ...lateralHandle("#f59e0b"), opacity: 0 }} />
      <Handle id="r" type="source" position={Position.Right} style={lateralHandle("#f59e0b")} />

      {/* HEADER */}
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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

          <div className="mt-1 truncate text-[10px] text-slate-500">
            {data.model}
          </div>
        </div>

        {/* Right side: optional region pill + role badge */}
        <div className="flex items-center gap-1.5">
          {data.region && (
            <div
              className="
                rounded-full border border-slate-200
                bg-white/70 px-1.5 py-0.5
                text-[9px] font-semibold uppercase tracking-wider text-slate-600
                backdrop-blur-sm
              "
              title={`Region: ${data.region}`}
            >
              {data.region}
            </div>
          )}

          <div
            className="
              rounded-full border px-2 py-1
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
      </div>

      {/* FACEPLATE WRAPPER */}
      <div
        className="
          relative overflow-hidden rounded-xl
          border border-slate-200/70
          bg-linear-to-b from-slate-50 to-white
          p-2 shadow-inner
        "
      >
        {/* subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${cfg.color} 1px, transparent 1px),
              linear-gradient(to bottom, ${cfg.color} 1px, transparent 1px)
            `,
            backgroundSize: "16px 16px",
          }}
        />

        {faceplate?.accessPorts ? (
          <SwitchFaceplate
            pid={data.pid}
            accessPortCount={faceplate.accessPorts.count}
            accessPortSpeed={faceplate.accessPorts.speed}
            uplinkPortCount={faceplate.uplinkPorts?.count ?? 0}
            uplinkPortSpeed={faceplate.uplinkPorts?.speed ?? "10G"}
            uplinkModules={uplinkModules}
            hasPoe={faceplate.accessPorts.poe}
            rackUnits={faceplate.rackUnits}
          />
        ) : (
          <div
            className="
              rounded-lg border border-slate-200
              bg-slate-100 px-3 py-4
              text-center font-mono text-[11px]
              text-slate-600
            "
          >
            {data.pid}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <div className="truncate text-[10px] text-slate-400">
          {data.pid}
        </div>

        {/* Right: PSU bays + decorative LED cluster */}
        <div className="flex items-center gap-2">
          <PsuBays />
          <div className="flex items-center gap-1.5">
            <StatusLED tone="green" />
            <StatusLED tone="green" />
            <StatusLED tone="blue" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}