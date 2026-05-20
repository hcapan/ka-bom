import type { ConfiguredDevice } from "@/app/lib/types";
import {
  getChassisSlotLayout,
  isModularChassis,
} from "@/app/lib/hardware/chassisHelpers";
import type { ValidationState } from "./_configPrimitives";

export interface SectionValidation {
  state: ValidationState;
  label: string;
}

/** Identity: hostname empty or default-looking */
export function validateIdentity(device: ConfiguredDevice): SectionValidation {
  const name = device.name?.trim() ?? "";
  if (!name) return { state: "warn", label: "no hostname" };
  // crude default-detector: starts with series prefix + digits
  if (/^(c\d{4}|switch|device|unnamed)/i.test(name)) {
    return { state: "info", label: "default name" };
  }
  return { state: "ok", label: "ok" };
}

/** Hardware (PSU): PSU model selected? */
export function validateHardware(
  device: ConfiguredDevice,
  hasPsuOptions: boolean,
  hasModularPsu: boolean,
  primaryPidResolved: boolean,
): SectionValidation {
  if (hasModularPsu) {
    const qty = device.hardware.modularPsuQty;
    if (!qty || qty < 1) return { state: "warn", label: "no PSU qty" };
    return { state: "ok", label: `${qty} PSU` };
  }
  if (hasPsuOptions && !primaryPidResolved) {
    return { state: "warn", label: "select PSU" };
  }
  return { state: "ok", label: "ok" };
}

/** Slots: count required slots that are empty */
export function validateSlots(device: ConfiguredDevice): SectionValidation {
  if (!isModularChassis(device.hardware.chassisPid)) {
    return { state: "ok", label: "n/a" };
  }
  const layout = getChassisSlotLayout(device.hardware.chassisPid);
  const required = layout.filter((s) => s.required);
  const assigned = new Set(
    (device.hardware.slots ?? []).map((a) => a.slotId)
  );
  const missing = required.filter((s) => !assigned.has(String(s.slot)));
  if (missing.length > 0) {
    return { state: "warn", label: `${missing.length} required empty` };
  }
  const filled = (device.hardware.slots ?? []).length;
  return { state: "ok", label: `${filled}/${layout.length} filled` };
}

/** SmartNet: NONE = info, others = ok */
export function validateSmartnet(device: ConfiguredDevice): SectionValidation {
  const tier = device.smartnet?.tier;
  if (tier === "NONE") return { state: "info", label: "no contract" };
  if (device.smartnet?.overridden) return { state: "info", label: "override" };
  return { state: "ok", label: "default" };
}