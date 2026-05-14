import { HARDWARE_LIBRARY } from "../../lib/hardware/catalog";
import { getBundleStatus } from "./BundleStatusBadge";

export default function LibraryStats() {
  let totalPids = 0;
  let withBundle = 0;
  let faceplateOnly = 0;
  let stub = 0;

  for (const series of Object.values(HARDWARE_LIBRARY)) {
    for (const pid of series.pids) {
      totalPids++;
      const status = getBundleStatus(pid);
      if (status === "complete") withBundle++;
      else if (status === "faceplate-only") faceplateOnly++;
      else stub++;
    }
  }

  const coverage = totalPids > 0 ? Math.round((withBundle / totalPids) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-6">
      <Stat icon="📦" label="Total PIDs" value={totalPids} />
      <Stat icon="✓" label="With Bundle" value={withBundle} color="text-emerald-600" />
      <Stat icon="⚠" label="Faceplate Only" value={faceplateOnly} color="text-amber-600" />
      <Stat icon="✕" label="Stubs" value={stub} color="text-rose-600" />
      <div className="flex-1" />
      <div className="text-right">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Catalog Coverage
        </p>
        <p className="text-2xl font-bold text-slate-800">{coverage}%</p>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color = "text-slate-700",
}: {
  icon: string;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        {icon} {label}
      </p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}