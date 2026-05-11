import { ConfiguredDevice, Link, NamingConfig, DeviceType } from "../types";
import { generateHostname } from "./nameGenerator";
import { LAYER_CONFIG } from "../hardware";

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
  reserved: Set<string>,
): string {
  const prefix = TYPE_PREFIX[type] ?? "DEV";
  const allIds = new Set([...existing.map((d) => d.id), ...reserved]);

  let n = 1;
  // Find lowest unused number for this prefix
  while (allIds.has(`${prefix}-${String(n).padStart(2, "0")}`)) {
    n++;
  }
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

// ============================================================
// AUTO-GRID PLACEMENT
// ============================================================
const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 30;
const ROW_WIDTH = 8; // wraps after 8 devices per row

/**
 * Computes a clean grid position for the next device,
 * starting after existing devices in the same layer.
 */
function nextGridPosition(
  type: DeviceType,
  index: number,
  existingDevices: ConfiguredDevice[],
): { x: number; y: number } {
  const layerCfg = LAYER_CONFIG[type];
  const baseY = layerCfg.y + 80;

  // How many devices already exist in this layer?
  const existingInLayer = existingDevices.filter((d) => d.type === type).length;
  const totalIndex = existingInLayer + index;

  const row = Math.floor(totalIndex / ROW_WIDTH);
  const col = totalIndex % ROW_WIDTH;

  return {
    x: 100 + col * (NODE_WIDTH + HORIZONTAL_GAP),
    y: baseY + row * (NODE_HEIGHT + VERTICAL_GAP),
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
}

export interface BulkCreateResult {
  newDevices: ConfiguredDevice[];
  newLinks: Link[];
}

// ============================================================
// MAIN BUILDER
// ============================================================
/**
 * Create N devices with optional uplinks. Pure function — no side effects.
 */
export function createBulkDevices(
  spec: BulkCreateSpec,
  existingDevices: ConfiguredDevice[],
  existingLinks: Link[],
  naming: NamingConfig,
): BulkCreateResult {
  const newDevices: ConfiguredDevice[] = [];
  const newLinks: Link[] = [];
  const reservedIds = new Set<string>();

  // Track devices "as-if-added" so name generation increments correctly
  const cumulativeDevices: ConfiguredDevice[] = [...existingDevices];

  for (let i = 0; i < spec.quantity; i++) {
    const id = generateDeviceId(spec.type, cumulativeDevices, reservedIds);
    reservedIds.add(id);

    // Auto-name: pattern is the source of truth (Q5 forces auto-name for bulk)
    const name = generateHostname(
      naming.pattern,
      spec.type,
      spec.series,
      cumulativeDevices,
    );

    const position = nextGridPosition(spec.type, i, existingDevices);

    const device: ConfiguredDevice = {
      id,
      name,
      type: spec.type,
      position,
      hardware: {
        series: spec.series,
        chassisPid: spec.chassisPid,
      },
    };

    newDevices.push(device);
    cumulativeDevices.push(device);

    // Create uplinks for this device
    for (const uplink of spec.uplinks) {
      for (let j = 0; j < uplink.linkCount; j++) {
        newLinks.push({
          id: `LNK-${Date.now()}-${i}-${uplink.targetDeviceId}-${j}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          from: uplink.targetDeviceId, // ✅ parent (core/dist) = source
          to: device.id, // ✅ new device (access) = target
          sourceHandle: "bottom", // ✅ exits BOTTOM of par
          optic: { pid: uplink.opticPid },
        });
      }
    }
  }

  return { newDevices, newLinks };
}
