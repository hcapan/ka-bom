import { Link } from "../types";

export interface BundledEdge {
  bundleId: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  count: number;
  opticPid: string;
  totalBandwidthGbps: number;
  linkIds: string[];
}

const OPTIC_SPEED_GBPS: Record<string, number> = {
  "SFP-1G-T": 1,
  "GLC-SX-MMD": 1,
  "GLC-LH-SMD": 1,
  "SFP-10G-SR": 10,
  "SFP-10G-SR-S": 10,
  "SFP-10G-LR": 10,
  "SFP-10G-LR-S": 10,
  "SFP-25G-SR-S": 25,
  "QSFP-40G-SR4": 40,
  "QSFP-100G-SR4": 100,
  "QSFP-100G-LR4": 100,
  "QSFP-100G-SR4-S": 100,
  "QSFP-100G-LR4-S": 100,
  "QDD-400G-SR8-S": 400,
};

function speedFor(pid: string): number {
  if (OPTIC_SPEED_GBPS[pid] !== undefined) return OPTIC_SPEED_GBPS[pid];
  // Heuristic fallback
  if (pid.includes("400G")) return 400;
  if (pid.includes("100G")) return 100;
  if (pid.includes("40G")) return 40;
  if (pid.includes("25G")) return 25;
  if (pid.includes("10G")) return 10;
  return 0;
}

/**
 * Group parallel links between the same (source, target, optic, handles) pair
 * into bundles. Sprint 4: input links may have already been redirected to
 * collapsed-group ancestors, so bundling naturally produces trunks.
 */
export function bundleLinks(links: Link[]): BundledEdge[] {
  const groups = new Map<string, Link[]>();

  for (const l of links) {
    // Normalize pair so A->B and B->A bundle together
    const [a, b] = [l.from, l.to].sort();
    const optic = l.optic?.pid ?? "UNSPECIFIED";
    // Include handles so HA links don't bundle with hierarchy links
    const sH = l.sourceHandle ?? "_";
    const tH = l.targetHandle ?? "_";
    const key = `${a}|${b}|${optic}|${sH}|${tH}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  return Array.from(groups.entries()).map(([_key, group]) => {
    const first = group[0];
    const opticPid = first.optic?.pid ?? "—";
    const speed = speedFor(opticPid);

    return {
      bundleId: `BNDL-${first.from}|${first.to}|${opticPid}|${first.sourceHandle ?? "_"}|${first.targetHandle ?? "_"}`,
      source: first.from,
      target: first.to,
      sourceHandle: first.sourceHandle ?? "b",
      targetHandle: first.targetHandle ?? "t",
      count: group.length,
      opticPid,
      totalBandwidthGbps: speed * group.length,
      linkIds: group.map((l) => l.id),
    };
  });
}