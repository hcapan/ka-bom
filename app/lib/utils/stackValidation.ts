import { ConfiguredDevice } from "../types";
import { HARDWARE_LIBRARY } from "../hardware/catalog";



export type StackValidationSeverity = "block" | "warn" | "info";

export interface StackValidationIssue {
  severity: StackValidationSeverity;
  code: string;
  message: string;
}

export interface StackValidationResult {
  canStack: boolean;
  issues: StackValidationIssue[];
}

const MAX_STACK_SIZE = 8;

/**
 * Validates a proposed stack from a list of devices.
 * Used by the "Group as stack" action and by the popover when adding members.
 */
export function validateStackComposition(
  devices: ConfiguredDevice[]
): StackValidationResult {
  const issues: StackValidationIssue[] = [];

  if (devices.length === 0) {
    issues.push({
      severity: "block",
      code: "NO_MEMBERS",
      message: "Stack requires at least 1 member.",
    });
    return { canStack: false, issues };
  }

  if (devices.length > MAX_STACK_SIZE) {
    issues.push({
      severity: "block",
      code: "EXCEEDS_MAX",
      message: `Stack cannot exceed ${MAX_STACK_SIZE} members (got ${devices.length}).`,
    });
  }

  // All members must share the same series.
  const seriesSet = new Set(devices.map((d) => d.hardware.series));
  if (seriesSet.size > 1) {
    issues.push({
      severity: "block",
      code: "MIXED_SERIES",
      message: `All members must be the same series. Got: ${Array.from(seriesSet).join(", ")}.`,
    });
  }

  // The shared series must be stackable.
  const seriesName = devices[0].hardware.series;
  const series = HARDWARE_LIBRARY[seriesName];
  if (!series) {
    issues.push({
      severity: "block",
      code: "UNKNOWN_SERIES",
      message: `Series "${seriesName}" not found in catalog.`,
    });
  } else if (!series.isStackable) {
    issues.push({
      severity: "block",
      code: "NOT_STACKABLE",
      message: `Series "${seriesName}" does not support stacking.`,
    });
  } else if (series.maxStackSize && devices.length > series.maxStackSize) {
    issues.push({
      severity: "block",
      code: "EXCEEDS_SERIES_MAX",
      message: `${seriesName} supports up to ${series.maxStackSize} members in a stack.`,
    });
  }

  // SOFT WARN: license tier consistency
const tiers = new Set(
  devices
    .map((d) => extractTierFromPid(d.hardware.chassisPid))
    .filter((t): t is string => t !== null)
);
  if (tiers.size > 1) {
    issues.push({
      severity: "warn",
      code: "MIXED_LICENSE_TIERS",
      message: `Members have different license tiers: ${Array.from(tiers).join(", ")}. Cisco recommends matching tiers within a stack.`,
    });
  }

  // SOFT WARN: PID consistency (e.g., mixing 9300-48P with 9300-24P)
  const pids = new Set(devices.map((d) => d.hardware.chassisPid));
  if (pids.size > 1) {
    issues.push({
      severity: "warn",
      code: "MIXED_PIDS",
      message: `Members have different chassis PIDs (${Array.from(pids).join(", ")}). Mixing port counts is supported but uncommon.`,
    });
  }

  const canStack = !issues.some((i) => i.severity === "block");
  return { canStack, issues };
}

/**
 * Validates whether a single new device can be added to an existing stack.
 */
export function canAddToStack(
  existingMembers: ConfiguredDevice[],
  newDevice: ConfiguredDevice
): StackValidationResult {
  return validateStackComposition([...existingMembers, newDevice]);
}

/**
 * Returns formatted text summary of validation issues.
 * Used in confirm dialogs / toast messages.
 */
export function formatValidationIssues(
  issues: StackValidationIssue[]
): string {
  return issues
    .map((i) => {
      const icon = i.severity === "block" ? "✗" : i.severity === "warn" ? "⚠" : "ℹ";
      return `${icon} ${i.message}`;
    })
    .join("\n");
}

export const STACK_MAX_SIZE = MAX_STACK_SIZE;


function extractTierFromPid(pid: string): string | null {
  // Common patterns:
  //   C9300-48P-A          → "Advantage"
  //   C9300-48P-E          → "Essentials"
  //   C9500-DNA-P          → "Premier"
  //   C9200L-48T-4G-E      → "Essentials"
  const m = pid.match(/-([AEP])$/);
  if (!m) return null;
  switch (m[1]) {
    case "A": return "Advantage";
    case "E": return "Essentials";
    case "P": return "Premier";
    default:  return null;
  }
}