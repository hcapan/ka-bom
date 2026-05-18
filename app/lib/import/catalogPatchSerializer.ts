// ============================================================================
// CATALOG PATCH SERIALIZER (catalog-aware, append-ready)
//
// Compares the imported CatalogPatch against the live HARDWARE_LIBRARY
// and produces section-organized TypeScript output that:
//
//   SECTION 1: NEW ProductSKUs (paste into existing series)
//   SECTION 2: DELTA UPDATES (new tiers/terms on existing entries)
//   SECTION 3: NEW MODULES (paste into module-catalog series)
//   SECTION 4: NEW SERIES (whole-series additions)
//   SECTION 5: REVIEW NEEDED (unclassified items)
//
// Also exports `buildCatalogOverride()` for direct localStorage application.
// ============================================================================

import {
  CatalogPatch,
  ChassisBundlePatch,
  ModulePatch,
  OpticPatch,
  AutoIncludePatch,
  ClassifiedLine,
  StackingProfile,
} from "./types";
import {
  HARDWARE_LIBRARY,
  ProductSKU,
  CatalogOverride,
} from "../hardware/catalog";

// ============================================================================
// PUBLIC ENTRY POINT — TS code generation
// ============================================================================

export function serializeCatalogPatch(patch: CatalogPatch): string {
  const ctx = analyzePatch(patch);

  const sections: string[] = [];
  sections.push(renderHeader(patch, ctx));
  sections.push(renderSection1NewSkus(ctx));
  sections.push(renderSection2DeltaUpdates(ctx));
  sections.push(renderSection3NewModules(ctx));
  sections.push(renderSection4NewSeries(ctx));
  sections.push(renderSection5Optics(patch.optics, ctx));
  sections.push(renderSection6Review(patch.needsReview));
  sections.push(renderFooter());

  return sections.filter((s) => s.length > 0).join("\n\n");
}

// ============================================================================
// PUBLIC ENTRY POINT — direct localStorage override (Mode 2)
// ============================================================================

export function buildCatalogOverride(patch: CatalogPatch): CatalogOverride {
  const ctx = analyzePatch(patch);
  const overrideBundles: CatalogOverride["bundles"] = {};

  for (const item of ctx.allChassisItems) {
    const targetSeries = item.targetSeries;
    if (!targetSeries) continue; // new-series items can't be applied via override; need code edit

    overrideBundles[targetSeries] ??= {};
    overrideBundles[targetSeries][item.bundle.chassisPid] = {
      pid: item.bundle.chassisPid,
      bundle: bundleToProductSkuBundle(item.bundle),
    } as Partial<ProductSKU>;
  }

  return { bundles: overrideBundles };
}

// ============================================================================
// ANALYSIS — classify each patch item against the live catalog
// ============================================================================

interface AnalyzedChassisItem {
  bundle: ChassisBundlePatch;
  /** Series this chassis belongs in (existing or proposed). */
  targetSeries: string | null;
  /** True if a series with this name already exists in HARDWARE_LIBRARY. */
  seriesExists: boolean;
  /** True if this chassis PID already exists in the target series. */
  chassisExists: boolean;
  /** When chassisExists, this holds the diff against the existing entry. */
  delta: BundleDelta | null;
}

interface AnalyzedModuleItem {
  module: ModulePatch;
  /** Series this module belongs in. */
  targetSeries: string;
  /** True if a series with this name already exists. */
  seriesExists: boolean;
  /** True if this module PID already exists in the target series. */
  moduleExists: boolean;
  /** Existing compatibleChassis list (if module exists). */
  existingCompatibleChassis?: string[];
}

interface BundleDelta {
  newSmartnetTiers: Array<{ tier: string; pid: string }>;
  newLicenseTerms: Array<{ years: number; pid: string }>;
  newRegionCords: Array<{ region: string; pid: string }>;
}

interface PatchContext {
  patch: CatalogPatch;
  allChassisItems: AnalyzedChassisItem[];
  allModuleItems: AnalyzedModuleItem[];
  newSeriesNeeded: Set<string>;
}

function analyzePatch(patch: CatalogPatch): PatchContext {
  const allChassisItems: AnalyzedChassisItem[] = patch.chassisBundles.map(
    analyzeChassis
  );
  const allModuleItems: AnalyzedModuleItem[] = patch.modules.map(analyzeModule);

  const newSeriesNeeded = new Set<string>();
  for (const c of allChassisItems) {
    if (c.targetSeries && !c.seriesExists) newSeriesNeeded.add(c.targetSeries);
  }
  for (const m of allModuleItems) {
    if (!m.seriesExists) newSeriesNeeded.add(m.targetSeries);
  }

  return { patch, allChassisItems, allModuleItems, newSeriesNeeded };
}

