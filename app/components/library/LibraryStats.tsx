"use client";

import { useMemo } from "react";
import {
  Package,
  CheckCircle2,
  Layers,
  Cpu,
  Cable,
  CircleDashed,
  AlertCircle,
} from "lucide-react";
import { getEffectiveCatalog } from "../../lib/hardware/catalog";
import { getBundleStatus, BundleStatus } from "./BundleStatusBadge";

type StatTone = "neutral" | "emerald" | "blue" | "violet" | "sky" | "amber" | "rose";

export const TONE_STYLES: Record<StatTone, { text: string; bg: string; ring: string; icon: string }> = {
  neutral: { text: "text-slate-800",   bg: "bg-slate-50",   ring: "ring-slate-200",   icon: "text-slate-500" },
  emerald: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", icon: "text-emerald-500" },
  blue:    { text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-200",    icon: "text-blue-500" },
  violet:  { text: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-200",  icon: "text-violet-500" },
  sky:     { text: "text-sky-700",     bg: "bg-sky-50",     ring: "ring-sky-200",     icon: "text-sky-500" },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200",   icon: "text-amber-500" },
  rose:    { text: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200",    icon: "text-rose-500" },
};

export default function LibraryStats() {
  const catalog = useMemo(() => getEffectiveCatalog(), []);

  const stats = useMemo(() => {
    const counts: Record<BundleStatus, number> = {
      complete: 0,
      "faceplate-only": 0,
      linecard: 0,
      supervisor: 0,
      accessories: 0,
      stub: 0,
    };
    let totalPids = 0;

    for (const series of Object.values(catalog)) {
      for (const pid of series.pids) {
        totalPids++;
        counts[getBundleStatus(pid)]++;
      }
    }

    const healthy =
      counts.complete +
      counts["faceplate-only"] +
      counts.linecard +
      counts.supervisor +
      counts.accessories;

    const healthRatio = totalPids > 0 ? healthy / totalPids : 0;
    const healthPct = Math.round(healthRatio * 100);

    return { totalPids, counts, healthy, healthPct, healthRatio };
  }, [catalog]);

  const healthTone: StatTone =
    stats.healthRatio >= 0.95
      ? "emerald"
      : stats.healthRatio >= 0.75
        ? "amber"
        : "rose";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-stretch gap-px bg-slate-100">
        {/* Total */}
        <Stat
          icon={<Package size={14} strokeWidth={2.25} />}
          label="Total PIDs"
          value={stats.totalPids}
          tone="neutral"
        />

        {/* Healthy categories — collapsible into compact pills */}
        <Stat
          icon={<CheckCircle2 size={14} strokeWidth={2.25} />}
          label="Complete"
          value={stats.counts.complete}
          tone="emerald"
        />
        <Stat
          icon={<Cpu size={14} strokeWidth={2.25} />}
          label="Supervisor"
          value={stats.counts.supervisor}
          tone="violet"
        />
        <Stat
          icon={<Layers size={14} strokeWidth={2.25} />}
          label="Linecard"
          value={stats.counts.linecard}
          tone="sky"
        />
        <Stat
          icon={<Cable size={14} strokeWidth={2.25} />}
          label="Accessories"
          value={stats.counts.accessories}
          tone="amber"
        />
        <Stat
          icon={<CircleDashed size={14} strokeWidth={2.25} />}
          label="Stubs"
          value={stats.counts.stub}
          tone="rose"
          highlight={stats.counts.stub > 0}
        />

        {/* Coverage card — distinct, right-aligned */}
        <div
          className={`ml-auto flex flex-col items-end justify-center gap-0.5 px-5 py-3 ${TONE_STYLES[healthTone].bg}`}
        >
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Catalog Health
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${TONE_STYLES[healthTone].text}`}>
              {stats.healthPct}%
            </span>
            {stats.counts.stub > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600">
                <AlertCircle size={11} strokeWidth={2.5} />
                {stats.counts.stub} stub{stats.counts.stub === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div
            className="mt-1 h-1 w-24 rounded-full bg-white/60 ring-1 ring-inset ring-black/5 overflow-hidden"
            role="progressbar"
            aria-valuenow={stats.healthPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full transition-all duration-500 ${
                healthTone === "emerald"
                  ? "bg-emerald-500"
                  : healthTone === "amber"
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${stats.healthPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-component
// ────────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  tone = "neutral",
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: StatTone;
  highlight?: boolean;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className={`flex-1 min-w-27.5 flex flex-col gap-0.5 px-4 py-3 bg-white transition-colors ${
        highlight ? "ring-1 ring-inset ring-rose-200" : ""
      }`}
    >
      <p className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <span className={styles.icon}>{icon}</span>
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${styles.text}`}>
        {value}
      </p>
    </div>
  );
}