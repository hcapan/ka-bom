"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ConfiguredDevice,
  GlobalDefaults,
  Region,
  SmartnetTier,
  ContractTermYears,
  HardwareConfig,
  SlotAssignment,
} from "@/app/lib/types";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import {
  getChassisSlotLayout,
  getModulesForSlotKind,
  isModularChassis,
  type ModuleCatalogEntry,
} from "@/app/lib/hardware/chassisHelpers";

type Props = {
  device: ConfiguredDevice | null;
  globalDefaults: GlobalDefaults;
  selectedSlotId?: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ConfiguredDevice>) => void;
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
}: Props) {
  // Local hostname draft so typing doesn't thrash the global state

  const [hostnameDraft, setHostnameDraft] = useState(device?.name ?? "");
  const [lastSyncedDeviceKey, setLastSyncedDeviceKey] = useState<string | null>(
    device ? `${device.id}:${device.name}` : null,
  );

  // React 19 idiom: derive state during render, no effect needed
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
    onUpdate(device.id, {
      hardware: { ...device.hardware, ...patch },
    });
  };

  const commitHostname = () => {
    if (hostnameDraft && hostnameDraft !== device.name) {
      onUpdate(device.id, { name: hostnameDraft });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity"
        style={{ pointerEvents: "auto" }}
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              ⚙ Configure Device
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {device.id} · {device.hardware.chassisPid}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* ─── Identity ─────────────────────────────── */}
          <Section title="Identity">
            <Field label="Hostname">
              <input
                type="text"
                value={hostnameDraft}
                onChange={(e) => setHostnameDraft(e.target.value)}
                onBlur={commitHostname}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitHostname();
                }}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
            </Field>
            <Field label="Type">
              <span className="text-xs font-medium text-slate-700 capitalize">
                {device.type}
              </span>
            </Field>
            <Field label="Series">
              <span className="text-xs font-mono text-slate-700">
                {device.hardware.series}
              </span>
            </Field>
          </Section>

          {/* ─── Slot Configuration (modular only) ────── */}
          {chassisIsModular && (
            <SlotConfigSection
              device={device}
              selectedSlotId={selectedSlotId}
              onPatchHardware={patchHardware}
            />
          )}

          {/* ─── Hardware Options ─────────────────────── */}
          <Section title="Hardware Options">
            <Field label="Region">
              <select
                value={device.hardware.region ?? globalDefaults.region}
                onChange={(e) =>
                  patchHardware({ region: e.target.value as Region })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Redundant PSU">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={device.hardware.redundantPsu ?? false}
                  onChange={(e) =>
                    patchHardware({ redundantPsu: e.target.checked })
                  }
                />
                <span>Add redundant power supply</span>
              </label>
            </Field>
          </Section>

          {/* ─── SmartNet Override ────────────────────── */}
          <Section title="SmartNet (Service Contract)">
            <Field label="Tier">
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
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              >
                {SMARTNET_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Term (years)">
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
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                {TERMS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            {device.smartnet?.overridden && (
              <p className="text-[10px] text-amber-600 italic">
                Overridden from global default
              </p>
            )}
          </Section>

          {/* ─── License Override ─────────────────────── */}
          <Section title="License">
            <Field label="Term (years)">
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
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                {TERMS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            
          </Section>

          {series && (
            <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              {series.description}
            </p>
          )}
        </div>
      </aside>
    </>
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
    [device.hardware.chassisPid],
  );

  // If a slot is selected, scroll to it on open
  useEffect(() => {
    if (selectedSlotId) {
      const el = document.getElementById(`slot-row-${selectedSlotId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedSlotId]);

  if (layout.length === 0) return null;

  const assignments = device.hardware.slots ?? [];
  const assignmentBySlotId = new Map(assignments.map((a) => [a.slotId, a]));

  const handleAssignModule = (
    slotId: string,
    slotKind: SlotAssignment["slotKind"],
    modulePid: string | null,
  ) => {
    const filtered = assignments.filter((a) => a.slotId !== slotId);
    const next: SlotAssignment[] = modulePid
      ? [...filtered, { slotId, slotKind, modulePid }]
      : filtered;
    onPatchHardware({ slots: next });
  };

  return (
    <Section title="Slot Configuration">
      <div className="flex flex-col gap-2">
        {layout.map((slotSpec) => {
          const slotId = String(slotSpec.slot);
          const assignment = assignmentBySlotId.get(slotId);
          const isHighlighted = selectedSlotId === slotId;
          const compatibleModules = getModulesForSlotKind(slotSpec.kind);

          return (
            <div
              key={slotId}
              id={`slot-row-${slotId}`}
              className={`rounded border p-2 transition-colors ${
                isHighlighted
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  Slot {String(slotId).padStart(2, "0")} ·{" "}
                  <span className="capitalize">{slotSpec.kind}</span>
                  {slotSpec.required && (
                    <span className="text-amber-600 ml-1">★</span>
                  )}
                </span>
                {assignment?.modulePid && (
                  <button
                    onClick={() =>
                      handleAssignModule(slotId, slotSpec.kind, null)
                    }
                    className="text-[10px] text-red-500 hover:text-red-700"
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
                    e.target.value || null,
                  )
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
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
                <p className="text-[9px] text-slate-500 italic mt-1">
                  {slotSpec.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ============================================================
// Layout primitives
// ============================================================
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
      <label className="text-[11px] text-slate-600 font-medium">{label}</label>
      <div>{children}</div>
    </div>
  );
}
