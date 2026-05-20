"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ConfiguredDevice,
  GlobalDefaults,
  Region,
  SmartnetTier,
  ContractTermYears,
  HardwareConfig,
  SlotAssignment,
  Project,
} from "@/app/lib/types";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import {
  getChassisSlotLayout,
  getModulesForSlotKind,
  isModularChassis,
  type ModuleCatalogEntry,
} from "@/app/lib/hardware/chassisHelpers";
import type { ChassisBundle } from "@/app/lib/hardware/catalog";
import { resolvePrimaryPsuPid } from "@/app/lib/bom/psuEmitter";
import { resolveNetworkModulePid } from "@/app/lib/bom/networkModuleEmitter";
import { resolveModularPsuPid } from "@/app/lib/bom/modularPsuEmitter";

import {
  IdentityIcon,
  SlotConfigIcon,
  HardwareIcon,
  PowerIcon,
  UplinkIcon,
  SmartnetIcon,
  LicenseIcon,
  CloseIcon,
  ConfigureIcon,
} from "../ui/icons";

import {
  Accordion,
  FieldInline,
  FieldStacked,
  RadioCardGroup,
  type RadioCardOption,
} from "./_configPrimitives";
import {
  validateIdentity,
  validateHardware,
  validateSlots,
  validateSmartnet,
} from "./_validateDevice.ts";
import { BomPreviewMini } from "./_BomPreviewMini";

type Props = {
  device: ConfiguredDevice | null;
  globalDefaults: GlobalDefaults;
  selectedSlotId?: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ConfiguredDevice>) => void;
  /** Optional: pass project to enable live BOM preview at the bottom. */
  project?: Project;
};

const REGIONS: Region[] = ["EU", "US", "UK", "JP", "AU", "IN", "CN"];
const SMARTNET_TIERS: SmartnetTier[] = [
  "SNT",
  "SNTP",
  "OS",
  "OSP",
  "PSUP",
  "ECMU",
  "NONE",
];
const TERMS: ContractTermYears[] = [1, 2, 3, 4, 5, 7];

