"use client";
import { useState } from "react";
import { HARDWARE_LIBRARY, DeviceType } from "../lib/hardware";
import { Device, Link } from "../lib/types";
import InventoryPanel from "./InventoryPanel";
import CollapsibleSection from "./CollapsibleSection";

type Props = {
  devices: Device[];
  links: Link[];
  setDevices: (d: Device[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  setDefaultLinkSku: (s: string) => void;
};

const TOPOLOGY_SCHEMA_VERSION = 1;

const TYPE_PREFIX: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
};

function generateDeviceId(type: DeviceType, existing: Device[]): string {
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
}: Props) {
  const firstModel = Object.keys(HARDWARE_LIBRARY)[0];
  const [newNode, setNewNode] = useState({
    name: "",
    model: firstModel,
    sku: HARDWARE_LIBRARY[firstModel].skus[0],
  });

  // ✅ Live preview of the next ID
  const previewType = HARDWARE_LIBRARY[newNode.model].type as DeviceType;
  const previewId = generateDeviceId(previewType, devices);

  const addNode = () => {
    if (!newNode.name.trim()) return;

    const modelData = HARDWARE_LIBRARY[newNode.model];
    const type = modelData.type as DeviceType;

    const device: Device = {
      id: generateDeviceId(type, devices),
      name: newNode.name.trim(),
      model: newNode.model,
      sku: newNode.sku,
      type,
    };

    setDevices([...devices, device]);
    setNewNode({ ...newNode, name: "" });
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
        alert(
          `Could not import: ${err instanceof Error ? err.message : "error"}`
        );
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Add Device */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">
          Add Device
        </p>
        <div className="space-y-3">
          <input
            placeholder="HOSTNAME"
            className="w-full border border-slate-200 p-2 rounded text-sm"
            value={newNode.name}
            onChange={(e) =>
              setNewNode({ ...newNode, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") addNode();
            }}
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

{newNode.model && (
  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
    <p className="font-semibold text-slate-700">
      {HARDWARE_LIBRARY[newNode.model].ports}
    </p>
    <p className="mt-1 italic">
      {HARDWARE_LIBRARY[newNode.model].description}
    </p>
  </div>
)}
          {/* ✅ Live ID preview */}
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
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-700 truncate">
                    {d.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {d.id}
                  </span>
                </div>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold ml-2 flex-shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>


      

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

      <InventoryPanel devices={devices} links={links} />
    </div>
  );
}