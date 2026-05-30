"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings2, Save, RotateCcw, Info, AlertTriangle } from "lucide-react";
import type {
  HardwareConfig,
  GlobalDefaults,
  Project,
  Region,
  SmartnetTier,
  ContractTermYears,
} from "../../lib/types";
import { getEffectiveCatalog } from "../../lib/hardware/catalog";
import { isModularChassis } from "@/app/lib/hardware/chassisHelpers";
import { getNetworkModuleSpec } from "@/app/lib/hardware/data/switching/networkModules";

type Props = {
  /** PID of the chassis the template applies to */
  chassisPid: string;
  /** Series name (e.g. "Catalyst 9300") */
  series: string;
  /** Existing template state (so re-opening shows current selections) */
  initial: Partial<HardwareConfig>;
  /** Save handler — receives sanitized template */
  onSave: (next: Partial<HardwareConfig>) => void;
  onClose: () => void;
  globalDefaults: GlobalDefaults;
  project: Project;
};

const REGIONS: Region[] = [
  "EU", "US", "UK", "JP", "AU", "IN", "CN", "BR", "INTL", "IL", "CH", "IT", "TW",
];

const SMARTNET_TIERS: { value: SmartnetTier; label: string }[] = [
  { value: "SNT",  label: "SMARTnet 8x5xNBD (SNT)" },
  { value: "SNTP", label: "SMARTnet Premium 24x7x4 (SNTP)" },
  { value: "OS",   label: "Solution Support 8x5xNBD (OS)" },
  { value: "OSP",  label: "Solution Support Premium 24x7x4 (OSP)" },
  { value: "PSUP", label: "Partner Support (PSUP)" },
  { value: "ECMU", label: "Embedded — Software (ECMU)" },
  { value: "NONE", label: "No support" },
];

const TERMS: ContractTermYears[] = [1, 3, 5, 7];

export default function TemplateModal({
  chassisPid,
  series,
  initial,
  onSave,
  onClose,
  globalDefaults,
}: Props) {
  // ─── Local working state ───────────────────────────────────
  const [draft, setDraft] = useState<Partial<HardwareConfig>>({ ...initial });

  // ─── Catalog lookups ───────────────────────────────────────
  const catalog = useMemo(() => getEffectiveCatalog(), []);
  const seriesData = catalog[series];
  const pidObj = seriesData?.pids.find((p) => p.pid === chassisPid);
  const bundle = pidObj?.bundle;

  const isModular = isModularChassis(chassisPid);

  // Network module options (from chassis bundle, if any)
  const networkModuleOptions = bundle?.networkModuleOptions?.options ?? [];
  const hasNetworkModuleSlot = networkModuleOptions.length > 0;

  // PSU options (from chassis bundle)
  const psuPrimaryOptions = bundle?.psuOptions?.primary ?? [];
  const hasPsuOptions = psuPrimaryOptions.length > 0;
  const supportsRedundantPsu = !!bundle?.psuOptions?.secondaryPidMap;

  // ─── Helpers ───────────────────────────────────────────────
  const setField = <K extends keyof HardwareConfig>(
    key: K,
    value: HardwareConfig[K] | undefined,
  ) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "" || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const resetDraft = () => setDraft({});

  const handleSave = () => {
    // Defense-in-depth — never let template override chassis identity
    const sanitized = { ...draft };
    delete sanitized.series;
    delete sanitized.chassisPid;
    onSave(sanitized);
    onClose();
  };

  // ─── Keyboard: Esc closes ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ─── Summary helpers ───────────────────────────────────────
  const fieldCount = Object.keys(draft).length;

  const networkModuleSpec = draft.networkModulePid
    ? getNetworkModuleSpec(draft.networkModulePid)
    : undefined;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="
            relative flex w-full max-w-lg flex-col
            overflow-hidden rounded-xl
            border border-slate-200 bg-white shadow-2xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────── */}
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-violet-600" />
                <h2 className="text-sm font-bold tracking-tight text-slate-800">
                  Configure Hardware Template
                </h2>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Applied identically to every device in this bulk batch.
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {chassisPid} · {series}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </header>

          {/* ── Body (scrollable) ───────────────────────────── */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3 space-y-4 max-h-[60vh]">
            {/* Modular chassis warning */}
            {isModular && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This is a <strong>modular chassis</strong>. Slot configuration
                  (supervisors, line cards, fabric modules) must be set
                  individually after add. Use this template only for
                  PSU/license/smartnet defaults.
                </p>
              </div>
            )}

            {/* ── Network Module ──────────────────────────── */}
            {hasNetworkModuleSlot && !isModular && (
              <Section
                title="Network Module"
                hint="Optional uplink network module for the chassis slot."
              >
                <select
                  value={draft.networkModulePid ?? ""}
                  onChange={(e) =>
                    setField("networkModulePid", e.target.value || undefined)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">— No network module —</option>
                  {networkModuleOptions.map((opt) => (
                    <option key={opt.pid} value={opt.pid}>
                      {opt.pid} — {opt.label}
                    </option>
                  ))}
                </select>

                {networkModuleSpec && (
                  <p className="mt-1 text-[10px] italic text-slate-500">
                    Adds {networkModuleSpec.portCount}× {networkModuleSpec.portSpeed}{" "}
                    uplink ports.
                  </p>
                )}
              </Section>
            )}

            {/* ── Primary PSU ─────────────────────────────── */}
            {hasPsuOptions && (
              <Section
                title="Primary PSU"
                hint="Primary power supply for the chassis."
              >
                <select
                  value={draft.primaryPsuPid ?? ""}
                  onChange={(e) =>
                    setField("primaryPsuPid", e.target.value || undefined)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">— Use chassis default —</option>
                  {psuPrimaryOptions.map((opt) => (
                    <option key={opt.pid} value={opt.pid}>
                      {opt.pid} — {opt.label}
                    </option>
                  ))}
                </select>
              </Section>
            )}

            {/* ── Redundant PSU ───────────────────────────── */}
            {supportsRedundantPsu && (
              <Section
                title="Redundant PSU"
                hint="Adds a second PSU for redundancy."
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={!!draft.redundantPsu}
                    onChange={(e) =>
                      setField("redundantPsu", e.target.checked || undefined)
                    }
                    className="cursor-pointer accent-sky-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Add redundant PSU
                  </span>
                </label>
              </Section>
            )}

            {/* ── Region ─────────────────────────────────── */}
            <Section
              title="Region"
              hint="Determines power cord variant."
            >
              <select
                value={draft.region ?? ""}
                onChange={(e) =>
                  setField("region", (e.target.value as Region) || undefined)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">
                  — Use global default ({globalDefaults.region}) —
                </option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Section>
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              {fieldCount > 0 ? (
                <>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
                    {fieldCount} override{fieldCount === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={resetDraft}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
                    title="Clear all overrides"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                </>
              ) : (
                <span className="flex items-center gap-1 text-[11px] italic text-slate-400">
                  <Info size={11} />
                  No overrides — devices will use catalog defaults
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
              >
                <Save size={12} strokeWidth={2.5} />
                Apply Template
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Section helper — small headed container
// ============================================================
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {title}
      </p>
      {children}
      {hint && (
        <p className="text-[10px] italic leading-tight text-slate-400">{hint}</p>
      )}
    </div>
  );
}