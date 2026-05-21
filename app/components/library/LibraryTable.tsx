"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Info } from "lucide-react";
import {
  ProductSKU,
  DeviceType,
  getEffectiveCatalog,
} from "../../lib/hardware/catalog";
import BundleStatusBadge, { getBundleStatus } from "./BundleStatusBadge";
import { LibraryFilterState } from "./LibraryFilters";

type Props = {
  filters: LibraryFilterState;
  onSelectPid: (seriesName: string, pid: ProductSKU) => void;
};

type FlatRow = {
  seriesName: string;
  layer: DeviceType;
  vendor: string;
  pid: ProductSKU;
  opticCount: number; };

type SortKey = "series" | "pid" | "layer" | "ports" | "bundle" | "optics";
type SortDir = "asc" | "desc";

export default function LibraryTable({ filters, onSelectPid }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("series");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ⭐ Memoize catalog itself so it's stable across renders
  const catalog = useMemo(() => getEffectiveCatalog(), []);

  // ⭐ Flatten — now correctly depends on `catalog`
  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const [seriesName, series] of Object.entries(catalog)) {
      const opticCount = series.compatibleOptics.length;
      for (const pid of series.pids) {
        rows.push({
          seriesName,
          layer: series.type,
          vendor: series.vendor,
          pid,
          opticCount,
        });
      }
    }
    return rows;
  }, [catalog]);

  // ⭐ Filter — pure, all dependencies declared
  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (!filters.layers.has(row.layer)) return false;
      if (!filters.series.has(row.seriesName)) return false;
      if (!filters.bundleStatus.has(getBundleStatus(row.pid))) return false;

      if (search) {
        const haystack = [
          row.seriesName,
          row.pid.pid,
          row.pid.description ?? "",
          row.pid.bundle?.license.entitlementPid ?? "",
          ...Object.values(row.pid.bundle?.license.subscriptionByTerm ?? {}),
          ...Object.values(row.pid.bundle?.smartnet.baseSkuByTier ?? {}),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [allRows, filters]);

  // ⭐ Sort — no catalog access; uses pre-computed opticCount on row
  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "pid":
          av = a.pid.pid;
          bv = b.pid.pid;
          break;
        case "layer":
          av = a.layer;
          bv = b.layer;
          break;
        case "ports":
          av = a.pid.faceplate?.accessPorts?.count ?? 0;
          bv = b.pid.faceplate?.accessPorts?.count ?? 0;
          break;
        case "bundle":
          av = getBundleStatus(a.pid);
          bv = getBundleStatus(b.pid);
          break;
        case "optics":
          av = a.opticCount;
          bv = b.opticCount;
          break;
        case "series":
        default:
          av = a.seriesName;
          bv = b.seriesName;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-left text-[10px] uppercase font-bold text-slate-500 tracking-wider">

              
              <Th sortKey="series" current={sortKey} dir={sortDir} onSort={handleSort}>Series</Th>
              <Th sortKey="pid" current={sortKey} dir={sortDir} onSort={handleSort}>PID</Th>
              <Th sortKey="layer" current={sortKey} dir={sortDir} onSort={handleSort}>Layer</Th>
              <Th sortKey="ports" current={sortKey} dir={sortDir} onSort={handleSort}>Ports</Th>
              <Th>Description</Th>
              <Th sortKey="bundle" current={sortKey} dir={sortDir} onSort={handleSort}>Status</Th>
              <Th sortKey="optics" current={sortKey} dir={sortDir} onSort={handleSort}>Optics</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span className="text-2xl">🔍</span>
                    <p className="text-sm font-medium">No PIDs match the current filters</p>
                    <p className="text-[11px] text-slate-400">
                      Try clearing search or expanding the layer / series selection
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const fp = row.pid.faceplate;
                const portsLabel = fp?.accessPorts
                  ? `${fp.accessPorts.count}× ${fp.accessPorts.speed}` +
                    (fp.uplinkPorts
                      ? ` + ${fp.uplinkPorts.count}× ${fp.uplinkPorts.speed}`
                      : "")
                  : "—";

                return (
                  <tr
                    key={row.pid.pid}
                    onClick={() => onSelectPid(row.seriesName, row.pid)}
                    className="group border-b border-slate-100 hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                   
                    <td className="px-4 py-2 font-semibold text-slate-700 whitespace-nowrap">
                      {row.seriesName}
                    </td>
                    <td
                      className="px-4 py-2 font-mono text-slate-800 tabular-nums"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {row.pid.pid}
                    </td>
                     <td className="px-4 py-2">
                      {row.layer.toUpperCase()} 
                    </td>
                    
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap tabular-nums">
                      {portsLabel}
                    </td>
                    <td className="px-4 py-2 text-slate-500 truncate max-w-xs">
                      {row.pid.description}
                    </td>
                    <td className="px-4 py-2">
                      <BundleStatusBadge pid={row.pid} size="sm" />
                    </td>
                    <td className="px-4 py-2 text-slate-500 font-mono text-center tabular-nums">
                      {row.opticCount}
                    </td>
                    <td className="px-4 py-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Info size={14} strokeWidth={2.5} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          Showing <span className="font-semibold text-slate-700 tabular-nums">{sortedRows.length}</span>{" "}
          of <span className="font-semibold text-slate-700 tabular-nums">{allRows.length}</span> PIDs
        </span>
        {sortedRows.length !== allRows.length && (
          <span className="text-amber-600 font-medium">
            {allRows.length - sortedRows.length} hidden by filters
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

type ThProps = {
  children?: React.ReactNode;
  sortKey?: SortKey;
  current?: SortKey;
  dir?: SortDir;
  onSort?: (key: SortKey) => void;
};

function Th({ children, sortKey, current, dir, onSort }: ThProps) {
  const isSortable = !!sortKey && !!onSort;
  const isActive = isSortable && current === sortKey;

  return (
    <th
      onClick={isSortable ? () => onSort!(sortKey!) : undefined}
      className={`px-4 py-3 ${
        isSortable ? "cursor-pointer hover:bg-slate-100 select-none" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive &&
          (dir === "asc" ? (
            <ChevronUp size={11} strokeWidth={3} className="text-slate-700" />
          ) : (
            <ChevronDown size={11} strokeWidth={3} className="text-slate-700" />
          ))}
      </span>
    </th>
  );
}

const LAYER_COLORS: Record<DeviceType, { bg: string; text: string; ring: string }> = {
  security:     { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200" },
  core:         { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200" },
  distribution: { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200" },
  access:       { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  wireless:     { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200" },
  management:   { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
};

function LayerPill({ layer }: { layer: DeviceType }) {
  const cfg = LAYER_COLORS[layer];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      {layer}
    </span>
  );
}