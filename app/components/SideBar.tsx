"use client";
import { useState } from "react";
import { HARDWARE_LIBRARY, DeviceType } from "../lib/hardware";
import { ConfiguredDevice, Link } from "../lib/types";
import InventoryPanel from "./InventoryPanel";
import CollapsibleSection from "./CollapsibleSection";

type Props = {
  devices: ConfiguredDevice[];
  links: Link[];
  setDevices: (d: ConfiguredDevice[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  setDefaultLinkSku: (s: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
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

export default function Sidebar({
  devices,
  links,
  setDevices,
  setLinks,
  defaultLinkSku,
  setDefaultLinkSku,
  onExport,
  onImport,
  onReset,
}: Props) {
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

  // ============================================================
  // HANDLERS
  // ============================================================
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
      // license/smartnet inherit from globalDefaults at BOM time,
      // or get explicitly set in the Configure panel (Chunk 3)
    };

    setDevices([...devices, device]);
    setNewNode({ ...newNode, name: "" });
  };

  const deleteDevice = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
    setLinks(links.filter((l) => l.from !== id && l.to !== id));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (devices.length > 0 || links.length > 0) {
      if (!confirm("Replace your current topology?")) {
        e.target.value = "";
        return;
      }
    }
    onImport(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (devices.length === 0 && links.length === 0) return;
    if (confirm("Clear all devices and links?")) {
      onReset();
    }
  };

  // ============================================================
  // GROUPING for Series Selector
  // ============================================================
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
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* ADD DEVICE                                   */}
      {/* ============================================ */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">
          Add Device
        </p>
        <div className="space-y-3">
          {/* Hostname */}
          <input
            placeholder="HOSTNAME"
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.name}
            onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNode();
            }}
          />

          {/* Series selector */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500">
              Series
            </label>
            <select
              className="w-full border border-slate-200 p-2 rounded text-sm mt-1"
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
          </div>

          {/* Series description */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
            {currentSeries.description}
          </div>

          {/* PID selector */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500">
              Product (PID)
            </label>
            <select
              className="w-full border border-slate-200 p-2 rounded text-sm mt-1 font-mono"
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
              <p className="text-[10px] text-slate-400 mt-1">
                {currentPidObj.description}
              </p>
            )}
          </div>

          {/* Auto-generated ID preview */}
          <p className="text-[10px] text-slate-400">
            Auto ID:{" "}
            <span className="font-mono font-semibold text-slate-600">
              {previewId}
            </span>
          </p>

          {/* Add button */}
          <button
            onClick={addNode}
            disabled={!newNode.name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Device
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* DEFAULT LINK SKU                             */}
      {/* ============================================ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
          Default Link Type
        </p>
        <select
          className="w-full border border-slate-200 p-2 rounded text-sm"
          value={defaultLinkSku}
          onChange={(e) => setDefaultLinkSku(e.target.value)}
        >
          <optgroup label="100G">
            <option value="QSFP-100G-SR4">100G SR4 (Multi-mode)</option>
            <option value="QSFP-100G-LR4">100G LR4 (Single-mode)</option>
          </optgroup>
          <optgroup label="40G">
            <option value="QSFP-40G-SR4">40G SR4</option>
          </optgroup>
          <optgroup label="25G">
            <option value="SFP-25G-SR-S">25G SR</option>
          </optgroup>
          <optgroup label="10G">
            <option value="SFP-10G-SR">10G SR (Multi-mode)</option>
            <option value="SFP-10G-LR">10G LR (Single-mode)</option>
          </optgroup>
          <optgroup label="1G">
            <option value="GLC-SX-MMD">1G SX (Multi-mode)</option>
            <option value="GLC-LH-SMD">1G LH (Single-mode)</option>
          </optgroup>
        </select>
        <p className="text-[10px] text-slate-400 mt-2 italic">
          Used when you drag-connect nodes on the canvas.
        </p>
      </div>

      {/* ============================================ */}
      {/* DEVICE LIST                                  */}
      {/* ============================================ */}
      <CollapsibleSection
        title="Devices"
        count={devices.length}
        storageKey="devices"
      >
        {devices.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No devices yet</p>
        ) : (
          <div className="space-y-1">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center text-xs py-1 px-2 hover:bg-slate-50 rounded group"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-slate-700 truncate">
                    {d.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {d.id} · {d.hardware.chassisPid}
                  </span>
                </div>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold ml-2 shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ============================================ */}
      {/* FILE TOOLBAR                                 */}
      {/* ============================================ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">
          Topology File
        </p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={onExport}
            className="flex-1 text-xs py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold transition-colors"
          >
            ⬇ EXPORT
          </button>
          <label className="flex-1 text-xs py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold text-center cursor-pointer transition-colors">
            ⬆ IMPORT
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={handleReset}
          disabled={devices.length === 0 && links.length === 0}
          className="w-full text-xs py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🗑 RESET TOPOLOGY
        </button>
      </div>

      {/* ============================================ */}
      {/* INVENTORY                                    */}
      {/* ============================================ */}
      <InventoryPanel devices={devices} links={links} />
    </div>
  );
}