"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfiguredDevice,
  Link,
  DeviceType,
  NamingConfig,
  DeviceGroup,
  HardwareConfig,
  GlobalDefaults,
  Project,
} from "../../lib/types";
import { LAYER_CONFIG } from "../../lib/hardware/catalog";
import {
  getSeriesByCategory,
  filterSwitchPids,
  getAvailableAttrValues,
  type SwitchAttrFilters,
} from "../../lib/hardware/catalogHelpers";
import { generateHostname } from "../../lib/utils/nameGenerator";
import { createBulkDevices } from "../../lib/utils/bulkCreate";
import {
  generateGroupId,
  getAncestorChain,
} from "../../lib/utils/groupHelpers";
import { AddIcon, RemoveIcon, GroupIcon, HardwareIcon } from "../ui/icons";
import { Accordion, FieldInline } from "./_configPrimitives";
import type { DeviceCategory } from "../../lib/hardware/types";
import TemplateModal from "./TemplateModal";
import {
  Network,
  ShieldCheck,
  Wifi,
  Router,
  Settings2,
  ArrowUpFromLine,
} from "lucide-react";

// ============================================================
// PROPS
// ============================================================
type Props = {
  devices: ConfiguredDevice[];
  naming: NamingConfig;
  setNaming: (cfg: NamingConfig) => void;
  groups: DeviceGroup[];
  defaultLinkSku: string;
  // ⭐ Required by TemplateModal
  globalDefaults: GlobalDefaults;
  project: Project;
  addDevicesWithOptionalGroup: (params: {
    devices: ConfiguredDevice[];
    newGroup?: DeviceGroup;
    newLinks?: Link[];
  }) => void;
  onCreateGroup?: (
    label: string,
    options?: {
      parentGroupId?: string;
      position?: { x: number; y: number };
      color?: string;
    },
  ) => string;
};

// ============================================================
// CONSTANTS
// ============================================================
const TYPE_PREFIX: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
  wireless: "WL",
  management: "MGT",
};

const CATEGORY_TABS: {
  id: DeviceCategory;
  label: string;
  Icon: typeof Network;
}[] = [
  { id: "switching", label: "Switching", Icon: Network },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "wireless", label: "Wireless", Icon: Wifi },
  { id: "routing", label: "Routing", Icon: Router },
  { id: "management", label: "Mgmt", Icon: Settings2 },
];

// Series we don't want shown directly to users in the family dropdown
// (they're component catalogs, not addable devices)
const EXCLUDED_SERIES = [
  "Catalyst 9400 Supervisors",
  "Catalyst 9400 Linecards",
  "Catalyst 9400 Power & Fans",
  "StackWise Cables",
];

// ============================================================
// HELPERS
// ============================================================
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

