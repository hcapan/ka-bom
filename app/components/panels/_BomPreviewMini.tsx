"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildBOM, type BOMLine } from "@/app/lib/bom";
import type { ConfiguredDevice, Project } from "@/app/lib/types";
import { BomPreviewIcon, ChevronRightIcon } from "../ui/icons";

const CATEGORY_LABELS: Record<BOMLine["category"], string> = {
  chassis: "Chassis",
  psu: "PSU",
  "power-cord": "Power Cord",
  "auto-included": "Auto-Inc.",
  "license-entitlement": "Lic. Ent.",
  "license-subscription": "Lic. Sub.",
  smartnet: "SmartNet",
  "stack-cable": "Stack Cbl.",
  "stack-power": "Stack Pwr.",
  "stack-adapter": "Stack Adpt.",
  optic: "Optic",
  other: "Other",
  supervisor: "Supervisor",
  linecard: "Linecard",
  fan: "Fan",
  ssd: "SSD",
  "fabric-module": "FabricModule",
};

/**
 * Filter BOM lines that belong to a specific device.
 *
 * BOMLine in this project may carry either:
 *   - `deviceId` (newer)
 *   - `chassisContext` (CCW-aggregation context, often equals device.id or chassis PID)
 *
 * We try both, then fall back to matching the device's own chassisPid as partNumber.
 */
function filterLinesForDevice(
  lines: BOMLine[],
  device: ConfiguredDevice,
): BOMLine[] {
  const byDeviceId = lines.filter(
    (l) => (l as unknown as { deviceId?: string }).deviceId === device.id,
  );
  if (byDeviceId.length > 0) return byDeviceId;

  const byContext = lines.filter(
    (l) =>
      (l as unknown as { chassisContext?: string }).chassisContext ===
      device.id,
  );
  if (byContext.length > 0) return byContext;

  // Last resort: match by chassis PID (will over-match in stacks of identical
  // switches, but that's still useful as a "summary" hint).
  return lines.filter((l) => l.partNumber === device.hardware.chassisPid);
}

export function BomPreviewMini({
  project,
  device,
}: {
  project: Project;
  device: ConfiguredDevice;
}) {
  const [open, setOpen] = useState(false);

  const { deviceLines, totalQty, byCategory } = useMemo(() => {
    let lines: BOMLine[] = [];
    try {
      const built = buildBOM(project);
      lines = filterLinesForDevice(built.lines, device);
    } catch {
      lines = [];
    }
    const total = lines.reduce((sum, l) => sum + l.quantity, 0);
    const grouped: Partial<Record<BOMLine["category"], number>> = {};
    for (const l of lines) {
      grouped[l.category] = (grouped[l.category] ?? 0) + l.quantity;
    }
    return { deviceLines: lines, totalQty: total, byCategory: grouped };
  }, [project, device]);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          flex w-full items-center justify-between gap-2
          px-3 py-2 text-left
          transition-colors hover:bg-sky-50
        "
      >
        <div className="flex items-center gap-2 min-w-0">
          <BomPreviewIcon
            size={14}
            className="text-cisco-blue-700"
            aria-hidden
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
            BOM Preview
          </span>
          <span
            className="
              rounded-full bg-white/80 ring-1 ring-inset ring-sky-200
              px-2 py-0.5 text-[10px] font-semibold text-sky-700
            "
          >
            {deviceLines.length} line{deviceLines.length === 1 ? "" : "s"}
            <span className="mx-1 text-sky-300">·</span>
            {totalQty} qty
          </span>
        </div>

        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="text-sky-400 text-xs"
          aria-hidden
        >
          <ChevronRightIcon size={14} strokeWidth={2.5} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-sky-100 px-3 py-2.5">
              {/* Category breakdown */}
              {Object.keys(byCategory).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(byCategory).map(([cat, qty]) => (
                    <span
                      key={cat}
                      className="
                        rounded bg-white/80 ring-1 ring-inset ring-slate-200
                        px-1.5 py-0.5
                        text-[9px] font-semibold text-slate-600
                      "
                    >
                      {CATEGORY_LABELS[cat as BOMLine["category"]]}
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="font-mono text-slate-800">{qty}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Top 8 lines */}
              {deviceLines.length > 0 ? (
                <ul className="space-y-1">
                  {deviceLines.slice(0, 8).map((l, i) => (
                    <li
                      key={`${l.partNumber}-${i}`}
                      className="flex items-center justify-between gap-2 text-[10px]"
                    >
                      <span className="font-mono text-slate-700 truncate">
                        {l.partNumber}
                      </span>
                      <span className="font-mono text-slate-500 shrink-0">
                        ×{l.quantity}
                        {l.durationMonths ? ` · ${l.durationMonths}mo` : ""}
                      </span>
                    </li>
                  ))}
                  {deviceLines.length > 8 && (
                    <li className="text-[10px] italic text-slate-400">
                      +{deviceLines.length - 8} more line(s) — see full BOM
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-[10px] italic text-slate-500">
                  No lines attributed to this device.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
