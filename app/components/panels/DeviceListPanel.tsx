"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ConfiguredDevice,
  Link,
  DeviceType,
  NamingConfig,
  DeviceGroup,
} from "../../lib/types";
import { LAYER_CONFIG, getEffectiveCatalog } from "../../lib/hardware/catalog";
import {
  generateHostname,
} from "../../lib/utils/nameGenerator";
import { createBulkDevices } from "../../lib/utils/bulkCreate";
import {
  getAncestorChain,
  generateGroupId,
} from "../../lib/utils/groupHelpers";
import { getAddableSeriesNames } from "../../lib/hardware/catalog";
import { validateStackComposition } from "@/app/lib/utils/stackValidation";
import { useProject } from "@/app/lib/storage";
import {
  ConfigureIcon,
  AddIcon,
  RemoveIcon,
  SearchIcon,
  DeleteIcon,
  GroupIcon,
  HardwareIcon,
  ChevronRightIcon,
} from "../ui/icons";
import { Accordion, FieldInline } from "./_configPrimitives";

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
  onCreateGroup?: (
    label: string,
    options?: {
      parentGroupId?: string;
      position?: { x: number; y: number };
      color?: string;
    },
  ) => string;
  addDevicesWithOptionalGroup: (params: {
    devices: ConfiguredDevice[];
    newGroup?: DeviceGroup;
    newLinks?: Link[];
  }) => void;
  groups: DeviceGroup[];
  setGroups: (groups: DeviceGroup[]) => void;
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

