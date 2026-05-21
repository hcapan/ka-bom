import { ProductSKU } from "../../lib/hardware/catalog";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Cable,
  XCircle,
} from "lucide-react";
 

type Props = {
  pid: ProductSKU;
  size?: "sm" | "md";
};

type StatTone = "neutral" | "emerald" | "blue" | "violet" | "sky" | "amber" | "rose";

export const TONE_STYLES: Record<StatTone, { text: string; bg: string; ring: string; icon: string }> = {
  neutral: { text: "text-slate-800",   bg: "bg-slate-50",   ring: "ring-slate-200",   icon: "text-slate-500" },
  emerald: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", icon: "text-emerald-500" },
  blue:    { text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-200",    icon: "text-blue-500" },
  violet:  { text: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-200",  icon: "text-violet-500" },
  sky:     { text: "text-sky-700",     bg: "bg-sky-50",     ring: "ring-sky-200",     icon: "text-sky-500" },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200",   icon: "text-amber-500" },
  rose:    { text: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200",    icon: "text-rose-500" },
};



export type BundleStatus =
  | "complete"
  | "faceplate-only"
  | "linecard"
  | "supervisor"
  | "accessories"
  | "stub";

export function getBundleStatus(pid: ProductSKU): BundleStatus {
  if (pid.bundle) return "complete";
  if (pid.faceplate) return "faceplate-only";
  if (pid.kind === "linecard") return "linecard";
  if (pid.kind === "supervisor") return "supervisor";
  if (
    pid.kind === "stacking-cable" ||
    pid.kind === "stack-power-cable" ||
    pid.kind === "psu" ||
    pid.kind === "fan"
  )
    return "accessories";

  return "stub";
}

const STATUS_CONFIG: Record<
  BundleStatus,
  {
    label: string;
    bg: string;
    text: string;
    ring: string;
    icon: React.ElementType;
  }
> = {
  complete: {
    label: "Bundle",
    bg: TONE_STYLES.emerald.bg,
    text: TONE_STYLES.emerald.text,
    ring: TONE_STYLES.emerald.ring,
    icon: CheckCircle2,
  },

  "faceplate-only": {
    label: "Faceplate",
    bg: TONE_STYLES.amber.bg,
    text: TONE_STYLES.amber.text,
    ring: TONE_STYLES.amber.ring,
    icon: AlertTriangle,
  },

  linecard: {
    label: "Linecard",
    bg: TONE_STYLES.sky.bg,
    text: TONE_STYLES.sky.text,
    ring: TONE_STYLES.sky.ring,
    icon: Layers,
  },

  accessories: {
    label: "Accessories",
    bg: TONE_STYLES.amber.bg,
    text: TONE_STYLES.amber.text,
    ring: TONE_STYLES.amber.ring,
    icon: Cable,
  },

  supervisor: {
    label: "Supervisor",
    bg: TONE_STYLES.violet.bg,
    text: TONE_STYLES.violet.text,
    ring: TONE_STYLES.violet.ring,
    icon: Cpu,
  },

  stub: {
    label: "Stub",
    bg: TONE_STYLES.rose.bg,
    text: TONE_STYLES.rose.text,
    ring: TONE_STYLES.rose.ring,
    icon: XCircle,
  },
};

export default function BundleStatusBadge({ pid, size = "md" }: Props) {
  const status = getBundleStatus(pid);
  const cfg = STATUS_CONFIG[status];
  const sizeClass =
    size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold border ${cfg.bg} ${cfg.text} ${sizeClass}`}
    >
      <Icon className="w-3.5 h-3.5"/>
      {cfg.label}
    </span>
  );
}
