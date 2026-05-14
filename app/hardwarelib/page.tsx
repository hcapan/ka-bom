"use client";

import { useMemo, useState } from "react";
import { HARDWARE_LIBRARY, ProductSKU, DeviceType } from "../lib/hardware/catalog";
import LibraryStats from "../components/library/LibraryStats";
import LibraryFilters, {
  LibraryFilterState,
} from "../components/library/LibraryFilters";
import LibraryTable from "../components/library/LibraryTable";
import PidDetailDrawer from "../components/library/PidDetailDrawer";
import JsonOverrideEditor from "../components/library/JsonOverrideEditor";
import { getBundleStatus, BundleStatus } from "../components/library/BundleStatusBadge";

const ALL_LAYERS: DeviceType[] = [
  "security",
  "core",
  "distribution",
  "access",
  "wireless",
  "management",
];
const ALL_STATUSES: BundleStatus[] = ["complete", "faceplate-only", "stub"];

export default function LibraryPage() {
  const availableSeries = useMemo(() => Object.keys(HARDWARE_LIBRARY), []);

  const [filters, setFilters] = useState<LibraryFilterState>({
    search: "",
    layers: new Set(ALL_LAYERS),
    series: new Set(availableSeries),
    bundleStatus: new Set(ALL_STATUSES),
  });

  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedPid, setSelectedPid] = useState<ProductSKU | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);

  // Compute counts (live-update with current filter state, except "self")
  const counts = useMemo(() => {
    const layer: Record<DeviceType, number> = {} as Record<DeviceType, number>;
    const series: Record<string, number> = {};
    const bundleStatus: Record<BundleStatus, number> = {
      complete: 0,
      "faceplate-only": 0,
      stub: 0,
    };

    for (const [seriesName, s] of Object.entries(HARDWARE_LIBRARY)) {
      for (const pid of s.pids) {
        layer[s.type] = (layer[s.type] ?? 0) + 1;
        series[seriesName] = (series[seriesName] ?? 0) + 1;
        bundleStatus[getBundleStatus(pid)]++;
      }
    }

    return { layer, series, bundleStatus };
  }, []);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(HARDWARE_LIBRARY, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ka-bom-catalog-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* ===== HEADER ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Hardware Library
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Browse and inspect the Cisco catalog used by KA-BOM
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditorOpen(true)}
              className="text-xs py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors"
            >
              ⚙ Edit Overrides (JSON)
            </button>
            <button
              onClick={handleExportJson}
              className="text-xs py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
            >
              ⬇ Export Catalog JSON
            </button>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <LibraryStats />

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside>
            <LibraryFilters
              state={filters}
              onChange={setFilters}
              availableSeries={availableSeries}
              counts={counts}
            />
          </aside>

          <section className="min-w-0">
            <LibraryTable
              filters={filters}
              onSelectPid={(seriesName, pid) => {
                setSelectedSeries(seriesName);
                setSelectedPid(pid);
              }}
            />
          </section>
        </div>
      </div>

      {/* ===== DRAWERS / MODALS ===== */}
      <PidDetailDrawer
        seriesName={selectedSeries}
        pid={selectedPid}
        onClose={() => {
          setSelectedSeries(null);
          setSelectedPid(null);
        }}
      />

      <JsonOverrideEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </main>
  );
}