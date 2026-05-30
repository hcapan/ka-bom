import type {
  DeviceCategory,
  SwitchAttrs,
  SwitchSeries,
  SwitchProductSKU,
} from "./types";
import { getEffectiveCatalog } from "./catalog";

/** Returns only series matching a UI category. */
export function getSeriesByCategory(
  category: DeviceCategory,
): Record<string, SwitchSeries> {
  const catalog = getEffectiveCatalog();
  return Object.fromEntries(
    Object.entries(catalog).filter(([, s]) => s.category === category),
  );
}

/** Filter shape for switch attribute chips. */
export type SwitchAttrFilters = Partial<{
  portCount: SwitchAttrs["portCount"];
  portType: SwitchAttrs["portType"];
  poeClass: SwitchAttrs["poeClass"];
  uplinkType: SwitchAttrs["uplinkType"];
}>;

/** Filter PIDs in a series using switch attribute filters. */
export function filterSwitchPids(
  series: SwitchSeries,
  filters: SwitchAttrFilters,
): SwitchProductSKU[] {
  const anyFilterActive = Object.values(filters).some((v) => v !== undefined);

  return series.pids.filter((p) => {
    if (!p.attrs || p.attrs.kind !== "switch") {
      // PIDs without attrs only show when no filter is active
      return !anyFilterActive;
    }
    const a = p.attrs;
    if (filters.portCount !== undefined && a.portCount !== filters.portCount)
      return false;
    if (filters.portType !== undefined && a.portType !== filters.portType)
      return false;
    if (filters.poeClass !== undefined && a.poeClass !== filters.poeClass)
      return false;
    if (filters.uplinkType !== undefined && a.uplinkType !== filters.uplinkType)
      return false;
    return true;
  });
}

/** Returns the unique attribute values present in a series — used to build chip options. */
export function getAvailableAttrValues(series: SwitchSeries) {
  const portCount = new Set<number>();
  const portType = new Set<SwitchAttrs["portType"]>();
  const poeClass = new Set<SwitchAttrs["poeClass"]>();
  const uplinkType = new Set<SwitchAttrs["uplinkType"]>();

  for (const p of series.pids) {
    if (!p.attrs || p.attrs.kind !== "switch") continue;
    portCount.add(p.attrs.portCount);
    portType.add(p.attrs.portType);
    poeClass.add(p.attrs.poeClass);
    uplinkType.add(p.attrs.uplinkType);
  }

  return {
    portCount: Array.from(portCount).sort((a, b) => a - b),
    portType: Array.from(portType),
    poeClass: Array.from(poeClass),
    uplinkType: Array.from(uplinkType),
  };
}