import { ProductSKU } from "../../lib/hardware/catalog";

type Props = {
  pid: ProductSKU;
  size?: "sm" | "md";
};

export type BundleStatus = "complete" | "faceplate-only" | "stub";

export function getBundleStatus(pid: ProductSKU): BundleStatus {
  if (pid.bundle) return "complete";
  if (pid.faceplate) return "faceplate-only";
  return "stub";
}

const STATUS_CONFIG: Record<
  BundleStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  complete: {
    label: "Bundle ✓",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: "✓",
  },
  "faceplate-only": {
    label: "Faceplate",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: "⚠",
  },
  stub: {
    label: "Stub",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    icon: "✕",
  },
};

export default function BundleStatusBadge({ pid, size = "md" }: Props) {
  const status = getBundleStatus(pid);
  const cfg = STATUS_CONFIG[status];
  const sizeClass = size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold border ${cfg.bg} ${cfg.text} ${sizeClass}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}