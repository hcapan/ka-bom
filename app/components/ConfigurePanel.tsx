"use client";

import {
  ConfiguredDevice,
  Region,
  SmartnetTier,
  ContractTermYears,
  GlobalDefaults,
} from "../lib/types";
import { HARDWARE_LIBRARY, getBundle } from "../lib/hardware";

type Props = {
  device: ConfiguredDevice | null;
  globalDefaults: GlobalDefaults;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ConfiguredDevice>) => void;
};

const REGIONS: { value: Region; label: string }[] = [
  { value: "EU", label: "Europe (EU)" },
  { value: "US", label: "United States (US/NA)" },
  { value: "UK", label: "United Kingdom (UK)" },
  { value: "JP", label: "Japan (JP)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "IN", label: "India (IN)" },
  { value: "CN", label: "China (CN)" },
];

const SMARTNET_TIERS: {
  value: SmartnetTier;
  label: string;
  description: string;
}[] = [
  { value: "SNT",  label: "SNT — SMARTnet 8x5xNBD",         description: "Business-hours, next-business-day delivery" },
  { value: "SNTP", label: "SNTP — SMARTnet Premium 24x7x4", description: "24/7, 4-hour replacement" },
  { value: "OS",   label: "OS — Solution Support 8x5xNBD",  description: "Multi-vendor solution support" },
  { value: "OSP",  label: "OSP — Solution Support Premium", description: "24/7 solution support" },
  { value: "PSUP", label: "PSUP — Partner Support",          description: "Partner-delivered" },
  { value: "ECMU", label: "ECMU — Software Only",            description: "Software entitlement only" },
  { value: "NONE", label: "NONE — No Support",               description: "No service contract" },
];

const TERMS: ContractTermYears[] = [1, 3, 5, 7];

export default function ConfigurePanel({
  device,
  globalDefaults,
  onClose,
  onUpdate,
}: Props) {
  // ✅ No local state — read directly from prop
  if (!device) return null;

  const series = HARDWARE_LIBRARY[device.hardware.series];
  const productInfo = series?.pids.find(
    (p) => p.pid === device.hardware.chassisPid
  );
  const bundle = getBundle(device.hardware.series, device.hardware.chassisPid);
  const hasBundle = bundle !== null;

  // Effective values (device override → global default)
  const effectiveRegion = device.hardware.region ?? globalDefaults.region;
  const effectiveLicenseTerm =
    device.license?.termYears ?? globalDefaults.licenseTermYears;
  const effectiveSmartnetTier =
    device.smartnet?.tier ?? globalDefaults.smartnetTier;
  const effectiveSmartnetTerm =
    device.smartnet?.termYears ?? globalDefaults.smartnetTermYears;

  // Helpers — push patches upward
  const patch = (changes: Partial<ConfiguredDevice>) => {
    onUpdate(device.id, changes);
  };

  const patchHardware = (
    hwChanges: Partial<ConfiguredDevice["hardware"]>
  ) => {
    patch({ hardware: { ...device.hardware, ...hwChanges } });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-105 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* ====== HEADER ====== */}
        <div className="flex justify-between items-start p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Configure Device
            </p>
            <h2 className="text-lg font-bold text-slate-800 truncate">
              {device.name}
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {device.id} · {device.hardware.chassisPid}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold shrink-0 ml-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ====== BODY ====== */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* ---------- HOSTNAME ---------- */}
          <Section title="Identity">
            <Field label="Hostname">
              <input
                type="text"
                value={device.name}
                onChange={(e) => patch({ name: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded text-sm font-mono"
              />
            </Field>
          </Section>

          {/* ---------- HARDWARE INFO ---------- */}
          <Section title="Hardware">
            <Readout label="Series" value={device.hardware.series} />
            <Readout
              label="Chassis PID"
              value={device.hardware.chassisPid}
              mono
            />
            <Readout
              label="Description"
              value={productInfo?.description ?? "—"}
            />
            {productInfo?.faceplate && (
              <Readout
                label="Ports"
                value={
                  productInfo.faceplate.accessPorts
                    ? `${productInfo.faceplate.accessPorts.count}× ${productInfo.faceplate.accessPorts.speed}` +
                      (productInfo.faceplate.uplinkPorts
                        ? ` + ${productInfo.faceplate.uplinkPorts.count}× ${productInfo.faceplate.uplinkPorts.speed}`
                        : "")
                    : "—"
                }
              />
            )}
            {!hasBundle && (
              <div className="mt-3 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                ⚠ Bundle config not yet available for this PID. License,
                SmartNet, and power options will be added as the catalog
                grows.
              </div>
            )}
          </Section>

          {/* ---------- POWER ---------- */}
          {hasBundle && bundle && (
            <Section title="Power">
              <Field
                label="Region (Power Cord)"
                hint={`Default: ${globalDefaults.region} (project-wide)`}
              >
                <select
                  value={effectiveRegion}
                  onChange={(e) =>
                    patchHardware({ region: e.target.value as Region })
                  }
                  className="w-full border border-slate-200 p-2 rounded text-sm"
                >
                  {REGIONS.filter(
                    (r) => bundle.powerCord.byRegion[r.value]
                  ).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} → {bundle.powerCord.byRegion[r.value]}
                    </option>
                  ))}
                </select>
              </Field>

              {bundle.redundantPsu && (
                <label className="flex items-start gap-2 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={device.hardware.redundantPsu === true}
                    onChange={(e) =>
                      patchHardware({ redundantPsu: e.target.checked })
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                      Add Redundant PSU
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {bundle.redundantPsu.pid}
                    </p>
                    <p className="text-[10px] text-slate-400 italic mt-0.5">
                      {bundle.redundantPsu.description}
                    </p>
                  </div>
                </label>
              )}
            </Section>
          )}

          {/* ---------- LICENSE ---------- */}
          {hasBundle && bundle && (
            <Section title="License">
              <Readout label="Tier" value={bundle.license.tier} />
              <Readout
                label="Entitlement PID"
                value={bundle.license.entitlementPid}
                mono
              />

              <Field
                label="Subscription Term"
                hint={`Default: ${globalDefaults.licenseTermYears} year (project-wide)`}
              >
                <div className="grid grid-cols-4 gap-2">
                  {TERMS.filter(
                    (t) => bundle.license.subscriptionByTerm[t]
                  ).map((t) => {
                    const isSelected = effectiveLicenseTerm === t;
                    return (
                      <button
                        key={t}
                        onClick={() =>
                          patch({ license: { termYears: t } })
                        }
                        className={`text-xs py-2 rounded border font-bold transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {t}Y
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-2">
                  →{" "}
                  {bundle.license.subscriptionByTerm[effectiveLicenseTerm] ??
                    "(not available)"}
                </p>
              </Field>
            </Section>
          )}

          {/* ---------- SMARTNET ---------- */}
          {hasBundle && bundle && (
            <Section title="SmartNet">
              <Field
                label="Service Tier"
                hint={`Default: ${globalDefaults.smartnetTier} (project-wide)`}
              >
                <select
                  value={effectiveSmartnetTier}
                  onChange={(e) =>
                    patch({
                      smartnet: {
                        tier: e.target.value as SmartnetTier,
                        termYears: effectiveSmartnetTerm,
                        overridden: true,
                      },
                    })
                  }
                  className="w-full border border-slate-200 p-2 rounded text-sm"
                >
                  {SMARTNET_TIERS.filter(
                    (t) =>
                      t.value === "NONE" ||
                      bundle.smartnet.baseSkuByTier[t.value]
                  ).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  {
                    SMARTNET_TIERS.find(
                      (t) => t.value === effectiveSmartnetTier
                    )?.description
                  }
                </p>
              </Field>

              <Field
                label="Contract Term"
                hint={`Default: ${globalDefaults.smartnetTermYears} year (project-wide)`}
              >
                <div className="grid grid-cols-4 gap-2">
                  {TERMS.map((t) => {
                    const isSelected = effectiveSmartnetTerm === t;
                    return (
                      <button
                        key={t}
                        onClick={() =>
                          patch({
                            smartnet: {
                              tier: effectiveSmartnetTier,
                              termYears: t,
                              overridden: true,
                            },
                          })
                        }
                        className={`text-xs py-2 rounded border font-bold transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        disabled={effectiveSmartnetTier === "NONE"}
                      >
                        {t}Y
                      </button>
                    );
                  })}
                </div>
                {effectiveSmartnetTier !== "NONE" && (
                  <p className="text-[10px] text-slate-400 font-mono mt-2">
                    →{" "}
                    {bundle.smartnet.baseSkuByTier[effectiveSmartnetTier] ??
                      "(not available)"}
                  </p>
                )}
              </Field>
            </Section>
          )}

          {/* ---------- NOTES ---------- */}
          <Section title="Notes">
            <textarea
              value={device.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Free-form notes for this device (BOM remarks, deployment notes, etc.)"
              rows={3}
              className="w-full border border-slate-200 p-2 rounded text-sm resize-none"
            />
          </Section>
        </div>

        {/* ====== FOOTER ====== */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 text-[10px] text-slate-500 italic text-center">
          Changes save automatically
        </div>
      </aside>
    </>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-slate-400 italic mt-1">{hint}</p>
      )}
    </div>
  );
}

function Readout({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-slate-700 text-right ${
          mono ? "font-mono text-[11px]" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}