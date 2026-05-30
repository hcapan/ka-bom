// lib/hardware/pidInference.ts
import type { SwitchAttrs } from "./types";

/**
 * Infer SwitchAttrs from a Catalyst 9300/9300L/9300X PID.
 * Returns undefined when the PID doesn't match expected patterns.
 *
 * Examples:
 *   C9300-48P-E       → 48-port, 1G-Cu, PoE+,  modular
 *   C9300-48UN-E      → 48-port, mGig,  UPOE,  modular
 *   C9300L-48P-4X-E   → 48-port, 1G-Cu, PoE+,  fixed-10G
 *   C9300X-48HX-E     → 48-port, mGig,  UPOE+, modular
 */
export function inferSwitchAttrsFromPid(pid: string): SwitchAttrs | undefined {
  if (!pid.startsWith("C9300")) return undefined;

  const isL = pid.startsWith("C9300L");
  const isLM = pid.startsWith("C9300LM");
  const isX = pid.startsWith("C9300X");

  // Port count — first numeric group after the family prefix
  const portMatch = pid.match(/^C9300(?:L|LM|X)?-(\d+)/);
  const portCount = portMatch ? parseInt(portMatch[1], 10) : undefined;
  if (!portCount) return undefined;

  // Variant suffix (the letters right after port count)
  const variantMatch = pid.match(/C9300L?X?-\d+([A-Z]+)/);
  const variant = variantMatch ? variantMatch[1] : "";

  // PoE class
  let poeClass: SwitchAttrs["poeClass"] = "none";
  if (variant.includes("H")) poeClass = "UPOE+";
  else if (variant.includes("UN") || variant.includes("U")) poeClass = "UPOE";
  else if (variant.includes("P")) poeClass = "PoE+";
  // T = data only → "none"

  // Port type — N or X usually = mGig
  const portType: SwitchAttrs["portType"] = (
    variant.includes("N") || variant.includes("X") || isX
  ) ? "mGig" : "1G-Cu";

  // Uplink type — 9300L has fixed uplinks indicated by suffix
  let uplinkType: SwitchAttrs["uplinkType"] = "modular";
  if (isL) {
    if (pid.includes("-4X")) uplinkType = "fixed-10G";
    else if (pid.includes("-4G")) uplinkType = "fixed-1G";
    else if (pid.includes("-2Q")) uplinkType = "fixed-40G";
    else if (pid.includes("-2Y")) uplinkType = "fixed-25G";
    else uplinkType = "fixed-10G"; // default for 9300L
  }
  if (isLM) {
    if (pid.includes("-4X")) uplinkType = "fixed-10G";
    else if (pid.includes("-4G")) uplinkType = "fixed-1G";
    else if (pid.includes("-2Q")) uplinkType = "fixed-40G";
     else if (pid.includes("-2Y")) uplinkType = "fixed-25G";
    else uplinkType = "fixed-10G"; // default for 9300L
  }

  return {
    kind: "switch",
    portCount,
    portType,
    poeClass,
    uplinkType,
  };
}