"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, Library, RotateCcw, Loader2 } from "lucide-react";
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
const ALL_STATUSES: BundleStatus[] = [
  "complete",
  "faceplate-only",
  "linecard",
  "supervisor",
  "accessories",
  "stub",
];

export default function LibraryPage() {
  // Force-refresh counter for catalog overrides
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "done">(
    "idle",
  );

  const catalog = useMemo(
    () => getEffectiveCatalog(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogVersion],
  );

  const availableSeries = useMemo(() => Object.keys(catalog).sort(), [catalog]);

  // Listen for override changes (cross-tab + same-tab)
  useEffect(() => {
    const bump = () => setCatalogVersion((v) => v + 1);

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("catalog-override")) bump();
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

  // Inverted-model filter state: track exclusions, not inclusions
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

  // Derive the public filter view during render (pure)
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

  // Track whether any filter is "narrowed" from the default
  const isFiltered = useMemo(() => {
    return (
      filterState.search.trim() !== "" ||
      filterState.layers.size !== ALL_LAYERS.length ||
      filterState.excludedSeries.size > 0 ||
      filterState.bundleStatus.size !== ALL_STATUSES.length
    );
  }, [filterState]);

  // Adapter so LibraryFilters keeps its existing API
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

  const handleResetFilters = useCallback(() => {
    setFilterState({
      search: "",
      layers: new Set(ALL_LAYERS),
      excludedSeries: new Set<string>(),
      bundleStatus: new Set(ALL_STATUSES),
    });
  }, []);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName ?? "",
        )
      ) {
        const searchInput = document.querySelector<HTMLInputElement>(
          "[data-library-search]",
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedPid, setSelectedPid] = useState<ProductSKU | null>(null);

  const counts = useMemo(() => {
    const layer: Record<DeviceType, number> = {} as Record<DeviceType, number>;
    const series: Record<string, number> = {};
    const bundleStatus: Record<BundleStatus, number> = {
      complete: 0,
      "faceplate-only": 0,
      linecard: 0,
      accessories: 0,
      supervisor: 0,
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
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterState.search.trim() !== "") n++;
    if (filterState.layers.size !== ALL_LAYERS.length) n++;
    if (filterState.excludedSeries.size > 0) n++;
    if (filterState.bundleStatus.size !== ALL_STATUSES.length) n++;
    return n;
  }, [filterState]);

  const handleExportJson = useCallback(() => {
    setExportState("exporting");
    try {
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
      setExportState("done");
      setTimeout(() => setExportState("idle"), 1800);
    } catch {
      setExportState("idle");
    }
  }, [catalog]);

  const handleDrawerClose = useCallback(() => {
    setSelectedSeries(null);
    setSelectedPid(null);
  }, []);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 p-4 lg:p-6">
      <div className="max-w-375 mx-auto space-y-4">
        {/* ===== HEADER ===== */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-white/40">
              <Library size={22} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Hardware Library
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Browse and inspect the Cisco catalog used by CCW Canvas
              </p>
              {/* Status strip — separated from title for clarity */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                {/* Series count */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-slate-600 ring-1 ring-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="tabular-nums font-semibold text-slate-800">
                    {availableSeries.length}
                  </span>
                  <span className="text-slate-500">series</span>
                </span>

                {/* PID count */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-slate-600 ring-1 ring-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="tabular-nums font-semibold text-slate-800">
                    {totalPidCount}
                  </span>
                  <span className="text-slate-500">PIDs</span>
                </span>

                {/* Catalog health — % of PIDs with non-stub data */}
                {totalPidCount > 0 &&
                  (() => {
                    const healthyCount =
                      counts.bundleStatus.complete +
                      counts.bundleStatus["faceplate-only"] +
                      counts.bundleStatus.linecard +
                      counts.bundleStatus.supervisor +
                      counts.bundleStatus.accessories;
                    const stubCount = counts.bundleStatus.stub;
                    const healthRatio = healthyCount / totalPidCount;
                    const healthPct = Math.round(healthRatio * 100);

                    const dotColor =
                      healthRatio >= 0.95
                        ? "bg-emerald-500"
                        : healthRatio >= 0.75
                          ? "bg-amber-500"
                          : "bg-rose-500";

                    return (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-slate-600 ring-1 ring-slate-200"
                        title={
                          `Healthy (${healthyCount}): ` +
                          `complete ${counts.bundleStatus.complete} · ` +
                          `faceplate ${counts.bundleStatus["faceplate-only"]} · ` +
                          `linecard ${counts.bundleStatus.linecard} · ` +
                          `supervisor ${counts.bundleStatus.supervisor} · ` +
                          `accessories ${counts.bundleStatus.accessories}` +
                          (stubCount > 0
                            ? `\nStubs needing data: ${stubCount}`
                            : "")
                        }
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                        />
                        <span className="tabular-nums font-semibold text-slate-800">
                          {healthPct}%
                        </span>
                        <span className="text-slate-500">healthy</span>
                        {stubCount > 0 && (
                          <span className="ml-1 tabular-nums text-rose-600">
                            · {stubCount} stub{stubCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    );
                  })()}
                {/* Divider */}
                {isFiltered && (
                  <span className="mx-0.5 h-3 w-px bg-slate-300" aria-hidden />
                )}

                {/* Filter active indicator with count */}
                {isFiltered && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-800 ring-1 ring-amber-200">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                      </span>
                      <span className="tabular-nums font-semibold">
                        {activeFilterCount}
                      </span>
                      <span>
                        filter{activeFilterCount === 1 ? "" : "s"} active
                      </span>
                    </span>

                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300 transition-colors"
                      title="Clear all filters"
                    >
                      <RotateCcw size={10} strokeWidth={2.5} />
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              disabled={exportState === "exporting"}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-60"
            >
              {exportState === "exporting" ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
              ) : (
                <Download size={14} strokeWidth={2.5} />
              )}
              {exportState === "done"
                ? "Exported ✓"
                : exportState === "exporting"
                  ? "Exporting…"
                  : "Export Catalog JSON"}
            </button>
          </div>
        </header>

        {/* ===== STATS ===== */}
        <LibraryStats key={catalogVersion} />

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="lg:sticky lg:top-4 lg:self-start">
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
