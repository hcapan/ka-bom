"use client";
import { useMemo, useState } from "react";
import { ConfiguredDevice, Link, DeviceType } from "../lib/types";
import { LAYER_CONFIG, HARDWARE_LIBRARY } from "../lib/hardware";

type Props = {
  devices: ConfiguredDevice[];
  links: Link[];
  setDevices: (d: ConfiguredDevice[]) => void;
  setLinks: (l: Link[]) => void;
  onConfigureDevice?: (id: string) => void;
};

const TYPE_PREFIX: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
  wireless: "WL",
  management: "MGT",
};

function generateDeviceId(
  type: DeviceType,
  existing: ConfiguredDevice[]
): string {
  const prefix = TYPE_PREFIX[type] ?? "DEV";
  const nums = existing
    .filter((d) => d.id.startsWith(`${prefix}-`))
    .map((d) => {
      const m = d.id.match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
}

export default function DeviceListPanel({
  devices,
  links,
  setDevices,
  setLinks,
  onConfigureDevice,
}: Props) {
  // ============================================================
  // ADD DEVICE STATE
  // ============================================================
  const firstSeries = Object.keys(HARDWARE_LIBRARY)[0];
  const [newNode, setNewNode] = useState({
    name: "",
    series: firstSeries,
    pid: HARDWARE_LIBRARY[firstSeries].pids[0].pid,
  });

  const currentSeries = HARDWARE_LIBRARY[newNode.series];
  const currentPidObj = currentSeries.pids.find((p) => p.pid === newNode.pid);
  const previewType = currentSeries.type;
  const previewId = generateDeviceId(previewType, devices);

  const handleSeriesChange = (series: string) => {
    setNewNode({
      ...newNode,
      series,
      pid: HARDWARE_LIBRARY[series].pids[0].pid,
    });
  };

  const addNode = () => {
    if (!newNode.name.trim()) return;
    const series = HARDWARE_LIBRARY[newNode.series];
    const device: ConfiguredDevice = {
      id: generateDeviceId(series.type, devices),
      name: newNode.name.trim(),
      type: series.type,
      hardware: {
        series: newNode.series,
        chassisPid: newNode.pid,
      },
    };
    setDevices([...devices, device]);
    setNewNode({ ...newNode, name: "" });
  };

  const groupedSeries = Object.entries(HARDWARE_LIBRARY).reduce<
    Record<string, string[]>
  >((acc, [name, s]) => {
    const key = s.type.toUpperCase();
    acc[key] = acc[key] || [];
    acc[key].push(name);
    return acc;
  }, {});

  const layerOrder: DeviceType[] = [
    "security",
    "core",
    "distribution",
    "access",
    "wireless",
    "management",
  ];

  // ============================================================
  // DEVICE LIST STATE
  // ============================================================
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<DeviceType | "all">("all");

  const deleteDevice = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
    setLinks(links.filter((l) => l.from !== id && l.to !== id));
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (layerFilter !== "all" && d.type !== layerFilter) return false;
      if (!s) return true;
      return (
        d.name.toLowerCase().includes(s) ||
        d.id.toLowerCase().includes(s) ||
        d.hardware.chassisPid.toLowerCase().includes(s)
      );
    });
  }, [devices, search, layerFilter]);

  const layerCounts = useMemo(() => {
    const counts: Record<string, number> = { all: devices.length };
    for (const d of devices) {
      counts[d.type] = (counts[d.type] ?? 0) + 1;
    }
    return counts;
  }, [devices]);

  const layerChips: { value: DeviceType | "all"; label: string }[] = [
    { value: "all",          label: "All" },
    { value: "security",     label: "SEC" },
    { value: "core",         label: "CORE" },
    { value: "distribution", label: "DIST" },
    { value: "access",       label: "ACC" },
    { value: "wireless",     label: "WL" },
    { value: "management",   label: "MGT" },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <aside className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* ============================================ */}
      {/* SECTION 1: ADD DEVICE                        */}
      {/* ============================================ */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
          Add Device
        </p>
        <div className="space-y-2">
          <input
            placeholder="HOSTNAME"
            className="w-full border border-slate-200 p-1.5 rounded text-xs"
            value={newNode.name}
            onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNode();
            }}
          />

          <select
            className="w-full border border-slate-200 p-1.5 rounded text-xs"
            value={newNode.series}
            onChange={(e) => handleSeriesChange(e.target.value)}
          >
            {layerOrder
              .filter((layer) => groupedSeries[layer.toUpperCase()])
              .map((layer) => (
                <optgroup key={layer} label={layer.toUpperCase()}>
                  {groupedSeries[layer.toUpperCase()].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>

          <select
            className="w-full border border-slate-200 p-1.5 rounded text-xs font-mono"
            value={newNode.pid}
            onChange={(e) => setNewNode({ ...newNode, pid: e.target.value })}
          >
            {currentSeries.pids.map((p) => (
              <option key={p.pid} value={p.pid}>
                {p.pid}
              </option>
            ))}
          </select>

          {currentPidObj && (
            <p className="text-[10px] text-slate-400 italic leading-tight">
              {currentPidObj.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              ID:{" "}
              <span className="font-mono font-semibold text-slate-600">
                {previewId}
              </span>
            </span>
          </div>

          <button
            onClick={addNode}
            disabled={!newNode.name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add Device
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 2: DEVICE LIST                       */}
      {/* ============================================ */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Devices
          </p>
          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            {filtered.length}/{devices.length}
          </span>
        </div>

        <input
          type="text"
          placeholder="🔍 Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-200 p-1.5 rounded text-xs"
        />

        {/* Layer chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {layerChips
            .filter((c) => c.value === "all" || (layerCounts[c.value] ?? 0) > 0)
            .map((chip) => {
              const isActive = layerFilter === chip.value;
              const cfg =
                chip.value !== "all" ? LAYER_CONFIG[chip.value] : null;
              return (
                <button
                  key={chip.value}
                  onClick={() => setLayerFilter(chip.value)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                    isActive
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={
                    isActive && cfg
                      ? { background: cfg.color, borderColor: cfg.color }
                      : undefined
                  }
                >
                  {chip.label} ({layerCounts[chip.value] ?? 0})
                </button>
              );
            })}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 3: SCROLLABLE DEVICE LIST            */}
      {/* ============================================ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-400 italic">No devices yet</p>
            <p className="text-[10px] text-slate-300 mt-1">
              Use the form above to add one
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-2 text-center">
            No matches
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((d) => {
              const cfg = LAYER_CONFIG[d.type];
              return (
                <div
                  key={d.id}
                  className="group flex items-center gap-2 p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                  onClick={() => onConfigureDevice?.(d.id)}
                >
                  <span
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ background: cfg.color }}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs text-slate-800 truncate">
                      {d.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {d.id} · {d.hardware.chassisPid}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureDevice?.(d.id);
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                      title="Configure"
                    >
                      ⚙
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDevice(d.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}