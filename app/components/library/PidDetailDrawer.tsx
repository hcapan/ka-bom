"use client";
import { ProductSKU, HARDWARE_LIBRARY } from "../../lib/hardware";
import BundleStatusBadge from "./BundleStatusBadge";

type Props = {
  seriesName: string | null;
  pid: ProductSKU | null;
  onClose: () => void;
};

export default function PidDetailDrawer({ seriesName, pid, onClose }: Props) {
  if (!pid || !seriesName) return null;

  const series = HARDWARE_LIBRARY[seriesName];
  const bundle = pid.bundle;
  const fp = pid.faceplate;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-105 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Product Details
            </p>
            <h2 className="text-lg font-bold text-slate-800 truncate font-mono">
              {pid.pid}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{seriesName}</p>
            <div className="mt-2">
              <BundleStatusBadge pid={pid} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold shrink-0 ml-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Description */}
          <Section title="Overview">
            <Readout label="Vendor"      value={series.vendor} />
            <Readout label="Layer"       value={series.type.toUpperCase()} />
            <Readout label="Description" value={pid.description} multiline />
          </Section>

          {/* Faceplate */}
          {fp && (
            <Section title="Physical">
              {fp.accessPorts && (
                <Readout
                  label="Access Ports"
                  value={`${fp.accessPorts.count}× ${fp.accessPorts.speed}${fp.accessPorts.poe ? " PoE+" : ""}`}
                />
              )}
              {fp.uplinkPorts && (
                <Readout
                  label="Uplink Ports"
                  value={`${fp.uplinkPorts.count}× ${fp.uplinkPorts.speed}`}
                />
              )}
              {fp.modularSlots && (
                <Readout label="Modular Slots" value={String(fp.modularSlots)} />
              )}
              {fp.rackUnits && (
                <Readout label="Rack Units" value={`${fp.rackUnits}U`} />
              )}
            </Section>
          )}

          {/* Bundle */}
          {bundle ? (
            <>
              <Section title="Auto-Included Items">
                {bundle.autoIncluded.map((item) => (
                  <div
                    key={item.pid}
                    className="flex justify-between items-start py-1 text-xs border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-slate-700">{item.pid}</p>
                      {item.note && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-500 font-mono ml-2">× {item.qty}</span>
                  </div>
                ))}
              </Section>

              <Section title="Power Cord">
                <p className="text-[11px] text-slate-500 mb-2">
                  {bundle.powerCord.qty} cord(s) per chassis
                </p>
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(bundle.powerCord.byRegion).map(([region, pidStr]) => (
                      <tr key={region} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-1 text-slate-500 w-12">{region}</td>
                        <td className="py-1 font-mono text-slate-700">{pidStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {bundle.redundantPsu && (
                <Section title="Redundant PSU (Optional)">
                  <Readout label="PID" value={bundle.redundantPsu.pid} mono />
                  <Readout label="Description" value={bundle.redundantPsu.description} />
                </Section>
              )}

              <Section title="License">
                <Readout label="Tier"           value={bundle.license.tier} />
                <Readout label="Entitlement"    value={bundle.license.entitlementPid} mono />
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-3 mb-1">
                  Subscriptions
                </p>
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(bundle.license.subscriptionByTerm).map(([term, pidStr]) => (
                      <tr key={term} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-1 text-slate-500 w-12">{term}Y</td>
                        <td className="py-1 font-mono text-slate-700">{pidStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section title="SmartNet">
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(bundle.smartnet.baseSkuByTier).map(([tier, pidStr]) => (
                      <tr key={tier} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-1 text-slate-500 w-12">{tier}</td>
                        <td className="py-1 font-mono text-slate-700">{pidStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {bundle.stacking && (
                <Section title="Stacking">
                  <Readout
                    label="Adapter Required"
                    value={bundle.stacking.adapterRequired ? "Yes" : "No (kit included)"}
                  />
                  {bundle.stacking.adapterKits?.length ? (
                    <Readout
                      label="Adapter Kits"
                      value={bundle.stacking.adapterKits.join(", ")}
                      mono
                    />
                  ) : null}
                  {bundle.stacking.dataCables?.length ? (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-2 mb-1">
                        Data Cables
                      </p>
                      {bundle.stacking.dataCables.map((c) => (
                        <p key={c.pid} className="font-mono text-xs text-slate-700">
                          {c.pid} <span className="text-slate-400">— {c.length}</span>
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {bundle.stacking.powerCables?.length ? (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-2 mb-1">
                        Power Cables
                      </p>
                      {bundle.stacking.powerCables.map((c) => (
                        <p key={c.pid} className="font-mono text-xs text-slate-700">
                          {c.pid} <span className="text-slate-400">— {c.length}</span>
                        </p>
                      ))}
                    </div>
                  ) : null}
                </Section>
              )}
            </>
          ) : (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              ⚠ This PID has no CCW bundle defined yet. Add bundle data via JSON
              override or update <code>hardware.ts</code> to enable BOM export
              for this device.
            </div>
          )}

          {/* Compatible Optics */}
          <Section title="Compatible Optics (Series-Wide)">
            <div className="flex flex-wrap gap-1">
              {series.compatibleOptics.map((o) => (
                <span
                  key={o}
                  className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700"
                >
                  {o}
                </span>
              ))}
            </div>
          </Section>

          {/* Raw JSON */}
          <Section title="Raw JSON">
            <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-3 rounded overflow-x-auto custom-scrollbar">
              {JSON.stringify(pid, null, 2)}
            </pre>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Readout({
  label,
  value,
  mono = false,
  multiline = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-xs text-slate-700">{value}</p>
      </div>
    );
  }
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