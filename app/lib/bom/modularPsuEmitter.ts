import type { ConfiguredDevice } from "../types";
import type { ChassisBundle, PsuConfig } from "../hardware/schema/common";

export type ModularPsuEmitLine = {
  pid: string;
  qty: number;
  description?: string;
};

export function emitModularPsuLines(
  device: ConfiguredDevice,
  bundle: ChassisBundle | undefined,
): ModularPsuEmitLine[] {
  const psuConfig = bundle?.psuConfig;
  if (!psuConfig) return [];

  const pid = resolveModularPsuPid(psuConfig, device.hardware.modularPsuPid);
  const qty = device.hardware.modularPsuQty ?? psuConfig.defaultQty;

  if (!pid || qty <= 0) return [];

  const opt = psuConfig.options.find((o) => o.pid === pid);

  return [
    {
      pid,
      qty,
      description: opt ? `${opt.label} PSU` : undefined,
    },
  ];
}

export function resolveModularPsuPid(
  psuConfig: PsuConfig | undefined,
  userOverride: string | undefined,
): string | undefined {
  if (!psuConfig) return undefined;

  if (userOverride) {
    const valid = psuConfig.options.some((o) => o.pid === userOverride);
    if (valid) return userOverride;
  }

  const def = psuConfig.options.find((o) => o.default);
  if (def) return def.pid;

  return psuConfig.options[0]?.pid;
}

export function bundleUsesPsuConfig(
  bundle: ChassisBundle | undefined,
): boolean {
  return Boolean(bundle?.psuConfig);
}