export default function ConfigurePanel({
  device,
  globalDefaults,
  selectedSlotId,
  onClose,
  onUpdate,
  project,
}: Props) {
  const [hostnameDraft, setHostnameDraft] = useState(device?.name ?? "");
  const [lastSyncedDeviceKey, setLastSyncedDeviceKey] = useState<string | null>(
    device ? `${device.id}:${device.name}` : null
  );

  // React 19 idiom: derive state during render
  const currentDeviceKey = device ? `${device.id}:${device.name}` : null;
  if (currentDeviceKey !== lastSyncedDeviceKey) {
    setLastSyncedDeviceKey(currentDeviceKey);
    setHostnameDraft(device?.name ?? "");
  }

  if (!device) return null;

  const catalog = getEffectiveCatalog();
  const series = catalog[device.hardware.series];
  const chassisIsModular = isModularChassis(device.hardware.chassisPid);

  const patchHardware = (patch: Partial<HardwareConfig>) => {
    onUpdate(device.id, { hardware: { ...device.hardware, ...patch } });
  };
  const commitHostname = () => {
    if (hostnameDraft && hostnameDraft !== device.name) {
      onUpdate(device.id, { name: hostnameDraft });
    }
  };

  const chassisPidEntry = series?.pids.find(
    (p) => p.pid === device.hardware.chassisPid
  );
  const bundle = (chassisPidEntry as { bundle?: ChassisBundle })?.bundle;
  const psuOptions = bundle?.psuOptions;
  const networkModuleOptions = bundle?.networkModuleOptions;

  const currentNetworkModule = networkModuleOptions
    ? resolveNetworkModulePid(bundle, device.hardware.networkModulePid)
    : undefined;
  const currentPid = psuOptions
    ? resolvePrimaryPsuPid(bundle, device.hardware.primaryPsuPid)
    : undefined;
  const redundantPid =
    psuOptions && currentPid
      ? psuOptions.secondaryPidMap[currentPid]
      : undefined;
  const userCanChangePrimary = psuOptions
    ? psuOptions.emitPrimary !== false
    : false;

  // Validation snapshots
  const vIdentity = validateIdentity(device);
  const vHardware = validateHardware(
    device,
    !!psuOptions,
    !!bundle?.psuConfig,
    !!currentPid
  );
  const vSlots = validateSlots(device);
  const vSmartnet = validateSmartnet(device);

  // Auto-open the slot section if user clicked a slot to open the panel
  const slotSectionOpen = !!selectedSlotId;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
      />

      <motion.aside
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="
          fixed right-0 top-0 z-50 h-full w-105
          overflow-y-auto
          border-l border-slate-200 bg-slate-50/95
          shadow-2xl backdrop-blur-md
        "
      >
        {/* ─── Sticky Header ─── */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ConfigureIcon size={14} className="shrink-0 text-slate-500" aria-hidden />
                <h2 className="truncate text-sm font-bold text-slate-800">
                  {device.name || "Unnamed device"}
                </h2>
              </div>
              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                {device.hardware.chassisPid}
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="capitalize">{device.type}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {device.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="
                flex h-7 w-7 shrink-0 items-center justify-center
                rounded-full text-slate-400
                transition-colors hover:bg-slate-100 hover:text-slate-700
              "
              title="Close"
              aria-label="Close panel"
            >
              <CloseIcon size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="space-y-2.5 px-4 py-4">
          {/* Identity */}
          <Accordion title="Identity" icon={<IdentityIcon size={14} />} badge={vIdentity} defaultOpen={true}>
            <FieldInline label="Hostname">
              <input
                type="text"
                value={hostnameDraft}
                onChange={(e) => setHostnameDraft(e.target.value)}
                onBlur={commitHostname}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitHostname();
                }}
                className="
                  w-full rounded-md border border-slate-300 bg-white
                  px-2 py-1 font-mono text-xs
                  focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
                "
              />
            </FieldInline>
            <FieldInline label="Type">
              <span className="text-xs font-medium capitalize text-slate-700">
                {device.type}
              </span>
            </FieldInline>
            <FieldInline label="Series">
              <span className="font-mono text-xs text-slate-700">
                {device.hardware.series}
              </span>
            </FieldInline>
          </Accordion>

          {/* Slot Configuration (modular only) */}
          {chassisIsModular && (
            <Accordion
              title="Slot Configuration"
              icon={<SlotConfigIcon size={14} />}
              badge={vSlots}
              defaultOpen={slotSectionOpen}
            >
              <SlotConfigSection
                device={device}
                selectedSlotId={selectedSlotId}
                onPatchHardware={patchHardware}
              />
            </Accordion>
          )}

          {/* Hardware Options */}
          <Accordion
            title="Hardware Options"
           icon={<HardwareIcon size={14} />}
            badge={vHardware}
            defaultOpen={false}
          >
            <FieldInline label="Region">
              <select
                value={device.hardware.region ?? globalDefaults.region}
                onChange={(e) =>
                  patchHardware({ region: e.target.value as Region })
                }
                className="
                  w-full rounded-md border border-slate-300 bg-white
                  px-2 py-1 text-xs
                  focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
                "
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FieldInline>

            {/* Modular PSU (card picker) */}
            {bundle?.psuConfig && (
              <>
                <FieldStacked label="PSU Model" hint="modular chassis">
                  <RadioCardGroup
                    name={`modpsu-${device.id}`}
                    icon="⚡"
                    value={
                      resolveModularPsuPid(
                        bundle.psuConfig,
                        device.hardware.modularPsuPid
                      ) ?? ""
                    }
                    options={bundle.psuConfig.options.map<RadioCardOption>(
                      (opt) => ({
                        value: opt.pid,
                        label: opt.label,
                        pid: opt.pid,
                        isDefault: opt.default,
                      })
                    )}
                    onChange={(v) => patchHardware({ modularPsuPid: v })}
                  />
                </FieldStacked>

                <FieldInline label="PSU Quantity">
                  <select
                    value={
                      device.hardware.modularPsuQty ??
                      bundle.psuConfig.defaultQty
                    }
                    onChange={(e) =>
                      patchHardware({ modularPsuQty: Number(e.target.value) })
                    }
                    className="
                      w-full rounded-md border border-slate-300 bg-white
                      px-2 py-1 text-xs
                    "
                  >
                    {Array.from(
                      { length: bundle.psuConfig.maxQty },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </FieldInline>
              </>
            )}

            {/* Fixed-switch PSU options (card picker) */}
            {psuOptions && (
              <>
                {userCanChangePrimary ? (
                  <FieldStacked label="Primary PSU">
                    <RadioCardGroup
                      name={`psu-${device.id}`}
                      icon={<PowerIcon size={14} />}
                      value={currentPid ?? ""}
                      options={psuOptions.primary.map<RadioCardOption>(
                        (opt) => ({
                          value: opt.pid,
                          label: opt.label,
                          pid: opt.pid,
                          isDefault: opt.default,
                        })
                      )}
                      onChange={(v) => patchHardware({ primaryPsuPid: v })}
                    />
                  </FieldStacked>
                ) : (
                  <FieldInline label="Primary PSU">
                    <span className="font-mono text-xs italic text-slate-600">
                      {currentPid} (built into chassis)
                    </span>
                  </FieldInline>
                )}

                <FieldInline label="Redundant">
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={device.hardware.redundantPsu ?? false}
                      onChange={(e) =>
                        patchHardware({ redundantPsu: e.target.checked })
                      }
                      className="accent-sky-500"
                    />
                    <span>Add redundant PSU</span>
                  </label>
                </FieldInline>

                {device.hardware.redundantPsu && redundantPid && (
                  <p className="pl-27.5 text-[10px] italic text-slate-500">
                    ↳ Redundant:{" "}
                    <span className="font-mono">{redundantPid}</span>
                  </p>
                )}
                {!device.hardware.redundantPsu && psuOptions.noRedundantPid && (
                  <p className="pl-27.5 text-[10px] italic text-slate-500">
                    ↳ Will emit:{" "}
                    <span className="font-mono">
                      {psuOptions.noRedundantPid}
                    </span>
                  </p>
                )}
              </>
            )}
          </Accordion>

          {/* Uplink Module (card picker) */}
          {networkModuleOptions && (
            <Accordion title="Uplink Module" icon={<UplinkIcon size={14} />} defaultOpen={false}>
              <FieldStacked label="Module">
                <RadioCardGroup
                  name={`netmod-${device.id}`}
                  icon={<UplinkIcon size={14} />}
                  value={currentNetworkModule ?? ""}
                  options={networkModuleOptions.options.map<RadioCardOption>(
                    (opt) => ({
                      value: opt.pid,
                      label: opt.label,
                      pid: opt.pid,
                      isDefault: opt.default,
                    })
                  )}
                  onChange={(v) => patchHardware({ networkModulePid: v })}
                />
              </FieldStacked>
            </Accordion>
          )}

          {/* SmartNet */}
          <Accordion
            title="SmartNet (Service Contract)"
            icon={<SmartnetIcon size={14} />}
            badge={vSmartnet}
            defaultOpen={false}
          >
            <FieldInline label="Tier">
              <select
                value={device.smartnet?.tier ?? globalDefaults.smartnetTier}
                onChange={(e) =>
                  onUpdate(device.id, {
                    smartnet: {
                      tier: e.target.value as SmartnetTier,
                      termYears:
                        device.smartnet?.termYears ??
                        globalDefaults.smartnetTermYears,
                      overridden: true,
                    },
                  })
                }
                className="
                  w-full rounded-md border border-slate-300 bg-white
                  px-2 py-1 font-mono text-xs
                "
              >
                {SMARTNET_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FieldInline>
            <FieldInline label="Term (years)">
              <select
                value={
                  device.smartnet?.termYears ?? globalDefaults.smartnetTermYears
                }
                onChange={(e) =>
                  onUpdate(device.id, {
                    smartnet: {
                      tier:
                        device.smartnet?.tier ?? globalDefaults.smartnetTier,
                      termYears: Number(e.target.value) as ContractTermYears,
                      overridden: true,
                    },
                  })
                }
                className="
                  w-full rounded-md border border-slate-300 bg-white
                  px-2 py-1 text-xs
                "
              >
                {TERMS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </FieldInline>
            {device.smartnet?.overridden && (
              <p className="text-[10px] italic text-amber-600">
                Overridden from global default
              </p>
            )}
          </Accordion>

          {/* License */}
          <Accordion title="License" icon={<LicenseIcon size={14} />} defaultOpen={false}>
            <FieldInline label="Term (years)">
              <select
                value={
                  device.license?.termYears ?? globalDefaults.licenseTermYears
                }
                onChange={(e) =>
                  onUpdate(device.id, {
                    license: {
                      termYears: Number(e.target.value) as ContractTermYears,
                      perpetual: device.license?.perpetual,
                    },
                  })
                }
                className="
                  w-full rounded-md border border-slate-300 bg-white
                  px-2 py-1 text-xs
                "
              >
                {TERMS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </FieldInline>
          </Accordion>

          {/* Live BOM Preview (only if project provided) */}
          {project && <BomPreviewMini project={project} device={device} />}

          {/* Series description footer */}
          {series && (
            <p className="border-t border-slate-200 pt-3 text-[10px] italic text-slate-400">
              {series.description}
            </p>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

// ============================================================
// Slot Configuration Section
// ============================================================
function SlotConfigSection({
  device,
  selectedSlotId,
  onPatchHardware,
}: {
  device: ConfiguredDevice;
  selectedSlotId?: string;
  onPatchHardware: (patch: Partial<HardwareConfig>) => void;
}) {
  const layout = useMemo(
    () => getChassisSlotLayout(device.hardware.chassisPid),
    [device.hardware.chassisPid]
  );

  useEffect(() => {
    if (selectedSlotId) {
      const el = document.getElementById(`slot-row-${selectedSlotId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedSlotId]);

  if (layout.length === 0) return null;

  const assignments = device.hardware.slots ?? [];
  const assignmentBySlotId = new Map(assignments.map((a) => [a.slotId, a]));

  const handleAssignModule = (
    slotId: string,
    slotKind: SlotAssignment["slotKind"],
    modulePid: string | null
  ) => {
    const filtered = assignments.filter((a) => a.slotId !== slotId);
    const next: SlotAssignment[] = modulePid
      ? [...filtered, { slotId, slotKind, modulePid }]
      : filtered;
    onPatchHardware({ slots: next });
  };

  return (
    <div className="flex flex-col gap-2">
      {layout.map((slotSpec) => {
        const slotId = String(slotSpec.slot);
        const assignment = assignmentBySlotId.get(slotId);
        const isHighlighted = selectedSlotId === slotId;
        const isEmpty = !assignment?.modulePid;
        const compatibleModules = getModulesForSlotKind(slotSpec.kind);

        return (
          <div
            key={slotId}
            id={`slot-row-${slotId}`}
            className={`
              rounded-lg border p-2 transition-all
              ${
                isHighlighted
                  ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                  : isEmpty && slotSpec.required
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-white"
              }
            `}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-slate-600">
                Slot {String(slotId).padStart(2, "0")}
                <span className="mx-1 text-slate-300">·</span>
                <span className="capitalize">{slotSpec.kind}</span>
                {slotSpec.required && (
                  <span
                    className="ml-1 text-amber-600"
                    title="Required slot"
                  >
                    ★
                  </span>
                )}
              </span>
              {assignment?.modulePid && (
                <button
                  onClick={() =>
                    handleAssignModule(slotId, slotSpec.kind, null)
                  }
                  className="text-[10px] font-medium text-rose-500 hover:text-rose-700"
                >
                  Remove
                </button>
              )}
            </div>

            <select
              value={assignment?.modulePid ?? ""}
              onChange={(e) =>
                handleAssignModule(
                  slotId,
                  slotSpec.kind,
                  e.target.value || null
                )
              }
              className="
                w-full rounded-md border border-slate-300 bg-white
                px-2 py-1 font-mono text-xs
                focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200
              "
            >
              <option value="">— empty —</option>
              {compatibleModules.map((m: ModuleCatalogEntry) => (
                <option key={m.pid} value={m.pid}>
                  {m.pid}
                  {m.modulePorts
                    ? ` · ${m.modulePorts.count}× ${m.modulePorts.speed}${
                        m.modulePorts.poe ? " " + m.modulePorts.poe : ""
                      }`
                    : ""}
                </option>
              ))}
            </select>

            {slotSpec.note && (
              <p className="mt-1 text-[9px] italic text-slate-500">
                {slotSpec.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}