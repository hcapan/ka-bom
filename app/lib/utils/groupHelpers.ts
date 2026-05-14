import { ConfiguredDevice, DeviceGroup } from "../types";

const NESTING_WARN_DEPTH = 5;

// ============================================================
// ID GENERATION
// ============================================================

export function generateGroupId(existingGroups: DeviceGroup[]): string {
  const used = new Set(existingGroups.map((g) => g.id));
  let n = 1;
  while (used.has(`GRP-${String(n).padStart(2, "0")}`)) n++;
  return `GRP-${String(n).padStart(2, "0")}`;
}

// ============================================================
// TREE QUERIES
// ============================================================

/** Top-level groups (no parent). */
export function getRootGroups(groups: DeviceGroup[]): DeviceGroup[] {
  return groups.filter((g) => !g.parentGroupId);
}

/** Direct children of a group. */
export function getChildGroups(
  groups: DeviceGroup[],
  parentId: string
): DeviceGroup[] {
  return groups.filter((g) => g.parentGroupId === parentId);
}

/** All descendant group IDs (recursive). Includes the root itself. */
export function getDescendantGroupIds(
  groups: DeviceGroup[],
  rootId: string
): string[] {
  const result: string[] = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const g of groups) {
      if (g.parentGroupId === current) {
        result.push(g.id);
        stack.push(g.id);
      }
    }
  }
  return result;
}

/** All device IDs inside a group's tree (this group + all descendant groups). */
export function getDescendantDeviceIds(
  devices: ConfiguredDevice[],
  groups: DeviceGroup[],
  rootGroupId: string
): string[] {
  const groupIds = new Set(getDescendantGroupIds(groups, rootGroupId));
  return devices.filter((d) => d.groupId && groupIds.has(d.groupId)).map((d) => d.id);
}

/** Walk from group up to root. Returns [self, parent, grandparent, ..., root]. */
export function getAncestorChain(
  groups: DeviceGroup[],
  groupId: string
): DeviceGroup[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const chain: DeviceGroup[] = [];
  let current = byId.get(groupId);
  while (current) {
    chain.push(current);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return chain;
}

/** Nesting depth of a group (root = 1). */
export function getGroupDepth(groups: DeviceGroup[], groupId: string): number {
  return getAncestorChain(groups, groupId).length;
}

/** True if depth > NESTING_WARN_DEPTH; UI should warn but not block. */
export function isExcessivelyNested(
  groups: DeviceGroup[],
  groupId: string
): boolean {
  return getGroupDepth(groups, groupId) > NESTING_WARN_DEPTH;
}

// ============================================================
// SAFETY CHECKS
// ============================================================

/** Detects whether re-parenting `movingId` under `newParentId` would create a cycle. */
export function isCircularReparent(
  groups: DeviceGroup[],
  movingId: string,
  newParentId: string | null
): boolean {
  if (!newParentId) return false;
  if (movingId === newParentId) return true;
  // Walk up from newParent — if we hit movingId, it's a cycle
  const ancestors = getAncestorChain(groups, newParentId);
  return ancestors.some((g) => g.id === movingId);
}

// ============================================================
// VISIBILITY (key helper for Sprint 4 — edge rerouting on collapse)
// ============================================================

/**
 * Walks up from a device through its group chain. Returns the ID to use
 * when rendering edges:
 *  - If the device's group (or any ancestor group) is collapsed → returns
 *    the OUTERMOST collapsed ancestor's group ID.
 *  - Otherwise → returns the device's own ID.
 *
 * This is what makes edges "snap" to the collapsed group during render.
 */
export function findVisibleAncestor(
  deviceId: string,
  devices: ConfiguredDevice[],
  groups: DeviceGroup[]
): string {
  const device = devices.find((d) => d.id === deviceId);
  if (!device || !device.groupId) return deviceId;

  const chain = getAncestorChain(groups, device.groupId);
  // Find the OUTERMOST collapsed ancestor (closest to root)
  const collapsedAncestors = chain.filter((g) => g.collapsed);
  if (collapsedAncestors.length === 0) return deviceId;

  // Outermost = last in chain (chain goes self → root)
  return collapsedAncestors[collapsedAncestors.length - 1].id;
}