"use client";
import { useMemo, useState } from "react";
import { buildBOM, sortBOMLines, BOMLine,downloadCCWExcel,getExportFilename } from "../../lib/bom";
import { Project } from "../../lib/types";

type Props = {
  project: Project;
};

const CATEGORY_LABELS: Record<BOMLine["category"], string> = {
  chassis: "Chassis",
  psu: "Power Supply",
  "power-cord": "Power Cord",
  "auto-included": "Auto-Included",
  "license-entitlement": "License Entitlement",
  "license-subscription": "License Subscription",
  smartnet: "SmartNet",
  "stack-cable": "Stack Cable",
  "stack-power": "Stack Power",
  "stack-adapter": "Stack Adapter",
  "stack-kit": "Stack Kit",
  optic: "Optic",
  other: "Other",
   supervisor:"Supervisor", 
   linecard:"Linecard", 
   fan:"Fan", 
   ssd:"SSD", 
   "fabric-module":"Fabric Module"
};

const CATEGORY_COLORS: Record<BOMLine["category"], string> = {
  chassis: "bg-violet-50 text-violet-700",
  psu: "bg-amber-50 text-amber-700",
  "power-cord": "bg-amber-50 text-amber-700",
  "auto-included": "bg-slate-100 text-slate-600",
  "license-entitlement": "bg-blue-50 text-blue-700",
  "license-subscription": "bg-blue-50 text-blue-700",
  smartnet: "bg-emerald-50 text-emerald-700",
  "stack-cable": "bg-purple-50 text-purple-700",
  "stack-power": "bg-purple-50 text-purple-700",
  "stack-adapter": "bg-purple-50 text-purple-700",
  "stack-kit" : "bg-purple-50 text-purple-700",
  optic: "bg-cyan-50 text-cyan-700",
  other: "bg-slate-100 text-slate-600",
   supervisor: "bg-rose-50 text-rose-700",
  linecard: "bg-indigo-50 text-indigo-700",
  fan: "bg-sky-50 text-sky-700",
  ssd: "bg-lime-50 text-lime-700",
  "fabric-module": "bg-fuchsia-50 text-fuchsia-700"
};

export default function BomPreviewPanel({ project }: Props) {
  const result = useMemo(() => {
    const r = buildBOM(project);
    return { ...r, lines: sortBOMLines(r.lines) };
  }, [project]);

  const [showWarnings, setShowWarnings] = useState(true);

  const handleExport = () => {
    try {
      downloadCCWExcel(result.lines, project);
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const filename = getExportFilename(project);

  return (
    <div className="space-y-3">
      {/* ===== Stats ===== */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Devices" value={result.stats.totalDevices} />
        <Stat label="Lines" value={result.stats.totalLines} />
        <Stat label="Unique SKUs" value={result.stats.uniqueSkus} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="With Bundle"
          value={result.stats.devicesWithBundle}
          color="text-emerald-600"
        />
        <Stat
          label="Without Bundle"
          value={result.stats.devicesWithoutBundle}
          color={
            result.stats.devicesWithoutBundle > 0
              ? "text-amber-600"
              : "text-slate-500"
          }
        />
      </div>

      {/* ===== Warnings ===== */}
      {result.warnings.length > 0 && (
        <div className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full px-3 py-2 text-left text-xs font-bold text-amber-800 flex justify-between items-center hover:bg-amber-100"
          >
            <span>⚠ {result.warnings.length} warning(s)</span>
            <span>{showWarnings ? "▼" : "▶"}</span>
          </button>
          {showWarnings && (
            <ul className="px-3 pb-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {result.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-[11px] text-amber-700 leading-tight"
                >
                  • {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ===== Lines table ===== */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="px-2 py-2">PID</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2">Mo</th>
              <th className="px-2 py-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-6 text-center text-slate-400 italic"
                >
                  No BOM lines — add devices first.
                </td>
              </tr>
            )}
            {result.lines.map((line, i) => (
              <tr
                key={`${line.partNumber}-${i}`}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="px-2 py-1.5 font-mono text-[11px] text-slate-800">
                  {line.partNumber}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                  {line.quantity}
                </td>
                <td className="px-2 py-1.5 text-slate-500 font-mono text-[10px]">
                  {line.durationMonths ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[line.category]}`}
                  >
                    {CATEGORY_LABELS[line.category]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== EXPORT BUTTON (NEW) ===== */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <button
          onClick={handleExport}
          disabled={result.lines.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          📊 Download BOM (CCW Excel)
        </button>
        <p className="text-[10px] text-slate-400 text-center font-mono truncate">
          {filename}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-slate-700",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded p-2">
      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
        {label}
      </p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}