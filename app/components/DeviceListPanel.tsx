"use client";
import { useMemo, useState } from "react";
import { ConfiguredDevice, Link, DeviceType, NamingConfig } from "../lib/types";
import { LAYER_CONFIG, HARDWARE_LIBRARY } from "../lib/hardware";
import { generateHostname, PATTERN_TOKENS } from "../lib/utils/nameGenerator";
import { createBulkDevices } from "../lib/utils/bulkCreate";

type Props = {
  devices: ConfiguredDevice[];
  links: Link[];
  setDevices: (d: ConfiguredDevice[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  setDefaultLinkSku: (sku: string) => void;
  naming: NamingConfig;
  setNaming: (cfg: NamingConfig) => void;
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

export default function DeviceListPanel({
  devices,
  links,
  setDevices,
  setLinks,
  defaultLinkSku,
  setDefaultLinkSku,
  naming,
  setNaming,
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

  // ============================================================
  // BULK MODE STATE
  // ============================================================
  const [bulkMode, setBulkMode] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [uplinkTargets, setUplinkTargets] = useState<
    Map<string, { linkCount: number; opticPid: string }>
  >(new Map());

  const [showPatternHelp, setShowPatternHelp] = useState(false);

  const currentSeries = HARDWARE_LIBRARY[newNode.series];
  const currentPidObj = currentSeries.pids.find((p) => p.pid === newNode.pid);
  const previewType = currentSeries.type;
  const previewId = generateDeviceId(previewType, devices);

  // ✅ Live auto-generated hostname (when enabled)
  const autoName = useMemo(
    () =>
      naming.autoEnabled
        ? generateHostname(naming.pattern, previewType, newNode.series, devices)
        : "",
    [naming, previewType, newNode.series, devices],
  );

  const handleSeriesChange = (series: string) => {
    setNewNode({
      ...newNode,
      series,
      pid: HARDWARE_LIBRARY[series].pids[0].pid,
    });
  };

  const addNode = () => {
    // === Single-device path (no bulk mode, or qty=1) ===
    if (!bulkMode || quantity === 1) {
      const finalName = naming.autoEnabled ? autoName : newNode.name.trim();
      if (!finalName) return;

      const series = HARDWARE_LIBRARY[newNode.series];
      const device: ConfiguredDevice = {
        id: generateDeviceId(series.type, devices),
        name: finalName,
        type: series.type,
        hardware: {
          series: newNode.series,
          chassisPid: newNode.pid,
        },
      };

      // If bulkMode is on and there are uplinks, create those too
      const bulkLinks: Link[] = [];
      if (bulkMode && uplinkTargets.size > 0) {
        for (const [targetId, cfg] of uplinkTargets) {
          for (let i = 0; i < cfg.linkCount; i++) {
            bulkLinks.push({
              id: `LNK-${Date.now()}-${i}-${targetId}-${Math.random()
                .toString(36)
                .slice(2, 6)}`,
              from: device.id,
              to: targetId,
              optic: { pid: cfg.opticPid },
            });
          }
        }
      }

      setDevices([...devices, device]);
      if (bulkLinks.length > 0) {
        setLinks([...links, ...bulkLinks]);
      }

      if (!naming.autoEnabled) {
        setNewNode({ ...newNode, name: "" });
      }
      return;
    }

    // === Bulk path (qty > 1, requires auto-name) ===
    if (!naming.autoEnabled) return;

    const series = HARDWARE_LIBRARY[newNode.series];
    const result = createBulkDevices(
      {
        series: newNode.series,
        chassisPid: newNode.pid,
        type: series.type,
        quantity,
        uplinks: Array.from(uplinkTargets.entries()).map(([targetId, cfg]) => ({
          targetDeviceId: targetId,
          opticPid: cfg.opticPid,
          linkCount: cfg.linkCount,
        })),
      },
      devices,
      links,
      naming,
    );

    setDevices([...devices, ...result.newDevices]);
    if (result.newLinks.length > 0) {
      setLinks([...links, ...result.newLinks]);
    }
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
    { value: "all", label: "All" },
    { value: "security", label: "SEC" },
    { value: "core", label: "CORE" },
    { value: "distribution", label: "DIST" },
    { value: "access", label: "ACC" },
    { value: "wireless", label: "WL" },
    { value: "management", label: "MGT" },
  ];

  const toggleUplinkTarget = (deviceId: string) => {
    setUplinkTargets((prev) => {
      const next = new Map(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.set(deviceId, { linkCount: 1, opticPid: defaultLinkSku });
      }
      return next;
    });
  };

  const updateUplinkCount = (deviceId: string, linkCount: number) => {
    setUplinkTargets((prev) => {
      const next = new Map(prev);
      const existing = next.get(deviceId);
      if (existing) {
        next.set(deviceId, { ...existing, linkCount: Math.max(1, linkCount) });
      }
      return next;
    });
  };

  // Devices that can be uplink targets (not the layer being added to)
  const availableUplinkTargets = devices.filter(
    (d) => d.type !== currentSeries.type,
  );

  const totalLinks = Array.from(uplinkTargets.values()).reduce(
    (sum, u) => sum + u.linkCount,
    0,
  );
  const grandTotalLinks = quantity * totalLinks;

  // Check if bulk mode requirements are met
  const canSubmitBulk =
    bulkMode &&
    naming.autoEnabled &&
    quantity >= 1 &&
    (quantity === 1 || naming.autoEnabled);

  // Determine if Add button should be disabled
  const canAdd = naming.autoEnabled
    ? autoName.trim().length > 0
    : newNode.name.trim().length > 0;

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
          {/* Hostname input (read-only when auto-name enabled) */}
          <input
            placeholder={
              naming.autoEnabled ? autoName || "Pattern preview…" : "HOSTNAME"
            }
            className={`w-full border border-slate-200 p-1.5 rounded text-xs ${
              naming.autoEnabled
                ? "bg-slate-100 text-slate-500 italic cursor-not-allowed"
                : ""
            }`}
            value={naming.autoEnabled ? autoName : newNode.name}
            readOnly={naming.autoEnabled}
            onChange={(e) =>
              !naming.autoEnabled &&
              setNewNode({ ...newNode, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAdd) addNode();
            }}
          />

          {/* Auto-name controls */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={naming.autoEnabled}
                onChange={(e) =>
                  setNaming({ ...naming, autoEnabled: e.target.checked })
                }
                className="cursor-pointer"
              />
              Auto-name
            </label>
            {naming.autoEnabled && (
              <button
                onClick={() => setShowPatternHelp(!showPatternHelp)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                Pattern ⓘ
              </button>
            )}
          </div>

          {/* Pattern editor (visible when auto-name is on) */}
          {naming.autoEnabled && (
            <>
              <input
                type="text"
                value={naming.pattern}
                onChange={(e) =>
                  setNaming({ ...naming, pattern: e.target.value })
                }
                placeholder="{LAYER}-{NN}"
                className="w-full border border-slate-200 p-1.5 rounded text-xs font-mono"
              />
              {showPatternHelp && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
                  <p className="text-[10px] font-bold text-blue-800 mb-1">
                    Available tokens:
                  </p>
                  {PATTERN_TOKENS.map((t) => (
                    <p
                      key={t.token}
                      className="text-[10px] text-slate-700 leading-tight"
                    >
                      <span className="font-mono font-bold text-blue-700">
                        {t.token}
                      </span>{" "}
                      — {t.desc}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Series selector */}
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

          {/* PID selector */}
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

          {/* ============================================ */}
          {/* BULK MODE TOGGLE                             */}
          {/* ============================================ */}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => {
                  setBulkMode(e.target.checked);
                  if (!e.target.checked) {
                    setQuantity(1);
                    setUplinkTargets(new Map());
                  }
                }}
                className="cursor-pointer"
              />
              <span className="font-semibold">Bulk Mode</span>
              <span className="text-slate-400">— add multiple + auto-link</span>
            </label>
          </div>

          {bulkMode && (
            <div className="space-y-2 bg-blue-50 border border-blue-200 rounded p-2">
              {/* Quantity */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  Quantity
                </label>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="flex-1 border border-slate-200 p-1 rounded text-xs text-center font-mono"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 font-bold"
                  >
                    +
                  </button>
                </div>
                {!naming.autoEnabled && quantity > 1 && (
                  <p className="text-[10px] text-amber-700 italic mt-1">
                    ⚠ Enable Auto-name above to add multiple devices
                  </p>
                )}
              </div>

              {/* Uplinks */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  Uplink To ({uplinkTargets.size} selected)
                </label>
                {availableUplinkTargets.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic mt-1">
                    No other devices yet — add cores first to enable
                    auto-uplinks
                  </p>
                ) : (
                  <div className="mt-1 max-h-40 overflow-y-auto custom-scrollbar space-y-1 bg-white border border-slate-200 rounded p-1">
                    {availableUplinkTargets.map((target) => {
                      const cfg = uplinkTargets.get(target.id);
                      const isChecked = !!cfg;
                      const targetCfg = LAYER_CONFIG[target.type];
                      return (
                        <div
                          key={target.id}
                          className={`flex items-center gap-1.5 p-1 rounded text-[10px] ${
                            isChecked ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleUplinkTarget(target.id)}
                            className="cursor-pointer"
                          />
                          <span
                            className="w-1.5 h-4 rounded-full shrink-0"
                            style={{ background: targetCfg.color }}
                          />
                          <span className="font-semibold text-slate-700 flex-1 truncate">
                            {target.name}
                          </span>
                          {isChecked && (
                            <>
                              <span className="text-slate-400">×</span>
                              <input
                                type="number"
                                min={1}
                                max={8}
                                value={cfg!.linkCount}
                                onChange={(e) =>
                                  updateUplinkCount(
                                    target.id,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className="w-10 border border-slate-200 rounded p-0.5 text-center text-[10px] font-mono"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live preview of what'll happen */}
              {(quantity > 1 || uplinkTargets.size > 0) && (
                <div className="text-[10px] text-slate-700 bg-white border border-slate-200 rounded p-2 leading-tight">
                  <p className="font-semibold mb-0.5">Will create:</p>
                  <p>
                    • {quantity} device{quantity !== 1 ? "s" : ""}
                  </p>
                  {grandTotalLinks > 0 && (
                    <p>
                      • {grandTotalLinks} link{grandTotalLinks !== 1 ? "s" : ""}{" "}
                      ({quantity} × {totalLinks} per device)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={addNode}
            disabled={
              !canAdd || (bulkMode && quantity > 1 && !naming.autoEnabled)
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add {bulkMode && quantity > 1 ? `${quantity} Devices` : "Device"}
            {bulkMode && grandTotalLinks > 0
              ? ` + ${grandTotalLinks} Links`
              : ""}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 1B: DEFAULT LINK OPTIC               */}
      {/* ============================================ */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Link Optic
          </p>
          <SpeedBadge sku={defaultLinkSku} />
        </div>
        <select
          value={defaultLinkSku}
          onChange={(e) => setDefaultLinkSku(e.target.value)}
          className="w-full border border-slate-200 p-1.5 rounded text-xs font-mono"
        >
          <optgroup label="100G">
            <option value="QSFP-100G-SR4">QSFP-100G-SR4 (Multi-mode)</option>
            <option value="QSFP-100G-LR4">QSFP-100G-LR4 (Single-mode)</option>
          </optgroup>
          <optgroup label="40G">
            <option value="QSFP-40G-SR4">QSFP-40G-SR4</option>
          </optgroup>
          <optgroup label="25G">
            <option value="SFP-25G-SR-S">SFP-25G-SR-S</option>
          </optgroup>
          <optgroup label="10G">
            <option value="SFP-10G-SR">SFP-10G-SR (Multi-mode)</option>
            <option value="SFP-10G-LR">SFP-10G-LR (Single-mode)</option>
          </optgroup>
          <optgroup label="1G">
            <option value="GLC-SX-MMD">GLC-SX-MMD (Multi-mode)</option>
            <option value="GLC-LH-SMD">GLC-LH-SMD (Single-mode)</option>
          </optgroup>
        </select>
        <p className="text-[10px] text-slate-400 italic mt-1">
          Used when drag-connecting nodes
        </p>
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

// ============================================================
// SPEED BADGE — visual indicator matching canvas edge color
// ============================================================
function SpeedBadge({ sku }: { sku: string }) {
  const { label, color } = getSpeedInfo(sku);
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{
        background: `${color}15`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}

function getSpeedInfo(sku: string): { label: string; color: string } {
  if (sku.includes("400G")) return { label: "400G", color: "#ec4899" };
  if (sku.includes("100G")) return { label: "100G", color: "#9333ea" };
  if (sku.includes("40G")) return { label: "40G", color: "#7c3aed" };
  if (sku.includes("25G")) return { label: "25G", color: "#06b6d4" };
  if (sku.includes("10G")) return { label: "10G", color: "#0ea5e9" };
  if (sku.includes("1G") || sku.startsWith("GLC")) {
    return { label: "1G", color: "#64748b" };
  }
  return { label: "?", color: "#94a3b8" };
}
