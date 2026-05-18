// app/lib/hardware/__test-loader.ts
// (Delete this file after verifying)

import {
  getSwitchingSeries,
  getAllSeriesNames,
  getAddableSeriesNames,
  getBundle,
  getFaceplate,
  getSlotLayout,
  isModularChassis,
  isStackableSeries,
  supportsStackPower,
  getDefaultStackingCable,
  getDefaultStackPowerCable,
  getAvailableModules,
  getModule,
  getCatalogStats,
} from "./catalogLoader";

console.log("\n========== CATALOG LOADER TEST ==========\n");

// 1. Stats
const stats = getCatalogStats();
console.log("📊 Catalog Stats:");
console.log(`   Series: ${stats.seriesCount}`);
console.log(`   Total PIDs: ${stats.totalPids}`);
console.log(`   Module Catalogs: ${stats.moduleCatalogs.join(", ")}`);
console.log(`   Stackable: ${stats.stackableSeries.join(", ")}`);
console.log(`   Modular Chassis (${stats.modularChassisCount}): ${stats.modularChassisPids.join(", ")}`);

// 2. Addable series (what shows up in "Add Device" dropdown)
console.log("\n📋 Addable Series (excludes module catalogs):");
console.log(`   ${getAddableSeriesNames().join("\n   ")}`);

// 3. Bundle lookup
console.log("\n🔍 Bundle Lookup — C9300-48P-A:");
const bundle = getBundle("Catalyst 9300", "C9300-48P-A");
console.log(`   Has bundle: ${bundle !== null}`);
console.log(`   License tier: ${bundle?.license.tier}`);
console.log(`   SmartNet tiers: ${Object.keys(bundle?.smartnet.baseSkuByTier ?? {}).join(", ")}`);
console.log(`   Power cord regions: ${Object.keys(bundle?.powerCord.byRegion ?? {}).join(", ")}`);

// 4. Faceplate lookup
console.log("\n🖼️  Faceplate Lookup — C9500-48Y4C-A:");
const faceplate = getFaceplate("Catalyst 9500", "C9500-48Y4C-A");
console.log(`   Access ports: ${faceplate?.accessPorts?.count}x ${faceplate?.accessPorts?.speed}`);
console.log(`   Uplink ports: ${faceplate?.uplinkPorts?.count}x ${faceplate?.uplinkPorts?.speed}`);
console.log(`   Rack units: ${faceplate?.rackUnits}RU`);

// 5. Slot layout
console.log("\n🔧 Slot Layout — C9407R:");
const layout = getSlotLayout("C9407R");
console.log(`   Is modular: ${isModularChassis("C9407R")}`);
console.log(`   Slots: ${layout?.length}`);
console.log(`   Layout: ${layout?.map((s) => `slot${s.slot}=${s.kind}${s.required ? '*' : ''}`).join(", ")}`);

// 6. Stacking
console.log("\n🔗 Stacking — Catalyst 9300:");
console.log(`   Stackable: ${isStackableSeries("Catalyst 9300")}`);
console.log(`   StackPower: ${supportsStackPower("Catalyst 9300")}`);
console.log(`   Default data cable: ${getDefaultStackingCable("Catalyst 9300")}`);
console.log(`   Default power cable: ${getDefaultStackPowerCable("Catalyst 9300")}`);

console.log("\n🔗 Stacking — Catalyst 9200L:");
console.log(`   Stackable: ${isStackableSeries("Catalyst 9200L")}`);
console.log(`   StackPower: ${supportsStackPower("Catalyst 9200L")}`);
console.log(`   Default data cable: ${getDefaultStackingCable("Catalyst 9200L")}`);
console.log(`   Default power cable: ${getDefaultStackPowerCable("Catalyst 9200L")} (should be null)`);

// 7. Module lookups
console.log("\n📦 Available Supervisors:");
const sups = getAvailableModules("supervisor");
sups.forEach((s) => console.log(`   • ${s.pid} — ${s.description.slice(0, 60)}...`));

console.log("\n📦 Available Linecards (first 3):");
const lcs = getAvailableModules("linecard").slice(0, 3);
lcs.forEach((l) => console.log(`   • ${l.pid} — ports: ${l.modulePorts?.count}x${l.modulePorts?.speed}`));

// 8. Single module lookup
console.log("\n🔍 Module Lookup — C9400-SUP-1XL:");
const mod = getModule("C9400-SUP-1XL");
console.log(`   Found: ${mod !== null}`);
console.log(`   Description: ${mod?.description}`);
console.log(`   Kind: ${mod?.kind}`);

console.log("\n========== ALL TESTS COMPLETE ==========\n");