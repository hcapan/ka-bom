import { Device } from "./types";
import { DeviceType } from "./hardware";

const TYPE_PREFIX: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
};

/**
 * Generates a unique, human-readable device ID.
 * Examples: "CORE-01", "ACC-03", "SEC-02"
 */
export function generateDeviceId(
  type: DeviceType,
  existingDevices: Device[]
): string {
  const prefix = TYPE_PREFIX[type] ?? "DEV";

  // Find highest existing number for this prefix
  const existingNums = existingDevices
    .filter((d) => d.id.startsWith(`${prefix}-`))
    .map((d) => {
      const match = d.id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  return `${prefix}-${String(nextNum).padStart(2, "0")}`;
}