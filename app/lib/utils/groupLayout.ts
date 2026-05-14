import { ConfiguredDevice, DeviceGroup } from "../types";
import { getChildGroups } from "./groupHelpers";

const DEVICE_W = 200;
const DEVICE_H = 100;
const HEADER_H = 36;
const PADDING = 22;

export interface ComputedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the bounding box dimensions for a group based on its children's
 * RELATIVE positions (because of React Flow's parentId convention, child
 * positions are already relative to the group's top-left corner).
 *
 * Returns x: 0, y: 0 since position is owned by the group itself, not
 * derived from children.
 */
export function computeGroupBox(
  groupId: string,
  devices: ConfiguredDevice[],
  groups: DeviceGroup[]
): ComputedBox {
  const childDevices = devices.filter((d) => d.groupId === groupId);
  const childSubgroups = getChildGroups(groups, groupId);
  const childSubgroupBoxes = childSubgroups.map((sg) =>
    computeGroupBox(sg.id, devices, groups)
  );

  const deviceRects: ComputedBox[] = childDevices
    .filter((d) => d.position !== undefined)
    .map((d) => ({
      x: d.position!.x,
      y: d.position!.y,
      width: DEVICE_W,
      height: DEVICE_H,
    }));

  const rects: ComputedBox[] = [...deviceRects, ...childSubgroupBoxes];

  if (rects.length === 0) {
    return {
      x: 0,
      y: 0,
      width: 320,
      height: 180,
    };
  }

  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));

  return {
    x: 0,
    y: 0,
    width: maxX + PADDING,
    height: maxY + PADDING + HEADER_H,
  };
}