function Spec({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "amber" | "sky";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function TemplateSummary({ template }: { template: Partial<HardwareConfig> }) {
  const items: string[] = [];
  if (template.networkModulePid) items.push(`NM: ${template.networkModulePid}`);
  if (template.redundantPsu) items.push("Redundant PSU");
  if (template.primaryPsuPid) items.push(`PSU: ${template.primaryPsuPid}`);
  if (template.region) items.push(`Region: ${template.region}`);

  if (items.length === 0) return null;

  return (
    <div className="rounded border border-violet-200 bg-white px-2 py-1 text-[10px] text-slate-600">
      ✓ {items.join(" · ")}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DeviceCatalogPanel({
  devices,
  naming,
  setNaming,
  groups,
  defaultLinkSku,
  globalDefaults,
  project,
  addDevicesWithOptionalGroup,
  onCreateGroup,
}: Props) {
  // ─── Category + family + filters ───────────────────────────
  const [category, setCategory] = useState<DeviceCategory>("switching");

  const seriesInCategory = useMemo(
    () => getSeriesByCategory(category),
    [category],
  );

  // Filter excluded series out of the visible list
  const seriesNames = useMemo(
    () =>
      Object.keys(seriesInCategory).filter(
        (name) => !EXCLUDED_SERIES.includes(name),
      ),
    [seriesInCategory],
  );

  const [selectedSeries, setSelectedSeries] = useState<string>(
    seriesNames[0] ?? "",
  );

  // Derive a SAFE current series during render (no useEffect needed)
  const safeSelectedSeries = seriesNames.includes(selectedSeries)
    ? selectedSeries
    : (seriesNames[0] ?? "");

  const currentSeries = seriesInCategory[safeSelectedSeries];

  // ─── Filter chips ──────────────────────────────────────────
  const [filters, setFilters] = useState<SwitchAttrFilters>({});

  const availableAttrs = useMemo(() => {
    if (!currentSeries) return null;
    return getAvailableAttrValues(currentSeries);
  }, [currentSeries]);

  const matchingPids = useMemo(() => {
    if (!currentSeries) return [];
    return filterSwitchPids(currentSeries, filters);
  }, [currentSeries, filters]);

  // ─── Selected PID ──────────────────────────────────────────
  const [selectedPid, setSelectedPid] = useState<string>("");
  const safeSelectedPid =
    matchingPids.length === 0
      ? ""
      : matchingPids.find((p) => p.pid === selectedPid)
        ? selectedPid
        : matchingPids[0].pid;

  const currentPidObj = matchingPids.find((p) => p.pid === safeSelectedPid);

  // ─── Hardware Template (bulk mode) ─────────────────────────
  type StoredTemplate = {
    forSeries: string;
    forPid: string;
    config: Partial<HardwareConfig>;
  };

  const [storedTemplate, setStoredTemplate] = useState<StoredTemplate | null>(
    null,
  );
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Derive the effective template during render — automatically empty when
  // chassis changes
  const hardwareTemplate: Partial<HardwareConfig> =
    storedTemplate &&
    storedTemplate.forSeries === safeSelectedSeries &&
    storedTemplate.forPid === safeSelectedPid
      ? storedTemplate.config
      : {};

  // ─── Hostname state ────────────────────────────────────────
  const [hostname, setHostname] = useState("");
  const previewType = currentSeries?.type;

  const autoName = useMemo(
    () =>
      naming.autoEnabled && previewType
        ? generateHostname(
            naming.pattern,
            previewType,
            safeSelectedSeries,
            devices,
          )
        : "",
    [naming, previewType, safeSelectedSeries, devices],
  );

  // ─── Bulk mode ─────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [uplinkTargets, setUplinkTargets] = useState<
    Map<string, { linkCount: number; opticPid: string }>
  >(new Map());
  const [groupName, setGroupName] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string>("");

  const availableUplinkTargets = devices.filter(
    (d) => d.type !== currentSeries?.type,
  );

  const totalLinks = Array.from(uplinkTargets.values()).reduce(
    (sum, u) => sum + u.linkCount,
    0,
  );
  const grandTotalLinks = quantity * totalLinks;

  const canAdd =
    !!currentSeries &&
    !!safeSelectedPid &&
    (naming.autoEnabled
      ? autoName.trim().length > 0
      : hostname.trim().length > 0);

  const bulkSummary = useMemo(() => {
    const parts: string[] = [];
    if (quantity > 1) parts.push(`${quantity} dev`);
    if (uplinkTargets.size > 0) parts.push(`${grandTotalLinks} link`);
    if (groupName.trim() || parentGroupId) parts.push("grp");
    if (Object.keys(hardwareTemplate).length > 0) parts.push("tpl");
    return parts.join(" · ");
  }, [
    quantity,
    uplinkTargets.size,
    grandTotalLinks,
    groupName,
    parentGroupId,
    hardwareTemplate,
  ]);

  // ─── Helpers ───────────────────────────────────────────────
  const toggleUplinkTarget = (deviceId: string) => {
    setUplinkTargets((prev) => {
      const next = new Map(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.set(deviceId, { linkCount: 1, opticPid: defaultLinkSku });
      return next;
    });
  };

  const updateUplinkCount = (deviceId: string, linkCount: number) => {
    setUplinkTargets((prev) => {
      const next = new Map(prev);
      const existing = next.get(deviceId);
      if (existing)
        next.set(deviceId, { ...existing, linkCount: Math.max(1, linkCount) });
      return next;
    });
  };

  const setFilter = <K extends keyof SwitchAttrFilters>(
    key: K,
    value: SwitchAttrFilters[K] | undefined,
  ) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const resetFilters = () => setFilters({});
  const hasActiveFilters = Object.keys(filters).length > 0;

  // ─── Add device ────────────────────────────────────────────
  const addNode = () => {
    if (!currentSeries || !safeSelectedPid) return;

    // Single-add path
    if (!bulkMode || quantity === 1) {
      const finalName = naming.autoEnabled ? autoName : hostname.trim();
      if (!finalName) return;

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
        id: generateDeviceId(currentSeries.type, devices),
        name: finalName,
        type: currentSeries.type,
        position: assignedGroupId ? { x: 24, y: 60 } : undefined,
        hardware: {
          // Apply template first (only in bulk mode)
          ...(bulkMode ? hardwareTemplate : {}),
          // ⭐ Defense-in-depth: chassis identity ALWAYS overrides template
          series: safeSelectedSeries,
          chassisPid: safeSelectedPid,
        },
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

      if (!naming.autoEnabled) setHostname("");
      setGroupName("");
      setParentGroupId("");
      return;
    }

    // Bulk-add path
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
          `A group named "${trimmedGroupName}" already exists at this level.`,
        );
        return;
      }
    }

    const result = createBulkDevices(
      {
        series: safeSelectedSeries,
        chassisPid: safeSelectedPid,
        type: currentSeries.type,
        quantity,
        uplinks: Array.from(uplinkTargets.entries()).map(([targetId, cfg]) => ({
          targetDeviceId: targetId,
          opticPid: cfg.opticPid,
          linkCount: cfg.linkCount,
        })),
        groupName: trimmedGroupName || undefined,
        parentGroupId: parentGroupId || undefined,
        hardwareTemplate,
      },
      devices,
      [],
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

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <aside
      className="
      flex h-full flex-col overflow-hidden
      rounded-xl border border-slate-200 bg-white shadow-sm
    "
    >
      {/* ════════════════════════════════════════════════════ */}
      {/* STICKY HEADER (always visible)                        */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/60 px-3 py-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <HardwareIcon size={14} className="text-slate-500" />
          Add Device
        </p>
        {naming.autoEnabled && autoName && (
          <span
            className="rounded-full bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200"
            title={`Auto-name pattern: ${naming.pattern}`}
          >
            auto · {autoName}
          </span>
        )}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* SCROLLABLE MIDDLE — Steps 1–4 + Bulk accordion        */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
        {/* ── STEP 1 · Category tabs ───────────────────────── */}
        <div className="border-b border-slate-200 bg-white px-2 py-2">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Step 1 · Category
          </p>
          <div className="flex gap-1">
            {CATEGORY_TABS.map((tab) => {
              const isActive = category === tab.id;
              const count = Object.keys(getSeriesByCategory(tab.id)).filter(
                (n) => !EXCLUDED_SERIES.includes(n),
              ).length;
              const disabled = count === 0;
              const Icon = tab.Icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setCategory(tab.id)}
                  disabled={disabled}
                  title={
                    disabled
                      ? `No ${tab.label} hardware in catalog yet`
                      : `${tab.label} (${count})`
                  }
                  className={`
                  flex flex-1 flex-col items-center gap-0.5 rounded-md
                  border px-1 py-1.5 transition-colors
                  ${
                    isActive
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : disabled
                        ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span className="text-[9px] font-bold leading-none">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2 · Family ──────────────────────────────── */}
        <div className="border-b border-slate-200 bg-white px-3 py-2 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Step 2 · Family
          </p>

          {seriesNames.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-2 text-[10px] italic text-slate-400">
              No series available in this category yet.
            </p>
          ) : (
            <select
              value={safeSelectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {seriesNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── STEP 3 · Filter chips ────────────────────────── */}
        {currentSeries && availableAttrs && (
          <div className="border-b border-slate-200 bg-white px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Step 3 · Filters
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[10px] text-sky-600 hover:text-sky-800"
                >
                  Reset
                </button>
              )}
            </div>

            {availableAttrs.portCount.length > 1 && (
              <FilterRow
                label="Ports"
                options={availableAttrs.portCount.map((v) => ({
                  value: v,
                  label: `${v}`,
                }))}
                value={filters.portCount}
                onChange={(v) => setFilter("portCount", v)}
              />
            )}

            {availableAttrs.portType.length > 1 && (
              <FilterRow
                label="Type"
                options={availableAttrs.portType.map((v) => ({
                  value: v,
                  label: v,
                }))}
                value={filters.portType}
                onChange={(v) => setFilter("portType", v)}
              />
            )}

            {availableAttrs.poeClass.length > 1 && (
              <FilterRow
                label="PoE"
                options={availableAttrs.poeClass.map((v) => ({
                  value: v,
                  label: v,
                }))}
                value={filters.poeClass}
                onChange={(v) => setFilter("poeClass", v)}
              />
            )}

            {availableAttrs.uplinkType.length > 1 && (
              <FilterRow
                label="Uplinks"
                options={availableAttrs.uplinkType.map((v) => ({
                  value: v,
                  label: v.replace("fixed-", "fix·").replace("modular", "Mod"),
                }))}
                value={filters.uplinkType}
                onChange={(v) => setFilter("uplinkType", v)}
              />
            )}
          </div>
        )}

        {/* ── STEP 4 · Model dropdown ──────────────────────── */}
        {currentSeries && (
          <div className="border-b border-slate-200 bg-white px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Step 4 · Model
              </p>
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                {matchingPids.length} match
                {matchingPids.length === 1 ? "" : "es"}
              </span>
            </div>

            {matchingPids.length === 0 ? (
              <p className="rounded-md border border-dashed border-amber-200 bg-amber-50 p-2 text-[10px] italic text-amber-700">
                No PIDs match your filters. Try resetting them.
              </p>
            ) : (
              <select
                value={safeSelectedPid}
                onChange={(e) => setSelectedPid(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {matchingPids.map((p) => (
                  <option key={p.pid} value={p.pid}>
                    {p.pid}
                  </option>
                ))}
              </select>
            )}

            {currentPidObj?.attrs?.kind === "switch" && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 space-y-1">
                <div className="font-mono text-[11px] font-bold text-slate-700">
                  {currentPidObj.pid}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Spec
                    label={`${currentPidObj.attrs.portCount}× ${currentPidObj.attrs.portType}`}
                  />
                  {currentPidObj.attrs.poeClass !== "none" && (
                    <Spec label={currentPidObj.attrs.poeClass} tone="amber" />
                  )}
                  <Spec
                    label={
                      "Uplink: " + currentPidObj.attrs.uplinkType.toUpperCase()
                    }
                    tone="sky"
                  />
                </div>
                <div className="text-[10px] italic text-slate-500">
                  {currentPidObj.description}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bulk Mode accordion ──────────────────────────── */}
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
              <FieldInline label="Quantity">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50"
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
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <AddIcon size={14} />
                  </button>
                </div>
              </FieldInline>

              {/* Hardware Template section */}
              <div className="rounded-lg border-l-2 border-violet-300 bg-violet-50/30 px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  <Settings2 size={11} />
                  <span>Hardware Template (optional)</span>
                </div>

                <button
                  onClick={() => setTemplateModalOpen(true)}
                  disabled={!safeSelectedPid}
                  className="
                  flex w-full items-center justify-center gap-1.5 rounded-md
                  border border-violet-300 bg-white py-1.5
                  text-[11px] font-semibold text-violet-700
                  transition-colors hover:border-violet-400 hover:bg-violet-50
                  disabled:cursor-not-allowed disabled:opacity-40
                "
                >
                  <Settings2 size={12} />
                  {Object.keys(hardwareTemplate).length === 0
                    ? "Configure Template…"
                    : `Edit Template (${Object.keys(hardwareTemplate).length} override${
                        Object.keys(hardwareTemplate).length === 1 ? "" : "s"
                      })`}
                </button>

                {Object.keys(hardwareTemplate).length > 0 && (
                  <TemplateSummary template={hardwareTemplate} />
                )}

                <p className="text-[10px] italic leading-tight text-slate-500">
                  Applied identically to every device created in this batch.
                </p>
              </div>

              {!naming.autoEnabled && quantity > 1 && (
                <p className="text-[10px] italic text-amber-600">
                  ⚠ Enable Auto-name to add multiple devices
                </p>
              )}

              {/* Group section */}
              <div className="rounded-lg border-l-2 border-sky-300 bg-sky-50/30 px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                  <GroupIcon size={11} className="text-sky-700" />
                  <span>Group (optional)</span>
                </div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. ACC Pod 1"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                {groups.length > 0 && (
                  <select
                    value={parentGroupId}
                    onChange={(e) => setParentGroupId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="">— Top level —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {indentGroupLabel(g, groups)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Uplinks section */}
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <ArrowUpFromLine size={11} />
                  Uplink To ({uplinkTargets.size} selected)
                </p>
                {availableUplinkTargets.length === 0 ? (
                  <p className="text-[10px] italic text-slate-400">
                    No other devices yet — add cores first to enable
                    auto-uplinks
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
                          flex items-center gap-1.5 rounded p-1 text-[10px]
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
                                className="w-10 rounded border border-slate-200 p-0.5 text-center font-mono text-[10px]"
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
            </Accordion>
          </div>
        )}
      </div>
      {/* ── End scrollable middle ────────────────────────── */}

      {/* ════════════════════════════════════════════════════ */}
      {/* STICKY FOOTER — Hostname + toggles + actions          */}
      {/* (always visible — never scrolled away)                */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/60 px-3 py-3 space-y-2">
        <input
          placeholder={
            naming.autoEnabled ? autoName || "Pattern preview…" : "HOSTNAME"
          }
          className={`
          w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs
          focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
          ${
            naming.autoEnabled
              ? "italic text-slate-500 bg-slate-100 cursor-not-allowed"
              : ""
          }
        `}
          value={naming.autoEnabled ? autoName : hostname}
          readOnly={naming.autoEnabled}
          onChange={(e) => !naming.autoEnabled && setHostname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAdd) addNode();
          }}
        />

        <div className="flex items-center gap-3">
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
                  setStoredTemplate(null);
                }
              }}
              className="cursor-pointer accent-sky-500"
            />
            Bulk Mode
          </label>
        </div>

        <button
          onClick={addNode}
          disabled={
            !canAdd || (bulkMode && quantity > 1 && !naming.autoEnabled)
          }
          className="
          flex w-full items-center justify-center gap-1.5 rounded-md bg-sky-600 py-1.5
          text-xs font-bold text-white transition-colors hover:bg-sky-700
          disabled:cursor-not-allowed disabled:opacity-40
        "
        >
          <AddIcon size={14} strokeWidth={2.5} />
          Add {bulkMode && quantity > 1 ? `${quantity} Devices` : "Device"}
          {bulkMode && grandTotalLinks > 0 ? ` + ${grandTotalLinks} Links` : ""}
          {bulkMode && groupName.trim() ? " (in group)" : ""}
        </button>

        {onCreateGroup && (
          <button
            onClick={() => {
              const label = prompt("Group name?", "Test Pod");
              if (label?.trim()) {
                onCreateGroup(label.trim(), { position: { x: 200, y: 200 } });
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-sky-400 hover:text-sky-700"
            title="Create empty group"
          >
            <AddIcon size={12} /> Empty Group
          </button>
        )}
      </div>

      {/* ── Template Modal (outside layout — overlays everything) ── */}
      {templateModalOpen && currentSeries && safeSelectedPid && (
        <TemplateModal
          chassisPid={safeSelectedPid}
          series={safeSelectedSeries}
          initial={hardwareTemplate}
          onSave={(next) =>
            setStoredTemplate({
              forSeries: safeSelectedSeries,
              forPid: safeSelectedPid,
              config: next,
            })
          }
          onClose={() => setTemplateModalOpen(false)}
          globalDefaults={globalDefaults}
          project={project}
        />
      )}
    </aside>
  );
}

// ============================================================
// Filter chip row
// ============================================================
function FilterRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const isActive = value === o.value;
          return (
            <button
              key={String(o.value)}
              onClick={() => onChange(isActive ? undefined : o.value)}
              className={`
                rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors
                ${
                  isActive
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }
              `}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
