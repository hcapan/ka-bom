// app/lib/utils/stackLayout.ts
// ============================================================
// STACK LAYOUT — physical-stack-like vertical positioning
// ============================================================

import type { ConfiguredDevice, DeviceGroup } from "../types";

export const STACK_LAYOUT = {
  MEMBER_HEIGHT: 90,
  MEMBER_WIDTH: 200,
  VERTICAL_GAP: 4,
  GROUP_PADDING_X: 16,
  GROUP_PADDING_TOP: 32,
  GROUP_PADDING_BOTTOM: 24,
} as const;

export function getStackMemberPosition(index: number): { x: number; y: number } {
  return {
    x: STACK_LAYOUT.GROUP_PADDING_X,
    y:
      STACK_LAYOUT.GROUP_PADDING_TOP +
      index * (STACK_LAYOUT.MEMBER_HEIGHT + STACK_LAYOUT.VERTICAL_GAP),
  };
}

export function getStackGroupSize(memberCount: number): {
  width: number;
  height: number;
} {
  return {
    width: STACK_LAYOUT.MEMBER_WIDTH + STACK_LAYOUT.GROUP_PADDING_X * 2,
    height:
      STACK_LAYOUT.GROUP_PADDING_TOP +
      memberCount * STACK_LAYOUT.MEMBER_HEIGHT +
      Math.max(0, memberCount - 1) * STACK_LAYOUT.VERTICAL_GAP +
      STACK_LAYOUT.GROUP_PADDING_BOTTOM,
  };
}

export function getStackRole(
  position: number
): "active" | "standby" | "member" {
  if (position === 1) return "active";
  if (position === 2) return "standby";
  return "member";
}

export function getStackPosition(
  device: ConfiguredDevice,
  group: DeviceGroup | undefined
): number | null {
  if (!group || group.kind !== "stack") return null;
  if (!group.memberOrder) return null;
  const idx = group.memberOrder.indexOf(device.id);
  return idx >= 0 ? idx + 1 : null;
}