// ============================================================================
// CHASSIS ANALYSIS
// ============================================================================

function analyzeChassis(bundle: ChassisBundlePatch): AnalyzedChassisItem {
  const targetSeries = chassisTargetSeries(bundle);
  const seriesExists = targetSeries !== null && targetSeries in HARDWARE_LIBRARY;

  let chassisExists = false;
  let delta: BundleDelta | null = null;

  if (seriesExists && targetSeries) {
    const series = HARDWARE_LIBRARY[targetSeries];
    const existing = series.pids.find((p) => p.pid === bundle.chassisPid);
    if (existing) {
      chassisExists = true;
      delta = computeBundleDelta(bundle, existing.bundle);
    }
  }

  return { bundle, targetSeries, seriesExists, chassisExists, delta };
}

/** Maps a chassis PID + vendorFamily to its target series name. */
function chassisTargetSeries(bundle: ChassisBundlePatch): string | null {
  switch (bundle.vendorFamily) {
    case "catalyst-9200":   return "Catalyst 9200";
    case "catalyst-9200l":  return "Catalyst 9200L";
    case "catalyst-9300":   return "Catalyst 9300";
    case "catalyst-9300l":  return "Catalyst 9300L";
    case "catalyst-9400":   return "Catalyst 9400";
    case "catalyst-9500":   return "Catalyst 9500";
    case "catalyst-9600":   return "Catalyst 9600";
    case "nexus-9500":      return "Nexus 9500";
    case "nexus-other":     return "Nexus 9000";
    case "optic":           return null; // optics don't belong to a chassis series
    default:                return null;
  }
}

function computeBundleDelta(
  imported: ChassisBundlePatch,
  existing: { smartnet?: { baseSkuByTier?: Record<string, string> }; license?: { subscriptionByTerm?: Record<string, string> }; powerCord?: { byRegion?: Record<string, string> } } | undefined
): BundleDelta {
  const existingSmartnetTiers = new Set(
    Object.keys(existing?.smartnet?.baseSkuByTier ?? {})
  );
  const existingLicenseTerms = new Set(
    Object.keys(existing?.license?.subscriptionByTerm ?? {})
  );
  const existingRegions = new Set(
    Object.keys(existing?.powerCord?.byRegion ?? {})
  );

  const newSmartnetTiers: BundleDelta["newSmartnetTiers"] = [];
  if (imported.smartnet && !existingSmartnetTiers.has(imported.smartnet.tier)) {
    newSmartnetTiers.push({
      tier: imported.smartnet.tier,
      pid: imported.smartnet.pid,
    });
  }

  const newLicenseTerms: BundleDelta["newLicenseTerms"] = [];
  if (imported.license) {
    for (const [years, pid] of Object.entries(imported.license.subscriptionByTerm)) {
      if (!existingLicenseTerms.has(years)) {
        newLicenseTerms.push({ years: Number(years), pid });
      }
    }
  }

  const newRegionCords: BundleDelta["newRegionCords"] = [];
  for (const [region, pid] of Object.entries(imported.powerCordByRegion)) {
    if (!existingRegions.has(region)) {
      newRegionCords.push({ region, pid: pid as string });
    }
  }

  return { newSmartnetTiers, newLicenseTerms, newRegionCords };
}

// ============================================================================
// MODULE ANALYSIS
// ============================================================================

function analyzeModule(module: ModulePatch): AnalyzedModuleItem {
  const targetSeries = moduleTargetSeries(module);
  const seriesExists = targetSeries in HARDWARE_LIBRARY;

  let moduleExists = false;
  let existingCompatibleChassis: string[] | undefined;

  if (seriesExists) {
    const series = HARDWARE_LIBRARY[targetSeries];
    const existing = series.pids.find((p) => p.pid === module.pid);
    if (existing) {
      moduleExists = true;
      existingCompatibleChassis = existing.compatibleChassis;
    }
  }

  return {
    module,
    targetSeries,
    seriesExists,
    moduleExists,
    existingCompatibleChassis,
  };
}

/**
 * Maps a module PID to its target series name based on the agreed routing
 * rules in Decision 3.
 */
