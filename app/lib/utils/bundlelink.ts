// app/lib/utils/bundleLinks.ts
import { Link } from "../types";

export interface BundledEdge {
  bundleId: string;          // stable: "BNDL-{a}-{b}-{optic}"
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  count: number;
  opticPid: string;
  totalBandwidthGbps: number;
  linkIds: string[];          // original Link.ids in this bundle
}

// Optic speed lookup (extend as needed)
const OPTIC_SPEED_GBPS: Record<string, number> = {
  "SFP-10G-SR-S": 10,
  "SFP-10G-LR-S": 10,
  "QSFP-40G-SR4": 40,
  "QSFP-100G-SR4-S": 100,
  "QSFP-100G-LR4-S": 100,
  "SFP-25G-SR-S": 25,
};

export function bundleLinks(links: Link[]): BundledEdge[] {
  const groups = new Map<string, Link[]>();

  for (const l of links) {
    // Normalize pair so A->B and B->A bundle together
    const [a, b] = [l.from, l.to].sort();
    const optic = l.optic?.pid ?? "UNSPECIFIED";
    const key = `${a}|${b}|${optic}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const first = group[0];
    const speed = OPTIC_SPEED_GBPS[first.optic?.pid ?? ""] ?? 0;
    return {
      bundleId: `BNDL-${key}`,
      source: first.from,
      target: first.to,
      sourceHandle: first.sourceHandle ?? "bottom",
      targetHandle: first.targetHandle ?? "top",
      count: group.length,
      opticPid: first.optic?.pid ?? "—",
      totalBandwidthGbps: speed * group.length,
      linkIds: group.map((l) => l.id),
    };
  });
}