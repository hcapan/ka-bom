/**
 * Backfill `attrs` on every PID in a switching catalog JSON.
 * Auto-detects common shapes:
 *   - Wrapped:    { series: { "Catalyst 9300": {...} } }
 *   - Series-keyed: { "Catalyst 9300": {...}, "Catalyst 9300L": {...} }
 *   - Single series: { type: ..., pids: [...] }
 */

import * as fs from "fs";
import * as path from "path";
import { inferSwitchAttrsFromPid } from "../app/lib/hardware/pidInference";
import type { SwitchProductSKU } from "../app/lib/hardware/schema/switching";

// ─── CONFIG ───────────────────────────────────────────────────
const CATALOG_PATH = path.resolve(
  __dirname,
  "../app/lib/hardware/data/switching/catalyst-9300.json",
);
const DRY_RUN = process.argv.includes("--dry-run");

// ─── LOAD ────────────────────────────────────────────────────
console.log(`📂 Reading catalog: ${CATALOG_PATH}`);
if (!fs.existsSync(CATALOG_PATH)) {
  console.error(`❌ File not found.`);
  process.exit(1);
}
const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
const data: unknown = JSON.parse(raw);

// ─── DETECT SHAPE ────────────────────────────────────────────
type SeriesLike = { pids?: unknown[]; [k: string]: unknown };

function isSeriesLike(v: unknown): v is SeriesLike {
  return (
    typeof v === "object" &&
    v !== null &&
    "pids" in v &&
    Array.isArray((v as SeriesLike).pids)
  );
}

function findAllSeries(input: unknown): Record<string, SeriesLike> {
  const result: Record<string, SeriesLike> = {};

  if (typeof input !== "object" || input === null) return result;

  // Case A: top-level "series" wrapper
  if ("series" in input) {
    const s = (input as { series?: unknown }).series;
    if (typeof s === "object" && s !== null) {
      for (const [k, v] of Object.entries(s)) {
        if (isSeriesLike(v)) result[k] = v;
      }
      if (Object.keys(result).length > 0) return result;
    }
  }

  // Case B: top-level object IS a single series
  if (isSeriesLike(input)) {
    result["(this file)"] = input;
    return result;
  }

  // Case C: top-level keys are series names directly
  for (const [k, v] of Object.entries(input)) {
    if (isSeriesLike(v)) result[k] = v;
  }
  return result;
}

const allSeries = findAllSeries(data);

if (Object.keys(allSeries).length === 0) {
  console.error(`❌ Could not find any series with a 'pids' array.`);
  console.error(`   Top-level keys found: ${Object.keys(data as object).join(", ")}`);
  process.exit(1);
}

console.log(`✅ Found ${Object.keys(allSeries).length} series\n`);

// ─── PROCESS ─────────────────────────────────────────────────
let totalPids = 0;
let alreadyHadAttrs = 0;
let inferredCount = 0;
let unknownCount = 0;
const unknownPids: string[] = [];

for (const [seriesName, series] of Object.entries(allSeries)) {
  const pids = series.pids as SwitchProductSKU[];

  for (const pid of pids) {
    totalPids++;

    if (pid.attrs) {
      alreadyHadAttrs++;
      continue;
    }

    const inferred = inferSwitchAttrsFromPid(pid.pid);
    if (inferred) {
      pid.attrs = inferred;
      inferredCount++;
      console.log(
        `  ✅ ${seriesName} / ${pid.pid}`,
        `→ ${inferred.portCount}× ${inferred.portType}, ${inferred.poeClass}, ${inferred.uplinkType}`,
      );
    } else {
      unknownCount++;
      unknownPids.push(`${seriesName}/${pid.pid}`);
    }
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────
console.log("\n────────── SUMMARY ──────────");
console.log(`Total PIDs:           ${totalPids}`);
console.log(`Already had attrs:    ${alreadyHadAttrs}`);
console.log(`Newly inferred:       ${inferredCount}`);
console.log(`Could not infer:      ${unknownCount}`);

if (unknownPids.length > 0) {
  console.log(`\n⚠ PIDs needing manual review:`);
  unknownPids.forEach((p) => console.log(`   - ${p}`));
}

// ─── WRITE ───────────────────────────────────────────────────
if (DRY_RUN) {
  console.log("\n🧪 DRY RUN — no files were modified.");
  console.log("   Re-run without --dry-run to apply changes.");
  process.exit(0);
}

if (inferredCount === 0) {
  console.log("\nℹ️  No new attrs to write. Exiting.");
  process.exit(0);
}

const backupPath = `${CATALOG_PATH}.bak`;
fs.writeFileSync(backupPath, raw);
console.log(`\n💾 Backup written: ${backupPath}`);

const updated = JSON.stringify(data, null, 2);
fs.writeFileSync(CATALOG_PATH, updated);
console.log(`✅ Updated catalog written: ${CATALOG_PATH}`);
console.log(`   Changes: +${inferredCount} attrs`);