function moduleTargetSeries(module: ModulePatch): string {
  const pid = module.pid;

  // Stacking cables and stack-power cables
  if (/^STACK-/.test(pid) || /^CAB-SPWR-/.test(pid)) return "StackWise Cables";

  // ⭐ NEW: Catalyst 9300 / 9300X uplink modules
  if (/^C9300X?-NM-/.test(pid)) return "Catalyst 9300 Uplink Modules";

  // Catalyst 9400
  if (/^C9400X?-SUP-/.test(pid)) return "Catalyst 9400 Supervisors";
  if (/^C9400-LC-/.test(pid)) return "Catalyst 9400 Linecards";
  if (/^C9400-PWR-/.test(pid) || /^C9400-FAN/.test(pid))
    return "Catalyst 9400 Power & Fans";

  // Catalyst 9600
  if (/^C9600X?-SUP-/.test(pid)) return "Catalyst 9600 Supervisors";
  if (/^C9600X?-LC-/.test(pid)) return "Catalyst 9600 Linecards";
  if (
    /^C9600-PWR-/.test(pid) ||
    /^C9606-FAN/.test(pid) ||
    /^C9609-FAN/.test(pid)
  )
    return "Catalyst 9600 Power & Fans";

  // Nexus 9500
  if (/^N9K-SUP-/.test(pid)) return "Nexus 9500 Supervisors";
  if (/^N9K-X/.test(pid)) return "Nexus 9500 Linecards";
  if (/-FM-/.test(pid)) return "Nexus 9500 Fabric Modules";
  if (
    /^N9K-PAC-/.test(pid) ||
    /^N9K-C9\d+-FAN/.test(pid) ||
    /^N9K-SC-/.test(pid)
  )
    return "Nexus 9500 Power & Fans";

  // Generic SSDs
  if (/^SSD-/.test(pid) || /-SSD-\d/.test(pid)) {
    // Catalyst-specific SSDs go in their respective Power & Fans series
    if (/^C9400-/.test(pid)) return "Catalyst 9400 Power & Fans";
    if (/^C9600-/.test(pid)) return "Catalyst 9600 Power & Fans";
    return "Misc Modules";
  }

  return "Misc Modules";
}

// ============================================================================
// HEADER
// ============================================================================

function renderHeader(patch: CatalogPatch, ctx: PatchContext): string {
  return [
    `// ============================================================================`,
    `// CATALOG PATCH — generated by KA-BOM CCW Importer`,
    `// Source file:    ${patch.sourceFileName}`,
    `// Generated at:   ${patch.generatedAt}`,
    `//`,
    `// SUMMARY:`,
    `//   New chassis SKUs:     ${ctx.allChassisItems.filter((c) => !c.chassisExists && c.seriesExists).length}`,
    `//   Chassis updates:      ${ctx.allChassisItems.filter((c) => c.chassisExists && c.delta && hasAnyDelta(c.delta)).length}`,
    `//   Already up-to-date:   ${ctx.allChassisItems.filter((c) => c.chassisExists && (!c.delta || !hasAnyDelta(c.delta))).length}`,
    `//   New modules:          ${ctx.allModuleItems.filter((m) => !m.moduleExists).length}`,
    `//   Module updates:       ${ctx.allModuleItems.filter((m) => m.moduleExists).length}`,
    `//   New series needed:    ${ctx.newSeriesNeeded.size}`,
    `//   Optics:               ${patch.optics.length}`,
    `//   Needs review:         ${patch.needsReview.length}`,
    `//`,
    `// HOW TO USE:`,
    `//   1. Section 1: paste new chassis ProductSKUs into the indicated series`,
    `//   2. Section 2: apply small deltas to existing entries`,
    `//   3. Section 3: paste new modules into module-catalog series`,
    `//   4. Section 4: paste whole new series into HARDWARE_LIBRARY`,
    `//   5. Section 5: paste optics into your optics catalog`,
    `//   6. Section 6: review unclassified items, add classifier rules if needed`,
    `// ============================================================================`,
  ].join("\n");
}

function hasAnyDelta(d: BundleDelta): boolean {
  return (
    d.newSmartnetTiers.length > 0 ||
    d.newLicenseTerms.length > 0 ||
    d.newRegionCords.length > 0
  );
}

// ============================================================================
// SECTION 1: NEW PRODUCTSKUs (chassis only, where target series exists)
// ============================================================================

