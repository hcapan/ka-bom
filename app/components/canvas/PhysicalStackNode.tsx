"use client";

import { memo, useMemo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import SwitchFaceplate from "./SwitchFaceplate";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import type { ConfiguredDevice } from "../../lib/types";
import type { PortSpeed } from "../../lib/hardware/schema/base";

type Catalog = ReturnType<typeof getEffectiveCatalog>;
type SwitchSeries = Catalog[string];
type SwitchPIDEntry = SwitchSeries["pids"][number];

export type PhysicalStackNodeData = {
  stackId: string;
  label: string;
  members: ConfiguredDevice[];
  collapsed?: boolean;
  onToggleCollapse?: (stackId: string) => void;
  onConvertToLogical?: (stackId: string) => void;
  onUnstack?: (stackId: string) => void;
  onDelete?: (stackId: string) => void;
};




// ──────────────────────────────────────────────────────────────────────────
// Decorative status LED
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

function PhysicalStackNodeImpl({ data, selected }: NodeProps) {
  const { stackId, label, members,collapsed,onToggleCollapse, onConvertToLogical, onDelete, onUnstack } =
    data as PhysicalStackNodeData;

  
  

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse?.(stackId);
  }, [onToggleCollapse, stackId]);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse?.(stackId);
  }, [onToggleCollapse, stackId]);

  const handleUnstack = useCallback(
  (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Unstack and free the member devices? They'll be placed side-by-side on the canvas.",
      )
    ) {
      onUnstack?.(stackId);
    }
  },
  [onUnstack, stackId],
);

  const handleConvertToLogical = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConvertToLogical?.(stackId);
  }, [onConvertToLogical, stackId]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(stackId);
  }, [onDelete, stackId]);

  const catalog = getEffectiveCatalog();

  const pidBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((m) => {
      const key = m.hardware.chassisPid || m.hardware.series || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [members]);

  // Series label (e.g. "Catalyst 9300") — assume homogeneous stack
  const seriesLabel = members[0]?.hardware.series ?? "Switch Stack";

    // ─────────────────────────────────────────────────────────────
  // COLLAPSED VIEW
  // ─────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <motion.div
        initial={false}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={`
          group relative overflow-visible rounded-2xl
          border backdrop-blur-2xl
          transition-shadow duration-300
          hover:shadow-2xl
          cursor-pointer
          ${selected ? "ring-2 ring-sky-400 ring-offset-2" : ""}
        `}
        style={{
          width: 320,
          height: 170,
          background: `
            linear-gradient(
              145deg,
              rgba(255,255,255,0.92),
              rgba(248,250,252,0.88)
            )
          `,
          borderColor: selected ? "#0ea5e9" : "rgba(14,165,233,0.25)",
          boxShadow: selected
            ? "0 16px 36px rgba(14,165,233,0.20)"
            : "0 8px 22px -8px rgba(15,23,42,0.18)",
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(14,165,233,0.2), transparent 70%)",
          }}
        />

        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400 to-transparent" />

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Top}
          id={`${stackId}-top`}
          style={{
            width: 11,
            height: 11,
            background: "#22c55e",
            border: "2px solid white",
            boxShadow: "0 0 10px #22c55e",
            zIndex:10,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id={`${stackId}-bottom`}
          style={{
            width: 11,
            height: 11,
            background: "#22c55e",
            border: "2px solid white",
            boxShadow: "0 0 10px #22c55e",
          }}
        />

        {/* HEADER */}
        <div className="relative flex items-center gap-2.5 px-3 py-2.5 border-b border-sky-100/40 bg-linear-to-r from-sky-50/90 via-blue-50/40 to-cyan-50/80 rounded-t-2xl">
          {onToggleCollapse && (
            <button
              onClick={handleToggleCollapse}
              className="
                flex h-7 w-7 items-center justify-center
                rounded-lg border border-sky-200/60
                bg-white/60 text-sky-700
                backdrop-blur-xl
                transition-all hover:scale-105 hover:bg-white/90 hover:shadow-sm
              "
              title="Expand stack"
            >
              ▶
            </button>
          )}

          <div
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl bg-sky-500/15
              text-base shadow-inner border border-sky-200/10
            "
          >
            ⚡
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-800">
              {label}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-slate-500">
              {seriesLabel} · Physical Stack
            </div>
          </div>

          <div
            className="
              shrink-0 rounded-full border border-sky-300/30
              bg-sky-100/50 px-2 py-0.5
              text-[10px] font-bold text-sky-800
              backdrop-blur-md
            "
          >
            {members.length} UNITS
          </div>
        </div>

        {/* OVERVIEW BODY */}
        <div className="relative px-4 py-3 space-y-1.5">
          {members.length === 0 ? (
            <div className="text-[11px] italic text-slate-400">
              Empty stack
            </div>
          ) : (
            <>
              {pidBreakdown.slice(0, 2).map(([pid, count]) => (
                <div
                  key={pid}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="truncate text-slate-600">{pid}</span>
                  <span className="ml-2 shrink-0 font-mono text-sky-700">
                    ×{count}
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-3 border-t border-slate-200/60 pt-1.5 mt-1">
                <div className="flex items-center gap-1.5">
                  <StatusLED tone="green" />
                  <StatusLED tone="green" />
                  <StatusLED tone="blue" />
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  Stack active
                </span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EXPANDED VIEW (your existing implementation, unchanged)
  // ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`
        group relative overflow-visible rounded-3xl
        border backdrop-blur-2xl
        transition-shadow duration-300
        hover:shadow-[0_25px_50px_-12px_rgba(14,165,233,0.15)]
        ${selected ? "ring-2 ring-sky-400 ring-offset-2" : ""}
      `}
      style={{
        background: `
          linear-gradient(
            145deg,
            rgba(255,255,255,0.95),
            rgba(248,250,252,0.9)
          )
        `,
        borderColor: selected ? "#0ea5e9" : "rgba(14,165,233,0.18)",
        boxShadow: selected
          ? "0 25px 60px rgba(14,165,233,0.15)"
          : "0 15px 35px -10px rgba(15,23,42,0.12)",
        minWidth: 430,
        padding: 14,
        position: "relative",
      }}
    >
      {/* ... ambient glow, accent line, handles ... */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(14,165,233,0.2), transparent 70%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400 to-transparent" />

      <Handle
        type="target"
        position={Position.Top}
        id={`${stackId}-top`}
        style={{
          width: 13,
          height: 13,
          background: "#22c55e",
          border: "2px solid white",
          boxShadow: "0 0 12px #22c55e",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${stackId}-bottom`}
        style={{
          width: 13,
          height: 13,
          background: "#22c55e",
          border: "2px solid white",
          boxShadow: "0 0 12px #22c55e",
        }}
      />

      {/* HEADER — now with collapse button */}
      <div className="relative mb-5 flex items-center justify-between rounded-2xl border border-sky-100/30 bg-linear-to-r from-sky-100/50 via-blue-50/20 to-cyan-100/50 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {onToggleCollapse && (
              <button
                onClick={handleToggleCollapse}
                className="
                  flex h-8 w-8 items-center justify-center
                  rounded-xl border border-sky-200/60
                  bg-white/60 text-sky-700
                  backdrop-blur-xl
                  transition-all hover:scale-105 hover:bg-white/90 hover:shadow-sm
                "
                title="Collapse stack"
              >
                ▼
              </button>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-lg shadow-inner border border-sky-200/20">
              ⚡
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-800">
                {label}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Physical Switch Stack
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-full border border-sky-300/30 bg-sky-50/80 px-3 py-1 text-[10px] font-bold text-sky-800 backdrop-blur-md shadow-sm">
          {members.length} UNITS
        </div>
      </div>

      {/* STACK MEMBERS — unchanged */}
      <div className="relative flex flex-col gap-3">
        {members.map((device, idx) => {
          const series: SwitchSeries | undefined =
            catalog[device.hardware.series];

          const pidEntry: SwitchPIDEntry | undefined = series?.pids?.find(
            (p) => p.pid === device.hardware.chassisPid
          );

          if (!series || !pidEntry) {
            return (
              <div
                key={device.id}
                className="rounded-2xl border border-rose-400/30 bg-rose-50 px-4 py-3 text-[11px] text-rose-600 shadow-sm"
              >
                ⚠ Unknown PID: {device.hardware.chassisPid}
              </div>
            );
          }

          const fp = resolveFaceplate(pidEntry);

          return (
            <div
              key={device.id}
              className="group/member relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 p-3 backdrop-blur-xl transition-all duration-200 hover:border-sky-300/80 hover:bg-white/95 hover:shadow-xl"
              data-stack-member-id={device.id}
              data-stack-member-index={idx}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/member:opacity-100">
                <div className="absolute inset-0 bg-linear-to-r from-sky-500/5 via-transparent to-cyan-500/5" />
              </div>

              <div className="relative flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-500/10 text-[12px] font-bold text-sky-700 shadow-inner">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50/40 p-2 shadow-inner">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #0ea5e9 1px, transparent 1px),
                        linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)
                      `,
                      backgroundSize: "18px 18px",
                    }}
                  />

                  <SwitchFaceplate
                    pid={pidEntry.pid}
                    vendor={series.vendor ?? "Cisco"}
                    accessPortCount={fp.accessPortCount}
                    accessPortSpeed={fp.accessPortSpeed as PortSpeed}
                    uplinkPortCount={fp.uplinkPortCount}
                    uplinkPortSpeed={fp.accessPortSpeed as PortSpeed}
                    rackUnits={fp.rackUnits}
                    hasPoe={fp.hasPoe}
                  />
                </div>

                <div className="flex w-22.5 flex-col items-end justify-between gap-2">
                  <div
                    className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600"
                    title={device.name}
                  >
                    {device.name || "Unnamed"}
                  </div>

                  <div className="text-right">
                    <div className="truncate text-[9px] font-semibold text-slate-400">
                      {device.hardware.chassisPid}
                    </div>
                    <div className="mt-1.5 flex items-center justify-end gap-1.5">
                      <StatusLED tone="green" />
                      <StatusLED tone="green" />
                      <StatusLED tone="blue" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER — unchanged */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3">
        <div className="text-[10px] text-slate-400">Stack ID: {stackId}</div>
        <div className="flex gap-2">
          {onConvertToLogical && (
            <button
              onClick={handleUnstack}
              className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-600 backdrop-blur-md transition hover:border-sky-300 hover:text-sky-700"
            >
              Unstack
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-[10px] font-semibold text-rose-600 backdrop-blur-md transition hover:bg-rose-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Faceplate spec resolver  (unchanged)
// ============================================================

const VALID_PORT_SPEEDS: readonly PortSpeed[] = [
  "1G",
  "2.5G",
  "10G",
  "25G",
  "40G",
  "50G",
  "100G",
  "400G",
] as const;

function isPortSpeed(value: unknown): value is PortSpeed {
  return (
    typeof value === "string" &&
    (VALID_PORT_SPEEDS as readonly string[]).includes(value)
  );
}

type FaceplateSpec = {
  accessPortCount: number;
  accessPortSpeed: PortSpeed;
  uplinkPortCount: number;
  uplinkPortSpeed: PortSpeed;
  rackUnits: number;
  hasPoe: boolean;
};

function resolveFaceplate(pidEntry: SwitchPIDEntry): FaceplateSpec {
  const entry = pidEntry as unknown as {
    faceplate?: {
      accessPorts?: { count?: number; speed?: string; poe?: boolean };
      uplinkPorts?: { count?: number; speed?: string };
      rackUnits?: number;
    };
  };

  const fp = entry.faceplate;
  const access = fp?.accessPorts;
  const uplink = fp?.uplinkPorts;

  return {
    accessPortCount: typeof access?.count === "number" ? access.count : 0,
    accessPortSpeed: isPortSpeed(access?.speed) ? access.speed : "1G",
    uplinkPortCount: typeof uplink?.count === "number" ? uplink.count : 0,
    uplinkPortSpeed: isPortSpeed(uplink?.speed) ? uplink.speed : "10G",
    rackUnits: typeof fp?.rackUnits === "number" ? fp.rackUnits : 1,
    hasPoe: typeof access?.poe === "boolean" ? access.poe : false,
  };
}

export const PhysicalStackNode = memo(PhysicalStackNodeImpl);
