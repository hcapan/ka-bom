// app/lib/hardware/data/wireless/index.ts
// ============================================================
// WIRELESS DATA BARREL
// Imports each wireless catalog JSON and merges them into a
// single CatalogFile shape that Zod can validate.
// ============================================================

import catalyst9100AP from "./catalyst-9100-ap.json";

// Add more imports here as you expand:
// import meraki from "./meraki-mr.json";
// import iw from "./industrial-wireless.json";

const allSources = [catalyst9100AP];

// Merge series across all source files
const mergedSeries: Record<string, unknown> = {};
for (const file of allSources) {
  Object.assign(mergedSeries, file.series ?? {});
}

const wirelessData = {
  schemaVersion: 1,
  meta: {
    description: "Combined wireless catalog from multiple JSON sources",
  },
  series: mergedSeries,
};

export default wirelessData;