function renderSection1NewSkus(ctx: PatchContext): string {
  const items = ctx.allChassisItems.filter(
    (c) => c.seriesExists && !c.chassisExists
  );
  if (items.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 1: NEW CHASSIS — paste into existing series                 │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");

  // Group by target series
  const grouped = groupBy(items, (i) => i.targetSeries ?? "");
  for (const [series, group] of Object.entries(grouped)) {
    lines.push(`// === ADD to HARDWARE_LIBRARY[${q(series)}].pids ===`);
    for (const item of group) {
      lines.push(renderProductSku(item.bundle));
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================================
// SECTION 2: DELTA UPDATES TO EXISTING ENTRIES
// ============================================================================

function renderSection2DeltaUpdates(ctx: PatchContext): string {
  const items = ctx.allChassisItems.filter(
    (c) => c.chassisExists && c.delta && hasAnyDelta(c.delta)
  );
  if (items.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 2: DELTA UPDATES — merge into existing chassis entries      │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");

  for (const item of items) {
    const series = item.targetSeries!;
    const pid = item.bundle.chassisPid;
    lines.push(
      `// === UPDATE HARDWARE_LIBRARY[${q(series)}].pids → find { pid: ${q(pid)}, ... } ===`
    );

    if (item.delta!.newSmartnetTiers.length > 0) {
      lines.push(`//   ADD to bundle.smartnet.baseSkuByTier:`);
      for (const t of item.delta!.newSmartnetTiers) {
        lines.push(`//     ${t.tier}: ${q(t.pid)},`);
      }
    }

    if (item.delta!.newLicenseTerms.length > 0) {
      lines.push(`//   ADD to bundle.license.subscriptionByTerm:`);
      for (const t of item.delta!.newLicenseTerms) {
        lines.push(`//     ${t.years}: ${q(t.pid)},`);
      }
    }

    if (item.delta!.newRegionCords.length > 0) {
      lines.push(`//   ADD to bundle.powerCord.byRegion:`);
      for (const r of item.delta!.newRegionCords) {
        lines.push(`//     ${r.region}: ${q(r.pid)},`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// SECTION 3: NEW MODULES (paste into module-catalog series)
// ============================================================================

function renderSection3NewModules(ctx: PatchContext): string {
  const items = ctx.allModuleItems.filter(
    (m) => m.seriesExists && !m.moduleExists
  );
  const updateItems = ctx.allModuleItems.filter((m) => m.moduleExists);

  if (items.length === 0 && updateItems.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 3: MODULES                                                  │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");

  // New modules grouped by series
  if (items.length > 0) {
    const grouped = groupBy(items, (i) => i.targetSeries);
    for (const [series, group] of Object.entries(grouped)) {
      lines.push(`// === ADD to HARDWARE_LIBRARY[${q(series)}].pids ===`);
      for (const item of group) {
        lines.push(renderModule(item.module));
        lines.push("");
      }
    }
  }

  // Module updates (compatibleChassis widening)
  if (updateItems.length > 0) {
    for (const item of updateItems) {
      const newChassis = item.module.observedInChassis.filter(
        (c) => !item.existingCompatibleChassis?.includes(c)
      );
      if (newChassis.length === 0) continue;

      lines.push(
        `// === UPDATE HARDWARE_LIBRARY[${q(item.targetSeries)}].pids → find { pid: ${q(item.module.pid)}, ... } ===`
      );
      lines.push(
        `//   ADD to compatibleChassis: ${newChassis.map(q).join(", ")}`
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================================
// SECTION 4: NEW SERIES (whole-series additions)
// ============================================================================

function renderSection4NewSeries(ctx: PatchContext): string {
  if (ctx.newSeriesNeeded.size === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 4: NEW SERIES — paste these blocks into HARDWARE_LIBRARY    │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");

  for (const seriesName of ctx.newSeriesNeeded) {
    lines.push(renderNewSeries(seriesName, ctx));
    lines.push("");
  }

  return lines.join("\n");
}

function renderNewSeries(seriesName: string, ctx: PatchContext): string {
  const isModuleCatalog = isModuleSeriesName(seriesName);
  const chassisItems = ctx.allChassisItems.filter(
    (c) => c.targetSeries === seriesName && !c.seriesExists
  );
  const moduleItems = ctx.allModuleItems.filter(
    (m) => m.targetSeries === seriesName && !m.seriesExists
  );

  const lines: string[] = [];
  lines.push(`// === ADD to HARDWARE_LIBRARY ===`);
  lines.push(`${q(seriesName)}: {`);
  lines.push(`  type: ${q(inferSeriesType(seriesName))},`);
  lines.push(`  vendor: "Cisco",`);
  lines.push(`  description: "TODO: refine description",`);
  lines.push(`  compatibleOptics: [],  // TODO: fill compatible optics`);
  if (isModuleCatalog) lines.push(`  isModuleCatalog: true,`);
  lines.push(`  pids: [`);

  for (const c of chassisItems) {
    lines.push(indent(renderProductSku(c.bundle), "    "));
  }
  for (const m of moduleItems) {
    lines.push(indent(renderModule(m.module), "    "));
  }

  lines.push(`  ],`);
  lines.push(`},`);

  return lines.join("\n");
}

function isModuleSeriesName(name: string): boolean {
  return /Supervisors|Linecards|Fabric Modules|Power & Fans|Cables|Misc Modules/.test(
    name
  );
}

function inferSeriesType(name: string): string {
  if (/9200|9300|Access/i.test(name)) return "access";
  if (/9400|9500|9600|Core|Distribution/i.test(name)) return "core";
  if (/Nexus/i.test(name)) return "core";
  if (/Cables|Modules/i.test(name)) return "access"; // module catalog placeholder
  return "core";
}

// ============================================================================
// SECTION 5: OPTICS
// ============================================================================

function renderSection5Optics(optics: OpticPatch[], _ctx: PatchContext): string {
  if (optics.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 5: OPTICS                                                   │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");
  lines.push(`// Add these to your optics catalog:`);
  for (const o of optics) {
    lines.push(`//   ${o.pid.padEnd(28)} — ${o.description}`);
  }

  return lines.join("\n");
}

// ============================================================================
// SECTION 6: REVIEW NEEDED
// ============================================================================

function renderSection6Review(review: ClassifiedLine[]): string {
  if (review.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    `// ┌─────────────────────────────────────────────────────────────────────┐`
  );
  lines.push(
    `// │ SECTION 6: ⚠ REVIEW NEEDED                                          │`
  );
  lines.push(
    `// └─────────────────────────────────────────────────────────────────────┘`
  );
  lines.push("");
  for (const line of review) {
    lines.push(
      `//   ${line.raw.partNumber.padEnd(28)}  qty=${line.raw.quantity}  role=${line.role}`
    );
    if (line.note) lines.push(`//      ↳ ${line.note}`);
  }

  return lines.join("\n");
}

// ============================================================================
// FOOTER
// ============================================================================

function renderFooter(): string {
  return [
    `// ============================================================================`,
    `// END OF GENERATED PATCH`,
    `// ============================================================================`,
  ].join("\n");
}

// ============================================================================
// PRODUCT SKU RENDERING
// ============================================================================

function renderProductSku(bundle: ChassisBundlePatch): string {
  const lines: string[] = [];
  lines.push(`{`);
  lines.push(`  pid: ${q(bundle.chassisPid)},`);
  lines.push(`  description: "TODO: refine description",`);

  // Faceplate (placeholder for modular chassis; engineer fills in)
  if (bundle.isModular) {
    lines.push(`  faceplate: { /* TODO: modularSlots, rackUnits */ },`);
  }

  // Bundle
  lines.push(`  bundle: {`);

  // Auto-includes
  lines.push(`    autoIncluded: [`);
  for (const item of bundle.autoIncluded) {
    lines.push(`      ${renderAutoInclude(item)}`);
  }
  lines.push(`    ],`);

  // Power cord
  lines.push(`    powerCord: {`);
  lines.push(`      qty: ${bundle.observedPsuQty || 1},`);
  lines.push(`      byRegion: {`);
  for (const [region, pid] of Object.entries(bundle.powerCordByRegion)) {
    lines.push(`        ${region}: ${q(pid as string)},`);
  }
  const allRegions = ["EU", "US", "UK", "JP", "AU", "IN", "CN"];
  const missing = allRegions.filter((r) => !(r in bundle.powerCordByRegion));
  if (missing.length > 0) {
    lines.push(`        // TODO: missing ${missing.join(", ")}`);
  }
  lines.push(`      },`);
  lines.push(`    },`);

  // SmartNet
  if (bundle.smartnet) {
    lines.push(`    smartnet: {`);
    lines.push(`      baseSkuByTier: {`);
    lines.push(`        ${bundle.smartnet.tier}: ${q(bundle.smartnet.pid)},`);
    lines.push(`        // TODO: add other tiers (SNTP, OS, OSP) by importing more configs`);
    lines.push(`      },`);
    lines.push(`    },`);
  }

  // License
  if (bundle.license) {
    lines.push(`    license: {`);
    lines.push(`      tier: ${q(bundle.license.tier)},`);
    lines.push(`      entitlementPid: ${q(bundle.license.entitlementPid)},`);
    lines.push(`      subscriptionByTerm: {`);
    for (const [years, pid] of Object.entries(bundle.license.subscriptionByTerm)) {
      lines.push(`        ${years}: ${q(pid as string)},`);
    }
    const seenTerms = Object.keys(bundle.license.subscriptionByTerm);
    const allTerms = ["1", "3", "5", "7"];
    const missingTerms = allTerms.filter((t) => !seenTerms.includes(t));
    if (missingTerms.length > 0) {
      lines.push(`        // TODO: missing ${missingTerms.map((t) => `${t}Y`).join(", ")}`);
    }
    lines.push(`      },`);
    lines.push(`    },`);
  }

  // Stacking profile (only for fixed-config that supports stacking)
  if (bundle.stackingProfile && bundle.stackingProfile.pattern !== "none") {
    lines.push(renderStackingProfile(bundle.stackingProfile));
  }

  lines.push(`  },`);
  lines.push(`},`);

  return lines.join("\n");
}

function renderAutoInclude(item: AutoIncludePatch): string {
  const parts = [`pid: ${q(item.pid)}`, `qty: ${item.qty}`];
  if (item.note) parts.push(`note: ${q(item.note)}`);
  return `{ ${parts.join(", ")} },  // ${item.role}`;
}

function renderStackingProfile(profile: StackingProfile): string {
  // Translate observation-based StackingProfile into your StackingSpec schema
  const lines: string[] = [];
  lines.push(`    stacking: {`);
  lines.push(`      adapterRequired: ${profile.pattern === "kit-bundle"},`);
  if (profile.kitPid) {
    lines.push(`      adapterKits: [${q(profile.kitPid)}],`);
  }
  if (profile.dataCablePid) {
    lines.push(`      dataCables: [`);
    lines.push(`        { pid: ${q(profile.dataCablePid)}, length: "50cm" },  // TODO: add 1m, 3m variants`);
    lines.push(`      ],`);
  }
  if (profile.powerCablePid) {
    lines.push(`      powerCables: [`);
    lines.push(`        { pid: ${q(profile.powerCablePid)}, length: "30cm" },`);
    lines.push(`      ],`);
  }
  lines.push(`    },`);
  return lines.join("\n");
}

// ============================================================================
// MODULE RENDERING
// ============================================================================

function renderModule(m: ModulePatch): string {
  const lines: string[] = [];
  lines.push(`{`);
  lines.push(`  pid: ${q(m.pid)},`);
  lines.push(`  description: ${q(m.description)},  // TODO: refine`);
  lines.push(`  kind: ${q(m.slotKind)},`);
  lines.push(`  slotKind: ${q(m.slotKind)},`);
  lines.push(`  compatibleChassis: [${m.observedInChassis.map(q).join(", ")}],`);
  lines.push(`},`);
  return lines.join("\n");
}

// ============================================================================
// localStorage OVERRIDE — convert ChassisBundlePatch → catalog ChassisBundle
// ============================================================================

function bundleToProductSkuBundle(b: ChassisBundlePatch): ProductSKU["bundle"] {
  const result: NonNullable<ProductSKU["bundle"]> = {
    autoIncluded: b.autoIncluded.map((a) => ({
      pid: a.pid,
      qty: a.qty,
      note: a.note,
    })),
    powerCord: {
      qty: b.observedPsuQty || 1,
      byRegion: { ...b.powerCordByRegion },
    },
    smartnet: {
      baseSkuByTier: b.smartnet
        ? { [b.smartnet.tier]: b.smartnet.pid }
        : {},
    },
    license: b.license
      ? {
          tier: b.license.tier as "Essentials" | "Advantage" | "Premier",
          entitlementPid: b.license.entitlementPid,
          subscriptionByTerm: { ...b.license.subscriptionByTerm },
        }
      : {
          tier: "Advantage",
          entitlementPid: "",
          subscriptionByTerm: {},
        },
  };
  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

function q(s: string): string {
  const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function indent(text: string, prefix: string): string {
  return text.split("\n").map((line) => prefix + line).join("\n");
}

function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const result: Partial<Record<K, T[]>> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key]!.push(item);
  }
  return result as Record<K, T[]>;
}