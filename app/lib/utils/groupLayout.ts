// app/lib/utils/groupLayout.ts

export const DEVICE_W = 200;
export const DEVICE_H = 100;
export const HEADER_H = 100;
export const PADDING_X = 24;
export const PADDING_Y = 24;
export const PADDING = 24;
export const GAP_X = 24;
export const GAP_Y = 24;
export const EMPTY_GROUP_W = 320;
export const EMPTY_GROUP_H = 180;

export interface LayoutOptions {
  cols?: number;
  groupWidth?: number;
  startY?: number;
  gapX?: number;
  gapY?: number;
}

export interface LayoutableNode {
  id: string;
  position?: { x: number; y: number };
  parentId?: string;
  extent?: 'parent';
}

export interface ComputedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pick a sensible column count. Biased toward 3 cols for typical pod sizes.
 */
export function pickColsFor(count: number): number {
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 12) return 3;
  if (count <= 16) return 4;
  return 5;
}

/**
 * Calculate group dimensions to fit `count` devices in `cols` columns.
 */
export function calcGroupSize(count: number, cols?: number) {
  if (count === 0) return { width: 360, height: 220 };
  const c = cols ?? pickColsFor(count);
  const rows = Math.ceil(count / c);
  return {
    width:  PADDING_X * 2 + c * DEVICE_W + (c - 1) * GAP_X,
    height: HEADER_H + PADDING_Y * 2 + rows * DEVICE_H + (rows - 1) * GAP_Y,
    //      ^^^^^^^^ now correctly accounts for the header
  };
}
/**
 * Compute (x, y) for a child at `localIndex` so the row is centered
 * horizontally within `groupWidth`. Mimics CSS flex-wrap + justify-center.
 */
export function computeCenteredGridPos(
  localIndex: number,
  totalSiblings: number,
  groupWidth: number,
  cols?: number,
): { x: number; y: number } {
  const innerWidth = groupWidth - PADDING_X * 2;
  const perRow =
    cols ??
    Math.max(1, Math.floor((innerWidth + GAP_X) / (DEVICE_W + GAP_X)));

  const row = Math.floor(localIndex / perRow);
  const col = localIndex % perRow;

  // How many items are in THIS row? (last row may be partial)
  const itemsInRow = Math.min(perRow, totalSiblings - row * perRow);
  const rowContentWidth =
    itemsInRow * DEVICE_W + Math.max(0, itemsInRow - 1) * GAP_X;
  const rowStartX = (groupWidth - rowContentWidth) / 2;

  return {
    x: rowStartX + col * (DEVICE_W + GAP_X),
    y: HEADER_H + PADDING_Y + row * (DEVICE_H + GAP_Y),
  };
}

/**
 * Lay out children in a centered grid. Children must extend LayoutableNode.
 * Pass `groupWidth` so the math centers correctly inside the actual group box.
 */
export function layoutChildrenInGroup<T extends LayoutableNode>(
  children: T[],
  options: LayoutOptions = {},
): T[] {
  const total = children.length;
  const cols = options.cols ?? pickColsFor(total);
  const groupWidth = options.groupWidth ?? calcGroupSize(total, cols).width;

  return children.map((child, i) => ({
    ...child,
    position: computeCenteredGridPos(i, total, groupWidth, cols),
    extent: 'parent' as const,
  })) as T[];
}

/**
 * Reactive bounding-box for an existing group's current children.
 * Returns the box in the group's LOCAL coordinate space.
 */
export function computeGroupBox<
  TDevice extends {
    id: string;
    parentId?: string;
    position?: { x: number; y: number };
  },
>(
  groupId: string,
  devices: TDevice[],
  _groups?: unknown,
): ComputedBox {
  const children = devices.filter(
    (d) => d.parentId === groupId && d.position,
  );

  if (children.length === 0) {
    return { x: 0, y: 0, width: EMPTY_GROUP_W, height: EMPTY_GROUP_H };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const { x, y } = child.position!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + DEVICE_W > maxX) maxX = x + DEVICE_W;
    if (y + DEVICE_H > maxY) maxY = y + DEVICE_H;
  }

  return {
    x: Math.max(0, minX - PADDING_X),
    y: Math.max(0, minY - HEADER_H - PADDING_Y),
    width: maxX - minX + PADDING_X * 2,
    height: maxY - minY + HEADER_H + PADDING_Y * 2,
  };
}