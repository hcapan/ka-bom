"use client";
import { useState } from "react";
import { HARDWARE_LIBRARY, DeviceType } from "../lib/hardware";
import { Device, Link } from "../lib/types";

type Props = {
  devices: Device[];
  links: Link[];
  setDevices: (d: Device[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  setDefaultLinkSku: (s: string) => void;
};

const TOPOLOGY_SCHEMA_VERSION = 1;

export default function Sidebar({
  devices,
  links,
  setDevices,
  setLinks,
  defaultLinkSku,
  setDefaultLinkSku,
}: Props) {
  const firstModel = Object.keys(HARDWARE_LIBRARY)[0];
  const [newNode, setNewNode] = useState({
    id: "",
    name: "",
    model: firstModel,
    sku: HARDWARE_LIBRARY[firstModel].skus[0],
  });

  const addNode = () => {
    if (!newNode.id || !newNode.name) return;
    const cleanId = newNode.id.toUpperCase().replace(/\s+/g, "_");

    if (devices.some((d) => d.id === cleanId)) {
      alert("A device with this ID already exists.");
      return;
    }

    const modelData = HARDWARE_LIBRARY[newNode.model];
    const device: Device = {
      id: cleanId,
      name: newNode.name,
      model: newNode.model,
      sku: newNode.sku,
      type: modelData.type as DeviceType,
    };

    setDevices([...devices, device]);
    setNewNode({ ...newNode, id: "", name: "" });
  };

  const deleteDevice = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
    setLinks(links.filter((l) => l.from !== id && l.to !== id));
  };

  const exportTopology = () => {
    if (devices.length === 0) {
      alert("Nothing to export — add some devices first.");
      return;
    }
    const data = {
      schemaVersion: TOPOLOGY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      devices,
      links,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTopology = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (devices.length > 0 || links.length > 0) {
      if (!confirm("Replace your current topology?")) {
        e.target.value = "";
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (!Array.isArray(data.devices) || !Array.isArray(data.links)) {
          throw new Error("Invalid file structure.");
        }
        setDevices(data.devices);
        setLinks(data.links);
      } catch (err) {
        alert(`Could not import: ${err instanceof Error ? err.message : "error"}`);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* File Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">
          Topology File
        </p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={exportTopology}
            className="flex-1 text-xs py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold transition-colors"
          >
            ⬇ EXPORT
          </button>
          <label className="flex-1 text-xs py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold text-center cursor-pointer transition-colors">
            ⬆ IMPORT
            <input
              type="file"
              accept=".json"
              onChange={importTopology}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={() => {
            if (devices.length === 0 && links.length === 0) return;
            if (confirm("Clear all devices and links?")) {
              setDevices([]);
              setLinks([]);
            }
          }}
          disabled={devices.length === 0 && links.length === 0}
          className="w-full text-xs py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🗑 RESET TOPOLOGY
        </button>
      </div>

      {/* Add Device */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">
          Add Device
        </p>
        <div className="space-y-3">
          <input
            placeholder="UNIQUE ID"
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.id}
            onChange={(e) => setNewNode({ ...newNode, id: e.target.value })}
          />
          <input
            placeholder="HOSTNAME"
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.name}
            onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
          />
          <select
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.model}
            onChange={(e) =>
              setNewNode({
                ...newNode,
                model: e.target.value,
                sku: HARDWARE_LIBRARY[e.target.value].skus[0],
              })
            }
          >
            {Object.keys(HARDWARE_LIBRARY).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.sku}
            onChange={(e) => setNewNode({ ...newNode, sku: e.target.value })}
          >
            {HARDWARE_LIBRARY[newNode.model].skus.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={addNode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold transition-colors"
          >
            Add Device
          </button>
        </div>
      </div>

      {/* Default Link SKU */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
          Default Link Type
        </p>
        <select
          className="w-full border border-slate-200 p-2 rounded text-sm"
          value={defaultLinkSku}
          onChange={(e) => setDefaultLinkSku(e.target.value)}
        >
          <option value="QSFP-40G-SR4">40G QSFP</option>
          <option value="SFP-10G-SR">10G SFP+</option>
        </select>
        <p className="text-[10px] text-slate-400 mt-2 italic">
          Used when you drag-connect nodes on the canvas.
        </p>
      </div>

      {/* Device List */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
          Devices ({devices.length})
        </p>
        {devices.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No devices yet</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center text-xs py-1 px-2 hover:bg-slate-50 rounded group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-700 truncate">
                    {d.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{d.id}</span>
                </div>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold ml-2"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}