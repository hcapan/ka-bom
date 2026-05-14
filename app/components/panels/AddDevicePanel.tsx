"use client";
import { useState } from "react";
import { HARDWARE_LIBRARY, DeviceType } from "../../lib/hardware/catalog";
import { ConfiguredDevice } from "../../lib/types";

type Props = {
  devices: ConfiguredDevice[];
  setDevices: (d: ConfiguredDevice[]) => void;
  onAdded?: () => void;
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
  existing: ConfiguredDevice[],
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

export default function AddDevicePanel({
  devices,
  setDevices,
  onAdded,
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
    onAdded?.();
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

  return (
    <div className="space-y-3">
      <input
        placeholder="HOSTNAME"
        className="w-full border border-slate-200 p-2 rounded text-sm"
        value={newNode.name}
        onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && addNode()}
        autoFocus
      />

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

      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
        {currentSeries.description}
      </div>

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

      <p className="text-[10px] text-slate-400">
        Auto ID:{" "}
        <span className="font-mono font-semibold text-slate-600">
          {previewId}
        </span>
      </p>

      <button
        onClick={addNode}
        disabled={!newNode.name.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Device
      </button>
    </div>
  );
}
