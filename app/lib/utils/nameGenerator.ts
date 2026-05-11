import { ConfiguredDevice, DeviceType } from "../types";

const LAYER_SHORT: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
  wireless: "WL",
  management: "MGT",
};

/**
 * Generate the next hostname from a pattern.
 * Tokens are case-sensitive — {LAYER} produces "ACC", {layer} produces "acc".
 */
export function generateHostname(
  pattern: string,
  type: DeviceType,
  series: string,
  existingDevices: ConfiguredDevice[]
): string {
  // Sequence number per layer (count of existing devices in this layer + 1)
  const layerPrefix = LAYER_SHORT[type] ?? "DEV";
  const layerCount = existingDevices.filter((d) => d.type === type).length + 1;

  // Series short code: strip "Catalyst ", spaces, special chars
  const seriesShort = series
    .replace(/Catalyst\s+/i, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  // Replace tokens — order matters (longer ones first so {NNN} doesn't get
  // matched as {NN} + N)
  let result = pattern
    // Sequence variants
    .replace(/\{NNN\}/g, String(layerCount).padStart(3, "0"))
    .replace(/\{nnn\}/g, String(layerCount).padStart(3, "0"))
    .replace(/\{NN\}/g, String(layerCount).padStart(2, "0"))
    .replace(/\{nn\}/g, String(layerCount).padStart(2, "0"))
    .replace(/\{N\}/g, String(layerCount))
    .replace(/\{n\}/g, String(layerCount))

    // Series
    .replace(/\{SERIES\}/g, seriesShort.toUpperCase())
    .replace(/\{series\}/g, seriesShort.toLowerCase())

    // Full type name
    .replace(/\{TYPE\}/g, type.toUpperCase())
    .replace(/\{type\}/g, type.toLowerCase())

    // Layer short code
    .replace(/\{LAYER\}/g, layerPrefix)
    .replace(/\{layer\}/g, layerPrefix.toLowerCase());

  // Fallback if pattern was empty/invalid
  result = result
  return result.trim() || `${layerPrefix.toLowerCase()}-${layerCount}`;
}

/**
 * Validate a pattern. Returns null if valid, error string otherwise.
 */
export function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) return "Pattern cannot be empty";
  const hasSequence = /\{n+\}/i.test(pattern);
  if (!hasSequence)
    return "Pattern must include a sequence token like {NN} or {N}";
  return null;
}

/**
 * Token reference for UI hint popover.
 */
export const PATTERN_TOKENS = [
  { token: "{LAYER}", desc: "Uppercase layer (ACC, CORE)" },
  { token: "{layer}", desc: "Lowercase layer (acc, core)" },
  { token: "{SERIES}", desc: "Uppercase series (9500, 9300L)" },
  { token: "{series}", desc: "Lowercase series" },
  { token: "{NN}", desc: "Sequence, 2-digit (01, 02)" },
  { token: "{NNN}", desc: "Sequence, 3-digit (001, 002)" },
  { token: "{N}", desc: "Sequence, no padding (1, 2)" },
  { token: "{TYPE}", desc: "Full type (ACCESS, CORE)" },
];