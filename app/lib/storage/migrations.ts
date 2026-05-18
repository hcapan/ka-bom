import {
  Project,
  DeviceGroup,
  ConfiguredDevice,
  Link,
  SCHEMA_VERSION,
  LegacyDevice,
  LegacyLink,
} from "../types";

/**
 * Generates a current-schema-compliant project from any input.
 * Handles:
 * - Brand new (empty)
 * - Legacy localStorage (devices/links as separate keys)
 * - Older v1/v2 single-blob projects
 * - v3 forward migration (adds groups, groupId)
 * - Already-current projects (no-op)
 */
export function migrateProject(raw: unknown): Project {
  // ────────────────────────────────────────────────
  // 1. Already current schema — no-op
  // ────────────────────────────────────────────────
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    (raw as Project).schemaVersion === SCHEMA_VERSION
  ) {
    return raw as Project;
  }

  // ────────────────────────────────────────────────
  // 2. v3 → v4 forward migration
  //    Adds: topology.groups, ConfiguredDevice.groupId, ui (if missing)
  // ────────────────────────────────────────────────
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    (raw as { schemaVersion: number }).schemaVersion === 3
  ) {
    const v3 = raw as Project;
    return {
      ...v3,
      schemaVersion: SCHEMA_VERSION,
      topology: {
        ...v3.topology,
        devices: v3.topology.devices.map(normalizeDevice),
        links: v3.topology.links,
        groups: (v3.topology as { groups?: DeviceGroup[] }).groups ?? [],
      },
      ui: v3.ui ?? { bundleEdges: true, expandedBundles: [] },
      updatedAt: new Date().toISOString(), // mark migration moment
    };
  }

  // ────────────────────────────────────────────────
  // 3. Legacy flat shape (devices/links as separate keys)
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  // 4. Older v1/v2 single-blob export
  // ────────────────────────────────────────────────
  if (raw && typeof raw === "object" && "devices" in raw && "links" in raw) {
    const v2 = raw as { devices: LegacyDevice[]; links: LegacyLink[] };
    return buildFreshProject({
      devices: v2.devices.map(migrateLegacyDevice),
      links: v2.links.map(migrateLegacyLink),
    });
  }

  // ✨ NEW — v4 → v5 forward migration
  // Adds: groupKind defaults, slots field allowed (still undefined for non-modular)
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    (raw as { schemaVersion: number }).schemaVersion === 4
  ) {
    const v4 = raw as Project;
    return {
      ...v4,
      schemaVersion: SCHEMA_VERSION,
      topology: {
        ...v4.topology,
        groups: v4.topology.groups.map((g) => ({
          ...g,
          groupKind: g.groupKind ?? "logical", // default existing groups to logical
        })),
        // devices unchanged — slots field is optional and undefined by default
      },
      updatedAt: new Date().toISOString(),
    };
  }
  // ────────────────────────────────────────────────
  // 5. Unknown — start fresh
  // ────────────────────────────────────────────────
  return buildFreshProject();
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Ensures a device has all v4 fields. Use null (not undefined) for optional
 * group membership so the field survives JSON serialization.
 */
function normalizeDevice(d: ConfiguredDevice): ConfiguredDevice {
  return {
    ...d,
    groupId: d.groupId ?? null,
  };
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
    groupId: null, // ✨ explicit
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
    optic: { pid: l.sku },
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
      devices: (seed?.devices ?? []).map(normalizeDevice),
      links: seed?.links ?? [],
      groups: [],
    },
    globalDefaults: {
      region: "EU",
      smartnetTier: "SNT",
      smartnetTermYears: 3,
      licenseTermYears: 3,
      defaultOptic: seed?.defaultOptic ?? "SFP-10G-SR-S",
    },
    createdAt: now,
    updatedAt: now,
    ui: { bundleEdges: true, expandedBundles: [] },
  };
}