function indentGroupLabel(g: DeviceGroup, all: DeviceGroup[]): string {
  const depth = getAncestorChain(all, g.id).length - 1;
  return `${"·  ".repeat(depth)}${g.label}`;
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
  onCreateGroup,
  groups,
  addDevicesWithOptionalGroup,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { createStackFromDevices } = useProject();

  // ============================================================
  // ADD DEVICE STATE
  // ============================================================
  const catalog = useMemo(() => getEffectiveCatalog(), []);
  const firstSeries = Object.keys(catalog)[0];
  const [newNode, setNewNode] = useState({
    name: "",
    series: firstSeries,
    pid: catalog[firstSeries].pids[0].pid,
  });

  // ============================================================
  // BULK MODE STATE
  // ============================================================
  const [bulkMode, setBulkMode] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [uplinkTargets, setUplinkTargets] = useState<
    Map<string, { linkCount: number; opticPid: string }>
  >(new Map());

  const [groupName, setGroupName] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string>("");

  // Footer optic dropdown expansion
  const [opticExpanded, setOpticExpanded] = useState(false);

  const currentSeries = catalog[newNode.series];
  const currentPidObj = currentSeries.pids.find((p) => p.pid === newNode.pid);
  const previewType = currentSeries.type;

  const selectedDevices = useMemo(() => {
    return selectedIds
      .map((id) => devices.find((d) => d.id === id))
      .filter((d): d is ConfiguredDevice => d !== undefined);
  }, [selectedIds, devices]);

  const canStackSelection = useMemo(() => {
    if (selectedDevices.length < 2) return false;
    return validateStackComposition(selectedDevices).canStack;
  }, [selectedDevices]);

  const autoName = useMemo(
    () =>
      naming.autoEnabled
        ? generateHostname(naming.pattern, previewType, newNode.series, devices)
        : "",
    [naming, previewType, newNode.series, devices],
  );

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

  const handleSeriesChange = (series: string) => {
    const seriesData = getEffectiveCatalog()[series];
    if (!seriesData || seriesData.pids.length === 0) {
      console.warn(`Series "${series}" has no PIDs available.`);
      return;
    }
    setNewNode({ ...newNode, series, pid: seriesData.pids[0].pid });
  };

  const addNode = () => {
    if (!bulkMode || quantity === 1) {
      const finalName = naming.autoEnabled ? autoName : newNode.name.trim();
      if (!finalName) return;

      const series = catalog[newNode.series];

      const trimmedGroupName = bulkMode ? groupName.trim() : "";
      let newGroupForSingle: DeviceGroup | undefined;
      let assignedGroupId: string | null = parentGroupId || null;

      if (trimmedGroupName && bulkMode) {
        const conflict = groups.some(
          (g) =>
            g.label.toLowerCase() === trimmedGroupName.toLowerCase() &&
            (g.parentGroupId ?? "") === (parentGroupId || ""),
        );
        if (conflict) {
          alert(
            `A group named "${trimmedGroupName}" already exists at this level.`,
          );
          return;
        }
        const newId = generateGroupId(groups);
        newGroupForSingle = {
          id: newId,
          label: trimmedGroupName,
          kind: "logical",
          parentGroupId: parentGroupId || undefined,
          collapsed: false,
          position: { x: 200, y: 200 },
        };
        assignedGroupId = newId;
      }

      const device: ConfiguredDevice = {
        id: generateDeviceId(series.type, devices),
        name: finalName,
        type: series.type,
        position: assignedGroupId ? { x: 24, y: 60 } : undefined,
        hardware: { series: newNode.series, chassisPid: newNode.pid },
        groupId: assignedGroupId,
      };

      const bulkLinks: Link[] = [];
      if (bulkMode && uplinkTargets.size > 0) {
        for (const [targetId, cfg] of uplinkTargets) {
          for (let i = 0; i < cfg.linkCount; i++) {
            bulkLinks.push({
              id: `LNK-${Date.now()}-${i}-${targetId}-${Math.random()
                .toString(36)
                .slice(2, 6)}`,
              from: targetId,
              to: device.id,
              sourceHandle: "b",
              targetHandle: "t",
              optic: { pid: cfg.opticPid },
            });
          }
        }
      }

      addDevicesWithOptionalGroup({
        devices: [device],
        newGroup: newGroupForSingle,
        newLinks: bulkLinks.length > 0 ? bulkLinks : undefined,
      });

      if (!naming.autoEnabled) setNewNode({ ...newNode, name: "" });
      setGroupName("");
      setParentGroupId("");
      return;
    }

    if (!naming.autoEnabled) return;

    const trimmedGroupName = groupName.trim();
    if (trimmedGroupName) {
      const conflict = groups.some(
        (g) =>
          g.label.toLowerCase() === trimmedGroupName.toLowerCase() &&
          (g.parentGroupId ?? "") === (parentGroupId || ""),
      );
      if (conflict) {
        alert(
          `A group named "${trimmedGroupName}" already exists at this level. Please choose a different name.`,
        );
        return;
      }
    }

    const series = catalog[newNode.series];
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
        groupName: trimmedGroupName || undefined,
        parentGroupId: parentGroupId || undefined,
      },
      devices,
      links,
      groups,
      naming,
    );

    addDevicesWithOptionalGroup({
      devices: result.newDevices,
      newGroup: result.newGroup ?? undefined,
      newLinks: result.newLinks.length > 0 ? result.newLinks : undefined,
    });
    setGroupName("");
    setParentGroupId("");
  };

  const addableSeries = getAddableSeriesNames();
  const groupedSeries = useMemo(() => {
    return addableSeries.reduce<Record<string, string[]>>((acc, name) => {
      const s = catalog[name];
      if (!s?.type) return acc;
      const key = s.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(name);
      return acc;
    }, {});
  }, [addableSeries, catalog]);

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

  const availableUplinkTargets = devices.filter(
    (d) => d.type !== currentSeries.type,
  );

  const totalLinks = Array.from(uplinkTargets.values()).reduce(
    (sum, u) => sum + u.linkCount,
    0,
  );
  const grandTotalLinks = quantity * totalLinks;

  const canAdd = naming.autoEnabled
    ? autoName.trim().length > 0
    : newNode.name.trim().length > 0;

  // Bulk-mode summary for accordion badge
  const bulkSummary = useMemo(() => {
    const parts: string[] = [];
    if (quantity > 1) parts.push(`${quantity} dev`);
    if (uplinkTargets.size > 0) parts.push(`${grandTotalLinks} link`);
    if (groupName.trim() || parentGroupId) parts.push("grp");
    return parts.join(" · ");
  }, [quantity, uplinkTargets.size, grandTotalLinks, groupName, parentGroupId]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <aside
      className="
        flex h-full flex-col overflow-hidden
        rounded-xl border border-slate-200 bg-white shadow-sm
      "
    >
      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — ADD DEVICE (always visible)                   */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-200 bg-slate-50/60 backdrop-blur-sm p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <HardwareIcon size={16} className="text-slate-500" aria-hidden />
            Add Device
          </p>
          {naming.autoEnabled && autoName && (
            <span
              className="
                rounded-full bg-sky-100 px-2 py-0.5
                font-mono text-[10px] font-semibold text-sky-700
                ring-1 ring-inset ring-sky-200
              "
              title={`Auto-name pattern: ${naming.pattern}`}
            >
              auto · {autoName}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {/* Hostname */}
          <input
            placeholder={
              naming.autoEnabled ? autoName || "Pattern preview…" : "HOSTNAME"
            }
            className={`
              w-full rounded-md border border-slate-300 bg-white px-2 py-1.5
              text-xs
              focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
              ${naming.autoEnabled ? "italic text-slate-500 bg-slate-100 cursor-not-allowed" : ""}
            `}
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

          {/* Series */}
          <select
            className="
              w-full rounded-md border border-slate-300 bg-white px-2 py-1.5
              text-xs
              focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
            "
            value={newNode.series}
            onChange={(e) => handleSeriesChange(e.target.value)}
          >
            {layerOrder.map((layer) => (
              <optgroup key={layer} label={layer.toUpperCase()}>
                {(groupedSeries[layer] ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* PID */}
          <select
            className="
              w-full rounded-md border border-slate-300 bg-white px-2 py-1.5
              font-mono text-xs
              focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
            "
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
            <p className="text-[10px] italic leading-tight text-slate-500">
              {currentPidObj.description}
            </p>
          )}

          {/* Toggles row */}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={naming.autoEnabled}
                onChange={(e) =>
                  setNaming({ ...naming, autoEnabled: e.target.checked })
                }
                className="cursor-pointer accent-sky-500"
              />
              Auto-name
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => {
                  setBulkMode(e.target.checked);
                  if (!e.target.checked) {
                    setQuantity(1);
                    setUplinkTargets(new Map());
                    setGroupName("");
                    setParentGroupId("");
                  }
                }}
                className="cursor-pointer accent-sky-500"
              />
              Bulk Mode
            </label>
          </div>

          {/* Add button */}
          <button
            onClick={addNode}
            disabled={
              !canAdd || (bulkMode && quantity > 1 && !naming.autoEnabled)
            }
            className="
              flex items-center justify-center gap-1.5 w-full rounded-md bg-sky-600 py-1.5
              text-xs font-bold text-white
              transition-colors
              hover:bg-sky-700
              disabled:cursor-not-allowed disabled:opacity-40
              focus:outline-none focus:ring-2 focus:ring-sky-300
            "
          >
            <AddIcon size={14} strokeWidth={2.5} />Add{" "}
            {bulkMode && quantity > 1 ? `${quantity} Devices` : "Device"}
            {bulkMode && grandTotalLinks > 0
              ? ` + ${grandTotalLinks} Links`
              : ""}
            {bulkMode && groupName.trim() ? " (in group)" : ""}
          </button>

          {onCreateGroup && (
            <button
              onClick={() => {
                const label = prompt("Group name?", "Test Pod");
                if (label?.trim()) {
                  onCreateGroup(label.trim(), {
                    position: { x: 200, y: 200 },
                  });
                }
              }}
              className="
                 flex items-center justify-center gap-1.5 w-full rounded-md border border-slate-300 bg-white py-1.5
                text-[11px] font-semibold text-slate-700
                transition-colors hover:border-sky-400 hover:text-sky-700
              "
              title="Create empty group"
            >
              <AddIcon size={12} /> Empty Group
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Footer Optic Picker                            */}
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
      {/* SECTION 3 — Bulk Mode accordion                            */}
      {/* ════════════════════════════════════════════════════════ */}
      {bulkMode && (
        <div className="border-b border-slate-200 bg-white p-2">
          <Accordion
            title="Bulk Mode"
            icon={<GroupIcon size={14} />}
            defaultOpen={true}
            badge={
              bulkSummary ? { state: "info", label: bulkSummary } : undefined
            }
          >
            {/* Quantity */}
            <FieldInline label="Quantity">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-md border border-slate-200 bg-white
                    font-bold text-slate-600 hover:bg-slate-50
                  "
                >
                  <RemoveIcon size={14} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="
                    flex-1 rounded-md border border-slate-300 bg-white px-2 py-1
                    text-center font-mono text-xs
                  "
                />
                <button
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-md border border-slate-200 bg-white
                    font-bold text-slate-600 hover:bg-slate-50
                  "
                >
                  <AddIcon size={14} />
                </button>
              </div>
            </FieldInline>

            {!naming.autoEnabled && quantity > 1 && (
              <p className="text-[10px] italic text-amber-600">
                ⚠ Enable Auto-name to add multiple devices
              </p>
            )}

            {/* Group nesting */}
            <div className="rounded-lg border-l-2 border-sky-300 bg-sky-50/30 px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                <GroupIcon
                  size={11}
                  className="text-cisco-blue-700"
                  aria-hidden
                />
                <span>Group (optional)</span>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. ACC Pod 1"
                className="
                  w-full rounded-md border border-slate-300 bg-white px-2 py-1
                  text-xs
                  focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
                "
              />
              {groups.length > 0 && (
                <select
                  value={parentGroupId}
                  onChange={(e) => setParentGroupId(e.target.value)}
                  className="
                    w-full rounded-md border border-slate-300 bg-white px-2 py-1
                    text-xs
                  "
                >
                  <option value="">— Top level —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {indentGroupLabel(g, groups)}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] italic leading-tight text-slate-500">
                {groupName.trim()
                  ? `Will create new group "${groupName.trim()}"${
                      parentGroupId ? " (nested)" : ""
                    }.`
                  : parentGroupId
                    ? "Devices will be added to the selected group."
                    : "Leave blank to create devices at top level."}
              </p>
            </div>

            {/* Uplinks */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Uplink To ({uplinkTargets.size} selected)
              </p>
              {availableUplinkTargets.length === 0 ? (
                <p className="text-[10px] italic text-slate-400">
                  No other devices yet — add cores first to enable auto-uplinks
                </p>
              ) : (
                <div className="custom-scrollbar max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                  {availableUplinkTargets.map((target) => {
                    const cfg = uplinkTargets.get(target.id);
                    const isChecked = !!cfg;
                    const targetCfg = LAYER_CONFIG[target.type];
                    return (
                      <div
                        key={target.id}
                        className={`
                          flex items-center gap-1.5 rounded p-1
                          text-[10px]
                          ${isChecked ? "bg-sky-50" : "hover:bg-slate-50"}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUplinkTarget(target.id)}
                          className="cursor-pointer accent-sky-500"
                        />
                        <span
                          className="h-4 w-1.5 shrink-0 rounded-full"
                          style={{ background: targetCfg.color }}
                        />
                        <span className="flex-1 truncate font-semibold text-slate-700">
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
                              className="
                                w-10 rounded border border-slate-200
                                p-0.5 text-center font-mono text-[10px]
                              "
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

            {/* Live preview */}
            {(quantity > 1 || uplinkTargets.size > 0 || groupName.trim()) && (
              <div className="rounded-md border border-slate-200 bg-white p-2 text-[10px] leading-tight text-slate-700">
                <p className="mb-0.5 font-semibold">Will create:</p>
                {groupName.trim() && <p>• 1 group: 📦 {groupName.trim()}</p>}
                <p>
                  • {quantity} device{quantity !== 1 ? "s" : ""}
                </p>
                {grandTotalLinks > 0 && (
                  <p>
                    • {grandTotalLinks} link{grandTotalLinks !== 1 ? "s" : ""} (
                    {quantity} × {totalLinks} per device)
                  </p>
                )}
              </div>
            )}
          </Accordion>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — Sticky Stack Action Bar                        */}
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
      {/* SECTION 5 — Inventory Header                              */}
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
      focus:border-cisco-blue-400 focus:outline-none focus:ring-2 focus:ring-cisco-blue-200
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
      {/* SECTION 6 — Inventory List (scroll)                       */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {devices.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-3xl opacity-50">🛜</div>
            <p className="text-xs italic text-slate-400">No devices yet</p>
            <p className="mt-1 text-[10px] text-slate-300">
              Use the form above to add one
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
