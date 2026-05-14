"use client";
import { DeviceType } from "../../lib/hardware/catalog";
import { BundleStatus } from "./BundleStatusBadge";

export type LibraryFilterState = {
  search: string;
  layers: Set<DeviceType>;
  series: Set<string>;
  bundleStatus: Set<BundleStatus>;
};

type Props = {
  state: LibraryFilterState;
  onChange: (state: LibraryFilterState) => void;
  availableSeries: string[];
  counts: {
    layer: Record<DeviceType, number>;
    series: Record<string, number>;
    bundleStatus: Record<BundleStatus, number>;
  };
};

const LAYERS: { value: DeviceType; label: string; color: string }[] = [
  { value: "security", label: "Security", color: "#ef4444" },
  { value: "core", label: "Core", color: "#8b5cf6" },
  { value: "distribution", label: "Distribution", color: "#3b82f6" },
  { value: "access", label: "Access", color: "#22c55e" },
  { value: "wireless", label: "Wireless", color: "#f97316" },
  { value: "management", label: "Management", color: "#0ea5e9" },
];

const BUNDLE_STATUSES: { value: BundleStatus; label: string }[] = [
  { value: "complete", label: "✓ With Bundle" },
  { value: "faceplate-only", label: "⚠ Faceplate Only" },
  { value: "stub", label: "✕ Stub" },
];

export default function LibraryFilters({
  state,
  onChange,
  availableSeries,
  counts,
}: Props) {
  const toggleLayer = (layer: DeviceType) => {
    const next = new Set(state.layers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    onChange({ ...state, layers: next });
  };

  const toggleSeries = (series: string) => {
    const next = new Set(state.series);
    if (next.has(series)) {
      next.delete(series);
    } else {
      next.add(series);
    }
    onChange({ ...state, series: next });
  };

  const toggleStatus = (status: BundleStatus) => {
    const next = new Set(state.bundleStatus);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onChange({ ...state, bundleStatus: next });
  };

  const reset = () => {
    onChange({
      search: "",
      layers: new Set(LAYERS.map((l) => l.value)),
      series: new Set(availableSeries),
      bundleStatus: new Set(["complete", "faceplate-only", "stub"]),
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 sticky top-4">
      {/* Search */}
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Search
        </label>
        <input
          type="text"
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          placeholder="PID, series, license..."
          className="w-full mt-1 border border-slate-200 p-2 rounded text-sm"
        />
      </div>

      {/* Layer */}
      <FilterGroup title="Layer">
        {LAYERS.map((l) => (
          <FilterCheckbox
            key={l.value}
            label={l.label}
            count={counts.layer[l.value] ?? 0}
            checked={state.layers.has(l.value)}
            onChange={() => toggleLayer(l.value)}
            color={l.color}
          />
        ))}
      </FilterGroup>

      {/* Bundle Status */}
      <FilterGroup title="Bundle Status">
        {BUNDLE_STATUSES.map((s) => (
          <FilterCheckbox
            key={s.value}
            label={s.label}
            count={counts.bundleStatus[s.value] ?? 0}
            checked={state.bundleStatus.has(s.value)}
            onChange={() => toggleStatus(s.value)}
          />
        ))}
      </FilterGroup>

      {/* Series */}
      <FilterGroup title="Series">
        <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {availableSeries.map((s) => (
            <FilterCheckbox
              key={s}
              label={s}
              count={counts.series[s] ?? 0}
              checked={state.series.has(s)}
              onChange={() => toggleSeries(s)}
            />
          ))}
        </div>
      </FilterGroup>

      <button
        onClick={reset}
        className="w-full text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
  color,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  color?: string;
}) {
  return (
    <label className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 -mx-1 px-1 py-0.5 rounded">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="cursor-pointer"
        />
        {color && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color }}
          />
        )}
        <span className="text-slate-700">{label}</span>
      </span>
      <span className="text-slate-400 font-mono">({count})</span>
    </label>
  );
}
