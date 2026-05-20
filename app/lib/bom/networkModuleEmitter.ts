import type { ConfiguredDevice } from "../types";
import type {
  ChassisBundle,
  NetworkModuleOptions,
} from "../hardware/schema/common";

export type NetworkModuleEmitLine = {
  pid: string;
  qty: number;
  description?: string;
};

/**
 * Emits the network module line for a fixed-switch chassis.
 * Returns:
 *   - User's selected module if set and valid
 *   - Default option (typically NM-NONE) if no selection
 *   - Empty array if catalog has no networkModuleOptions
 */
export function emitNetworkModuleLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle | undefined,
): NetworkModuleEmitLine[] {
  if (!bundle?.networkModuleOptions) return [];

  const opts = bundle.networkModuleOptions;
  const selectedPid =
    resolveNetworkModulePid(bundle, device.hardware.networkModulePid);

  if (!selectedPid) return [];

  const option = opts.options.find((o) => o.pid === selectedPid);

  return [
    {
      pid: selectedPid,
      qty: 1,
      description: option ? `Uplink module — ${option.label}` : undefined,
    },
  ];
}

/**
 * Resolves the network module PID for a device.
 * Returns undefined if no networkModuleOptions defined (legacy bundles).
 */
export function resolveNetworkModulePid(
  bundle: ChassisBundle | undefined,
  userOverride: string | undefined,
): string | undefined {
  if (!bundle?.networkModuleOptions) return undefined;

  const opts = bundle.networkModuleOptions;

  // 1. User-selected (if valid)
  if (userOverride) {
    const isValid = opts.options.some((o) => o.pid === userOverride);
    if (isValid) return userOverride;
  }

  // 2. Default option
  const def = opts.options.find((o) => o.default);
  if (def) return def.pid;

  // 3. First option
  return opts.options[0]?.pid;
}

/**
 * True when chassis defines networkModuleOptions.
 */
export function bundleUsesNetworkModuleOptions(
  bundle: ChassisBundle | undefined,
): boolean {
  return Boolean(bundle?.networkModuleOptions);
}