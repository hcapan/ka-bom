"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ProductSKU,
  DeviceType,
  getEffectiveCatalog,
} from "../lib/hardware/catalog";
import LibraryStats from "../components/library/LibraryStats";
import LibraryFilters, {
  LibraryFilterState,
} from "../components/library/LibraryFilters";
import LibraryTable from "../components/library/LibraryTable";
import PidDetailDrawer from "../components/library/PidDetailDrawer";
import {
  getBundleStatus,
  BundleStatus,
} from "../components/library/BundleStatusBadge";

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
  // Force-refresh counter for catalog overrides
  const [catalogVersion, setCatalogVersion] = useState(0);

  const catalog = useMemo(
    () => getEffectiveCatalog(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogVersion],
  );

  const availableSeries = useMemo(
    () => Object.keys(catalog).sort(),
    [catalog],
  );

  // Listen for override changes (cross-tab + same-tab)
  useEffect(() => {
    const bump = () => setCatalogVersion((v) => v + 1);

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("catalog-override")) {
        bump();
      }
    };

    const onOverrideUpdate = () => bump();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "ka-bom:catalog-overrides-updated",
      onOverrideUpdate,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "ka-bom:catalog-overrides-updated",
        onOverrideUpdate,
      );
    };
  }, []);

  // ⭐ Inverted-model filter state: track exclusions, not inclusions
  const [filterState, setFilterState] = useState<{
    search: string;
    layers: Set<DeviceType>;
    excludedSeries: Set<string>;
    bundleStatus: Set<BundleStatus>;
  }>(() => ({
    search: "",
    layers: new Set(ALL_LAYERS),
    excludedSeries: new Set<string>(),
    bundleStatus: new Set(ALL_STATUSES),
  }));

  // ⭐ Derive the public filter view during render (pure)
  const filters: LibraryFilterState = useMemo(
    () => ({
      search: filterState.search,
      layers: filterState.layers,
      series: new Set(
        availableSeries.filter((s) => !filterState.excludedSeries.has(s)),
      ),
      bundleStatus: filterState.bundleStatus,
    }),
    [filterState, availableSeries],
  );

  // ⭐ Adapter so LibraryFilters keeps its existing API
  const setFilters = useCallback(
    (
      next:
        | LibraryFilterState
        | ((prev: LibraryFilterState) => LibraryFilterState),
    ) => {
      setFilterState((prev) => {
        const prevView: LibraryFilterState = {
          search: prev.search,
          layers: prev.layers,
          series: new Set(
            availableSeries.filter((s) => !prev.excludedSeries.has(s)),
          ),
          bundleStatus: prev.bundleStatus,
        };

        const resolved = typeof next === "function" ? next(prevView) : next;

        const newExcluded = new Set(
          availableSeries.filter((s) => !resolved.series.has(s)),
        );

        return {
          search: resolved.search,
          layers: resolved.layers,
          excludedSeries: newExcluded,
          bundleStatus: resolved.bundleStatus,
        };
      });
    },
    [availableSeries],
  );

  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedPid, setSelectedPid] = useState<ProductSKU | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const counts = useMemo(() => {
    const layer: Record<DeviceType, number> = {} as Record<DeviceType, number>;
    const series: Record<string, number> = {};
    const bundleStatus: Record<BundleStatus, number> = {
      complete: 0,
      "faceplate-only": 0,
      stub: 0,
    };

    for (const [seriesName, s] of Object.entries(catalog)) {
      for (const pid of s.pids) {
        layer[s.type] = (layer[s.type] ?? 0) + 1;
        series[seriesName] = (series[seriesName] ?? 0) + 1;
        bundleStatus[getBundleStatus(pid)]++;
      }
    }

    return { layer, series, bundleStatus };
  }, [catalog]);

  const totalPidCount = useMemo(
    () => Object.values(counts.series).reduce((a, b) => a + b, 0),
    [counts.series],
  );

  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ka-bom-catalog-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [catalog]);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    setCatalogVersion((v) => v + 1);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedSeries(null);
    setSelectedPid(null);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-[1500px] mx-auto space-y-4">
        {/* ===== HEADER ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Hardware Library
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Browse and inspect the Cisco catalog used by KA-BOM
              <span className="ml-2 text-xs text-slate-400">
                ({availableSeries.length} series · {totalPidCount} PIDs)
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="text-xs py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
            >
              ⬇ Export Catalog JSON
            </button>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <LibraryStats key={catalogVersion} />

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
              key={catalogVersion}
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
        onClose={handleDrawerClose}
      />
    </main>
  );
}