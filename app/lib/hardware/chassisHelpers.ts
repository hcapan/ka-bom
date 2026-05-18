import slotLayoutsJson from "./data/slot-layouts.json";
import { getEffectiveCatalog } from "./catalog";
import type { SlotKind, SlotAssignment, ConfiguredDevice } from "../types";

// ============================================================
// Slot layout lookup
// ============================================================

type SlotLayoutEntry = {
  slot: number;
  kind: SlotKind;
  required?: boolean;
  note?: string;
};

type SlotLayoutsFile = {
  schemaVersion: number;
  layouts: Record<string, SlotLayoutEntry[]>;
};

const layouts = (slotLayoutsJson as SlotLayoutsFile).layouts;

/**
 * Returns the slot layout for a chassis PID.
 * Returns empty array if PID has no defined layout (i.e. not modular).
 */
export function getChassisSlotLayout(chassisPid: string): SlotLayoutEntry[] {
  return layouts[chassisPid] ?? [];
}

/**
 * Returns true if the given PID is a modular chassis with a known layout.
 */
export function isModularChassis(chassisPid: string): boolean {
  return Boolean(layouts[chassisPid]);
}

// ============================================================
// Module catalog access
// ============================================================

type ModuleKind = "supervisor" | "linecard" | "service-module" | "psu" | "fan" | "fabric-module";

export type ModuleCatalogEntry = {
  pid: string;
  description: string;
  vendor: string;
  kind: ModuleKind;
  slotKind?: SlotKind;
  modulePorts?: {
    count: number;
    speed: string;
    poe?: "PoE+" | "UPOE" | "UPOE+";
  };
};

/**
 * Returns all modules across all "isModuleCatalog: true" series.
 * Cached on first call.
 */
let moduleCache: ModuleCatalogEntry[] | null = null;

export function getAllModules(): ModuleCatalogEntry[] {
  if (moduleCache) return moduleCache;

  const catalog = getEffectiveCatalog();
  const modules: ModuleCatalogEntry[] = [];

  for (const series of Object.values(catalog)) {
    if (!series.isModuleCatalog) continue;
    for (const pid of series.pids) {
      modules.push(pid as unknown as ModuleCatalogEntry);
    }
  }

  moduleCache = modules;
  return modules;
}

/** Clears the module cache. Call after override changes. */
export function clearModuleCache(): void {
  moduleCache = null;
}

/**
 * Looks up a single module entry by its PID.
 */
export function getModuleByPid(pid: string): ModuleCatalogEntry | undefined {
  return getAllModules().find((m) => m.pid === pid);
}

/**
 * Returns modules that fit a given slot kind.
 * Used by the slot configuration popover/panel.
 */
export function getModulesForSlotKind(slotKind: SlotKind): ModuleCatalogEntry[] {
  return getAllModules().filter((m) => m.slotKind === slotKind);
}

// ============================================================
// Auto-includes (Question 5: yes)
// ============================================================

/**
 * Picks sensible default modules for a freshly-created modular chassis.
 * Currently hard-coded heuristics; later this can read from `series.autoIncludes`.
 */
export function getDefaultAutoIncludes(chassisPid: string): {
  slots: SlotAssignment[];
  externalModules: { pid: string; qty: number }[];
} {
  const layout = getChassisSlotLayout(chassisPid);
  if (layout.length === 0) {
    return { slots: [], externalModules: [] };
  }

  const slots: SlotAssignment[] = [];

  // 1. Auto-fill the FIRST required supervisor slot only.
  //    Redundant supervisor stays empty (user adds it explicitly).
  const supSlot = layout.find(
    (s) => s.kind === "supervisor" && s.required,
  );
  if (supSlot) {
    slots.push({
      slotId: String(supSlot.slot),
      slotKind: "supervisor",
      modulePid: pickDefaultSupervisor(chassisPid),
    });
  }

  // 2. Linecards: leave empty by default — user populates them.

  // 3. PSUs and fans: not in slot layout (they're external).
  //    Returned via externalModules so useProject can put them somewhere
  //    appropriate (or just track them in BOM).
  const externalModules: { pid: string; qty: number }[] = [
    { pid: pickDefaultPsu(chassisPid), qty: 1 },
    { pid: "C9400-FAN", qty: 1 },
  ];

  return { slots, externalModules };
}

function pickDefaultSupervisor(chassisPid: string): string {
  // C9410R: large chassis → recommend SUP-2XL
  if (chassisPid === "C9410R") return "C9400X-SUP-2XL";
  // C9407R: mid → recommend SUP-2
  if (chassisPid === "C9407R") return "C9400X-SUP-2";
  // C9404R: small → SUP-1XL is fine
  return "C9400-SUP-1XL";
}

function pickDefaultPsu(chassisPid: string): string {
  if (chassisPid === "C9410R") return "C9400-PWR-3200AC";
  if (chassisPid === "C9407R") return "C9400-PWR-3200AC";
  return "C9400-PWR-2100AC";
}

// ============================================================
// Validation helpers
// ============================================================

/**
 * Returns true if the given module fits the slot's expected kind.
 */
export function isModuleValidForSlot(
  modulePid: string,
  slotKind: SlotKind,
): boolean {
  const mod = getModuleByPid(modulePid);
  return mod?.slotKind === slotKind;
}

/**
 * Returns occupied slot IDs from a device's slot assignments.
 */
export function getOccupiedSlotIds(device: ConfiguredDevice): Set<string> {
  return new Set(
    (device.hardware.slots ?? [])
      .filter((s) => s.modulePid)
      .map((s) => s.slotId),
  );
}

/**
 * Ensures every slot in the layout has a corresponding SlotAssignment
 * (creating empty placeholders for slots without modules).
 */
export function normalizeSlots(
  device: ConfiguredDevice,
): SlotAssignment[] {
  const layout = getChassisSlotLayout(device.hardware.chassisPid);
  const existing = new Map(
    (device.hardware.slots ?? []).map((s) => [s.slotId, s]),
  );

  return layout.map((slotSpec) => {
    const slotId = String(slotSpec.slot);
    const existingAssignment = existing.get(slotId);
    if (existingAssignment) return existingAssignment;
    return {
      slotId,
      slotKind: slotSpec.kind,
    };
  });
}

export type { SlotLayoutEntry };