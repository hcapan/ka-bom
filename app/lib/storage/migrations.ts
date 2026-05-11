import {
  Project,
  ConfiguredDevice,
  Link,
  SCHEMA_VERSION,
  LegacyDevice,
  LegacyLink,
} from "../types";

/**
 * Generates a v3-compliant project from any input.
 * Handles:
 * - Brand new (empty)
 * - Legacy localStorage (devices/links as separate keys)
 * - Older v1/v2 single-blob projects
 * - Already-v3 projects (no-op)
 */
export function migrateProject(raw: unknown): Project {
  // Already v3
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    (raw as Project).schemaVersion === SCHEMA_VERSION
  ) {
    return raw as Project;
  }

  // Legacy flat shape (from old localStorage)ƒ
  if (raw && typeof raw === "object" && "legacy" in raw) {
    const legacy = raw as {
      legacy: true;
      devices: LegacyDevice[];
      links: LegacyLink[];
      defaultOptic: string;
    };
    return buildFreshProject({
      devices: legacy.devices.map(migrateLegacyDevice),
      links: legacy.links.map(migrateLegacyLink),
      defaultOptic: legacy.defaultOptic,
    });
  }

  // Older v1/v2 export with `devices` and `links` arrays
  if (
    raw &&
    typeof raw === "object" &&
    "devices" in raw &&
    "links" in raw
  ) {
    const v2 = raw as { devices: LegacyDevice[]; links: LegacyLink[] };
    return buildFreshProject({
      devices: v2.devices.map(migrateLegacyDevice),
      links: v2.links.map(migrateLegacyLink),
    });
  }

  // Unknown — start fresh
  return buildFreshProject();
}

function migrateLegacyDevice(d: LegacyDevice): ConfiguredDevice {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    position: d.position,
    hardware: {
      series: d.model,
      chassisPid: d.pid,
    },
    // License & SmartNet will be applied from globalDefaults at config time
  };
}

function migrateLegacyLink(l: LegacyLink): Link {
  return {
    id: l.id,
    from: l.from,
    to: l.to,
    sourceHandle: l.sourceHandle,
    targetHandle: l.targetHandle,
    isLateral: l.isLateral,
    optic: {
      pid: l.sku,
    },
  };
}

function buildFreshProject(seed?: {
  devices?: ConfiguredDevice[];
  links?: Link[];
  defaultOptic?: string;
}): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      name: "Untitled Topology",
      naming: {
        autoEnabled: false,
        pattern: "{LAYER}-{NN}",
      },
    },
    topology: {
      devices: seed?.devices ?? [],
      links: seed?.links ?? [],
    },
    globalDefaults: {
      region: "EU",
      smartnetTier: "SNT",
      smartnetTermYears: 3, // CCW typically renews annually
      licenseTermYears: 3, // your standard
      defaultOptic: seed?.defaultOptic ?? "SFP-10G-SR-S",
    },
    createdAt: now,
    updatedAt: now,
    ui: { bundleEdges: true, expandedBundles: [] }
  };
}