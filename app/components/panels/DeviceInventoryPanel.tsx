"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ConfiguredDevice,
  Link,
  DeviceType,
  DeviceGroup,
} from "../../lib/types";
import { LAYER_CONFIG } from "../../lib/hardware/catalog";
import { validateStackComposition } from "@/app/lib/utils/stackValidation";
import { useProject } from "@/app/lib/storage";
import {
  ConfigureIcon,
  SearchIcon,
  DeleteIcon,
  ChevronRightIcon,
} from "../ui/icons";

type Props = {
  devices: ConfiguredDevice[];
  links: Link[];
  setDevices: (d: ConfiguredDevice[]) => void;
  setLinks: (l: Link[]) => void;
  groups: DeviceGroup[];
  onConfigureDevice?: (id: string) => void;
  defaultLinkSku: string;
  setDefaultLinkSku: (sku: string) => void;
};

export default function DeviceInventoryPanel({
  devices,
  links,
  setDevices,
  setLinks,
  groups,
  onConfigureDevice,
  defaultLinkSku,
  setDefaultLinkSku,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<DeviceType | "all">("all");
  const [opticExpanded, setOpticExpanded] = useState(false);

  const { createStackFromDevices } = useProject();

  const selectedDevices = useMemo(() => {
    return selectedIds
      .map((id) => devices.find((d) => d.id === id))
      .filter((d): d is ConfiguredDevice => d !== undefined);
  }, [selectedIds, devices]);

  const canStackSelection = useMemo(() => {
    if (selectedDevices.length < 2) return false;
    return validateStackComposition(selectedDevices).canStack;
  }, [selectedDevices]);

  const handleGroupAsStack = useCallback(() => {
    if (selectedIds.length < 2) {
      alert("Select at least 2 devices to create a stack");
      return;
    }
    createStackFromDevices(
      selectedIds,
      `Stack-${Date.now().toString().slice(-4)}`,
    );
    setSelectedIds([]);
  }, [selectedIds, createStackFromDevices]);

  const toggleDeviceSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const clearSelection = () => setSelectedIds([]);

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
    for (const d of devices) counts[d.type] = (counts[d.type] ?? 0) + 1;
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

  return (
    <aside
      className="
        flex h-full flex-col overflow-hidden
        rounded-xl border border-slate-200 bg-white shadow-sm
      "
    >
      {/* ════════════════════════════════════════════════════════ */}
      {/* OPTIC SELECTION (collapsible)                             */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-200 bg-white">
        <button
          onClick={() => setOpticExpanded((v) => !v)}
          className="
            flex w-full items-center justify-between gap-2 px-3 py-2
            text-left transition-colors hover:bg-slate-50
          "
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Optic Selection
            </span>
            <span className="truncate font-mono text-[11px] text-slate-700">
              {defaultLinkSku}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SpeedBadge sku={defaultLinkSku} />
            <motion.span
              animate={{ rotate: opticExpanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              className="text-xs text-slate-400"
              aria-hidden
            >
              <ChevronRightIcon size={14} strokeWidth={2.5} />
            </motion.span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {opticExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                <select
                  value={defaultLinkSku}
                  onChange={(e) => setDefaultLinkSku(e.target.value)}
                  className="
                    w-full rounded-md border border-slate-300 bg-white px-2 py-1.5
                    font-mono text-xs
                    focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
                  "
                >
                  <optgroup label="100G">
                    <option value="QSFP-100G-SR4">
                      QSFP-100G-SR4 (Multi-mode)
                    </option>
                    <option value="QSFP-100G-LR4">
                      QSFP-100G-LR4 (Single-mode)
                    </option>
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
                <p className="mt-1 text-[10px] italic text-slate-400">
                  Used when drag-connecting nodes
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* STACK ACTION BAR                                          */}
      {/* ════════════════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {selectedIds.length > 0 && (
          <motion.div
            key="stack-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-b border-sky-200 bg-sky-50/60"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span
                className="
                  rounded-full bg-white px-2 py-0.5
                  text-[10px] font-bold uppercase tracking-wider text-sky-700
                  ring-1 ring-inset ring-sky-300
                "
              >
                {selectedIds.length} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-[10px] text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
              <div className="flex-1" />
              {selectedIds.length >= 2 && (
                <button
                  onClick={handleGroupAsStack}
                  disabled={!canStackSelection}
                  className={`
                    rounded-md px-3 py-1
                    text-[11px] font-bold transition-colors
                    ${
                      canStackSelection
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "cursor-not-allowed bg-slate-200 text-slate-400"
                    }
                  `}
                  title={
                    !canStackSelection
                      ? "Selection cannot form a stack — must be same series, stackable, ≤8 members"
                      : `Group ${selectedIds.length} devices into a stack`
                  }
                >
                  📚 Stack ({selectedIds.length})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════ */}
      {/* INVENTORY HEADER (search + chips)                         */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-200 bg-slate-50/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Devices
          </p>
          <span
            className="
              rounded border border-slate-200 bg-white px-1.5 py-0.5
              font-mono text-[10px] text-slate-500
            "
          >
            {filtered.length}/{devices.length}
          </span>
        </div>

        <div className="relative">
          <SearchIcon
            size={12}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Search devices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 py-1.5
              text-xs
              focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
            "
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
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
                  className={`
                    rounded border px-1.5 py-0.5
                    text-[9px] font-bold transition-colors
                    ${
                      isActive
                        ? "border-slate-700 bg-slate-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }
                  `}
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

      {/* ════════════════════════════════════════════════════════ */}
      {/* INVENTORY LIST                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {devices.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-3xl opacity-50">🛜</div>
            <p className="text-xs italic text-slate-400">No devices yet</p>
            <p className="mt-1 text-[10px] text-slate-300">
              Use the catalog panel to add one
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mb-1 text-2xl opacity-40">🔎</div>
            <p className="text-xs italic text-slate-400">No matches</p>
            <p className="mt-1 text-[10px] text-slate-300">
              Try a different search or layer filter
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((d) => {
              const cfg = LAYER_CONFIG[d.type];
              const groupOf = d.groupId
                ? groups.find((g) => g.id === d.groupId)
                : null;
              const isSelected = selectedIds.includes(d.id);

              return (
                <motion.div
                  key={d.id}
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.12 }}
                  className={`
                    group flex cursor-pointer items-center gap-2
                    rounded-md border p-2 transition-colors
                    ${
                      isSelected
                        ? "border-sky-300 bg-sky-50"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }
                  `}
                  onClick={() => onConfigureDevice?.(d.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDeviceSelection(d.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 cursor-pointer accent-sky-500"
                    title="Select for bulk action"
                  />
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ background: cfg.color }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {d.name}
                    </span>
                    <span className="truncate font-mono text-[10px] text-slate-400">
                      {d.id} · {d.hardware.chassisPid}
                      {groupOf && (
                        <span className="ml-1 text-sky-600">
                          · {groupOf.kind === "stack" ? "📚" : "📦"}{" "}
                          {groupOf.label}
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className="
                      flex shrink-0 flex-col gap-0.5
                      opacity-0 transition-opacity group-hover:opacity-100
                    "
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureDevice?.(d.id);
                      }}
                      className="text-xs text-sky-500 hover:text-sky-700"
                      title="Configure"
                    >
                      <ConfigureIcon size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDevice(d.id);
                      }}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700"
                      title="Delete"
                    >
                      <DeleteIcon size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// ============================================================
// SPEED BADGE
// ============================================================
function SpeedBadge({ sku }: { sku: string }) {
  const { label, color } = getSpeedInfo(sku);
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}

function getSpeedInfo(sku: string): { label: string; color: string } {
  if (sku.includes("400G")) return { label: "400G", color: "#10b981" };
  if (sku.includes("100G")) return { label: "100G", color: "#ef4444" };
  if (sku.includes("40G")) return { label: "40G", color: "#f59e0b" };
  if (sku.includes("25G")) return { label: "25G", color: "#8b5cf6" };
  if (sku.includes("10G")) return { label: "10G", color: "#0ea5e9" };
  if (sku.includes("1G") || sku.startsWith("GLC")) {
    return { label: "1G", color: "#64748b" };
  }
  return { label: "?", color: "#94a3b8" };
}