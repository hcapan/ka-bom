import type { ConfiguredDevice } from "../types";
import type { ChassisBundle, PsuOptions } from "../hardware/schema/common";

// ⭐ Local PSU line shape — internal to the helper
export type PsuEmitLine = {
  pid: string;
  qty: number;
  description?: string;
  note?: string;
};

/**
 * Emits PSU-related output (primary + redundant or noRedundantPid) when the
 * bundle uses the new psuOptions schema.
 *
 * Returns an empty array for legacy bundles (those use redundantPsu;
 * caller should fall through to the legacy path).
 */
export function emitPsuLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle | undefined,
): PsuEmitLine[] {
  if (!bundle?.psuOptions) return [];
  return emitFromPsuOptions(
    bundle.psuOptions,
    device.hardware.primaryPsuPid,
    Boolean(device.hardware.redundantPsu),
    device.id,
  );
}

/**
 * Resolves which primary PSU PID to use for a device.
 */
export function resolvePrimaryPsuPid(
  bundle: ChassisBundle | undefined,
  userOverride: string | undefined,
): string | undefined {
  if (!bundle?.psuOptions) return undefined;

  if (userOverride) {
    const valid = bundle.psuOptions.primary.some((p) => p.pid === userOverride);
    if (valid) return userOverride;
  }

  const def = bundle.psuOptions.primary.find((p) => p.default);
  if (def) return def.pid;

  return bundle.psuOptions.primary[0]?.pid;
}

/**
 * True when the bundle uses the new psuOptions schema.
 */
export function bundleUsesPsuOptions(
  bundle: ChassisBundle | undefined,
): boolean {
  return Boolean(bundle?.psuOptions);
}

// ============================================================
// Internal
// ============================================================
function emitFromPsuOptions(
  psuOptions: PsuOptions,
  userOverride: string | undefined,
  wantsRedundant: boolean,
  deviceId: string,
): PsuEmitLine[] {
  const lines: PsuEmitLine[] = [];

  const primaryPid =
    (userOverride &&
      psuOptions.primary.find((p) => p.pid === userOverride)?.pid) ??
    psuOptions.primary.find((p) => p.default)?.pid ??
    psuOptions.primary[0]?.pid;

  if (!primaryPid) return [];

  // ⭐ Only emit primary if catalog says so (default: true for backward compat)
  const emitPrimary = psuOptions.emitPrimary !== false;

  if (emitPrimary) {
    const primaryOption = psuOptions.primary.find((p) => p.pid === primaryPid);
    lines.push({
      pid: primaryPid,
      qty: 1,
      description: primaryOption
        ? `Primary PSU — ${primaryOption.label}`
        : `Primary PSU for ${deviceId}`,
    });
  }

  // Secondary slot — emit redundant /2 OR noRedundant placeholder
  if (wantsRedundant) {
    const secondaryPid = psuOptions.secondaryPidMap[primaryPid];
    if (secondaryPid) {
      lines.push({
        pid: secondaryPid,
        qty: 1,
        description: `Redundant PSU for ${deviceId}`,
      });
    } else {
      console.warn(
        `[BOM] No /2 mapping for primary PSU ${primaryPid} on ${deviceId}.`,
      );
    }
  } else if (psuOptions.noRedundantPid) {
    lines.push({
      pid: psuOptions.noRedundantPid,
      qty: 1,
      description: "No secondary PSU selected",
    });
  }

  return lines;
}