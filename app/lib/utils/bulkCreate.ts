import {
  ConfiguredDevice,
  Link,
  NamingConfig,
  DeviceType,
  DeviceGroup,
} from "../types";
import { generateHostname } from "./nameGenerator";
import { LAYER_CONFIG } from "../hardware/catalog";
import { generateGroupId } from "./groupHelpers";

const TYPE_PREFIX: Record<DeviceType, string> = {
  core: "CORE",
  distribution: "DIST",
  access: "ACC",
  security: "SEC",
  wireless: "WL",
  management: "MGT",
};

function generateDeviceId(
  type: DeviceType,
  existing: ConfiguredDevice[],
  reserved: Set<string>
): string {
  const prefix = TYPE_PREFIX[type] ?? "DEV";
  const allIds = new Set([...existing.map((d) => d.id), ...reserved]);
  let n = 1;
  while (allIds.has(`${prefix}-${String(n).padStart(2, "0")}`)) n++;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

// ============================================================
// AUTO-GRID PLACEMENT
// ============================================================
const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 30;
const ROW_WIDTH = 8;

// Positioning inside a group container (relative coords)
const GROUP_INTERNAL_PAD_X = 24;
const GROUP_INTERNAL_PAD_Y = 60; // leaves room for the group header

/**
 * Position for a device when NOT inside a group (absolute canvas coords).
 */
function nextGridPositionAbsolute(
  type: DeviceType,
  index: number,
  existingDevices: ConfiguredDevice[]
): { x: number; y: number } {
  const layerCfg = LAYER_CONFIG[type];
  const baseY = layerCfg.y + 80;

  const existingInLayer = existingDevices.filter(
    (d) => d.type === type && !d.groupId
  ).length;
  const totalIndex = existingInLayer + index;

  const row = Math.floor(totalIndex / ROW_WIDTH);
  const col = totalIndex % ROW_WIDTH;

  return {
    x: 100 + col * (NODE_WIDTH + HORIZONTAL_GAP),
    y: baseY + row * (NODE_HEIGHT + VERTICAL_GAP),
  };
}

/**
 * Position for a device INSIDE a group (relative to the group node).
 * React Flow's `parentId` + `extent: "parent"` interprets these as relative.
 */
function nextGridPositionInGroup(index: number): { x: number; y: number } {
  const row = Math.floor(index / ROW_WIDTH);
  const col = index % ROW_WIDTH;

  return {
    x: GROUP_INTERNAL_PAD_X + col * (NODE_WIDTH + HORIZONTAL_GAP),
    y: GROUP_INTERNAL_PAD_Y + row * (NODE_HEIGHT + VERTICAL_GAP),
  };
}

/**
 * Pick a sensible canvas position for a brand-new group's top-left corner.
 * Tries to place to the right of the rightmost existing top-level group,
 * falling back to layer-based defaults.
 */
function nextGroupPosition(
  type: DeviceType,
  groups: DeviceGroup[],
  devices: ConfiguredDevice[],            // ✨ NEW arg
  parentGroupId?: string
): { x: number; y: number } {
  if (parentGroupId) {
    return { x: 40, y: 60 };
  }

  const layerCfg = LAYER_CONFIG[type];
  const baseY = layerCfg.y + 40;

  // Find rightmost edge of existing top-level groups + ungrouped devices
  // in this layer, then place new group to the right
  const ESTIMATED_GROUP_W = 500;
  const HORIZONTAL_GAP = 60;

  const topLevelGroups = groups.filter((g) => !g.parentGroupId);
  const layerDevices = devices.filter(
    (d) => d.type === type && !d.groupId && d.position
  );

  let rightEdge = 100;

  for (const g of topLevelGroups) {
    rightEdge = Math.max(rightEdge, g.position.x + ESTIMATED_GROUP_W);
  }
  for (const d of layerDevices) {
    rightEdge = Math.max(rightEdge, d.position!.x + 200);
  }

  return {
    x: rightEdge + HORIZONTAL_GAP,
    y: baseY,
  };
}
// ============================================================
// BULK SPEC + RESULT
// ============================================================
export interface UplinkSpec {
  targetDeviceId: string;
  opticPid: string;
  linkCount: number;
}

export interface BulkCreateSpec {
  series: string;
  chassisPid: string;
  type: DeviceType;
  quantity: number;
  uplinks: UplinkSpec[];

  // ✨ Sprint 3 — Group options
  groupName?: string; // if set, creates a new DeviceGroup
  parentGroupId?: string; // optional — nest under an existing group
}

export interface BulkCreateResult {
  newDevices: ConfiguredDevice[];
  newLinks: Link[];
  newGroup?: DeviceGroup; // populated when groupName was provided
}

// ============================================================
// MAIN BUILDER
// ============================================================

export function createBulkDevices(
  spec: BulkCreateSpec,
  existingDevices: ConfiguredDevice[],
  existingLinks: Link[],
  existingGroups: DeviceGroup[],
  naming: NamingConfig
): BulkCreateResult {
  const newDevices: ConfiguredDevice[] = [];
  const newLinks: Link[] = [];
  const reservedIds = new Set<string>();
  const cumulativeDevices: ConfiguredDevice[] = [...existingDevices];

  // ────────────────────────────────────────────────
  // Step 1 — Optionally create a new group
  // ────────────────────────────────────────────────
  let newGroup: DeviceGroup | undefined;

  if (spec.groupName && spec.groupName.trim()) {
  const groupId = generateGroupId(existingGroups);
  newGroup = {
    id: groupId,
    label: spec.groupName.trim(),
    kind: "logical",                    // ⭐ ADD THIS
    parentGroupId: spec.parentGroupId,
    collapsed: false,
    position: nextGroupPosition(
      spec.type,
      existingGroups,
      existingDevices,
      spec.parentGroupId,
    ),
  };
}

  const targetGroupId = newGroup?.id ?? spec.parentGroupId;

  // ────────────────────────────────────────────────
  // Step 2 — Create devices
  // ────────────────────────────────────────────────
  for (let i = 0; i < spec.quantity; i++) {
    const id = generateDeviceId(spec.type, cumulativeDevices, reservedIds);
    reservedIds.add(id);

    const name = generateHostname(
      naming.pattern,
      spec.type,
      spec.series,
      cumulativeDevices
    );

    // Position depends on whether device lands in a group
    const position = targetGroupId
      ? nextGridPositionInGroup(i)
      : nextGridPositionAbsolute(spec.type, i, existingDevices);

    const device: ConfiguredDevice = {
      id,
      name,
      type: spec.type,
      position,
      hardware: {
        series: spec.series,
        chassisPid: spec.chassisPid,
      },
      groupId: targetGroupId ?? null,
    };

    newDevices.push(device);
    cumulativeDevices.push(device);

    // ────────────────────────────────────────────
    // Step 3 — Create uplinks
    // ────────────────────────────────────────────
    for (const uplink of spec.uplinks) {
      for (let j = 0; j < uplink.linkCount; j++) {
        newLinks.push({
          id: `LNK-${Date.now()}-${i}-${uplink.targetDeviceId}-${j}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          from: uplink.targetDeviceId, // parent (CORE/DIST) — bottom source
          to: device.id, // new device — top target
          sourceHandle: "b",
          targetHandle: "t",
          optic: { pid: uplink.opticPid },
        });
      }
    }
  }

  return { newDevices, newLinks, newGroup };
}