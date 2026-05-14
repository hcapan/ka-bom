"use client";
import { useMemo, useState } from "react";
import { HARDWARE_LIBRARY, ProductSKU, DeviceType } from "../../lib/hardware/catalog";
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
};

type SortKey = "series" | "pid" | "layer" | "ports" | "bundle" | "optics";
type SortDir = "asc" | "desc";

export default function LibraryTable({ filters, onSelectPid }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("series");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Flatten the catalog
  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const [seriesName, series] of Object.entries(HARDWARE_LIBRARY)) {
      for (const pid of series.pids) {
        rows.push({
          seriesName,
          layer: series.type,
          vendor: series.vendor,
          pid,
        });
      }
    }
    return rows;
  }, []);

  // Apply filters
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

  // Sort
  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "pid":    av = a.pid.pid;        bv = b.pid.pid;        break;
        case "layer":  av = a.layer;          bv = b.layer;          break;
        case "ports":
          av = a.pid.faceplate?.accessPorts?.count ?? 0;
          bv = b.pid.faceplate?.accessPorts?.count ?? 0;
          break;
        case "bundle":
          av = getBundleStatus(a.pid);
          bv = getBundleStatus(b.pid);
          break;
        case "optics":
          av = HARDWARE_LIBRARY[a.seriesName].compatibleOptics.length;
          bv = HARDWARE_LIBRARY[b.seriesName].compatibleOptics.length;
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
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr className="text-left text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <Th onClick={() => handleSort("series")}>Series{sortIndicator("series")}</Th>
              <Th onClick={() => handleSort("pid")}>PID{sortIndicator("pid")}</Th>
              <Th onClick={() => handleSort("layer")}>Layer{sortIndicator("layer")}</Th>
              <Th onClick={() => handleSort("ports")}>Ports{sortIndicator("ports")}</Th>
              <Th>Description</Th>
              <Th onClick={() => handleSort("bundle")}>Status{sortIndicator("bundle")}</Th>
              <Th onClick={() => handleSort("optics")}>Optics{sortIndicator("optics")}</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                  No PIDs match the current filters.
                </td>
              </tr>
            )}
            {sortedRows.map((row) => {
              const fp = row.pid.faceplate;
              const portsLabel = fp?.accessPorts
                ? `${fp.accessPorts.count}× ${fp.accessPorts.speed}` +
                  (fp.uplinkPorts
                    ? ` + ${fp.uplinkPorts.count}× ${fp.uplinkPorts.speed}`
                    : "")
                : "—";
              const opticCount = HARDWARE_LIBRARY[row.seriesName].compatibleOptics.length;

              return (
                <tr
                  key={row.pid.pid}
                  onClick={() => onSelectPid(row.seriesName, row.pid)}
                  className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 font-semibold text-slate-700">
                    {row.seriesName}
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-800">
                    {row.pid.pid}
                  </td>
                  <td className="px-4 py-2">
                    <LayerPill layer={row.layer} />
                  </td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {portsLabel}
                  </td>
                  <td className="px-4 py-2 text-slate-500 truncate max-w-xs">
                    {row.pid.description}
                  </td>
                  <td className="px-4 py-2">
                    <BundleStatusBadge pid={row.pid} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-center">
                    {opticCount}
                  </td>
                  <td className="px-4 py-2 text-blue-500 font-bold">ⓘ</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 italic">
        Showing {sortedRows.length} of {allRows.length} PIDs
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 ${onClick ? "cursor-pointer hover:bg-slate-100 select-none" : ""}`}
    >
      {children}
    </th>
  );
}

const LAYER_COLORS: Record<DeviceType, { bg: string; text: string }> = {
  security:     { bg: "bg-rose-50",     text: "text-rose-700"     },
  core:         { bg: "bg-violet-50",   text: "text-violet-700"   },
  distribution: { bg: "bg-blue-50",     text: "text-blue-700"     },
  access:       { bg: "bg-emerald-50",  text: "text-emerald-700"  },
  wireless:     { bg: "bg-orange-50",   text: "text-orange-700"   },
  management:   { bg: "bg-sky-50",      text: "text-sky-700"      },
};

function LayerPill({ layer }: { layer: DeviceType }) {
  const cfg = LAYER_COLORS[layer];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
    >
      {layer}
    </span>
  );
}