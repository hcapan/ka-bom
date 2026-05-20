"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConfiguredDevice } from "@/app/lib/types";
import {
  getChassisSlotLayout,
  normalizeSlots,
  type SlotLayoutEntry,
} from "@/app/lib/hardware/chassisHelpers";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import { MODULAR_TOKENS, MODULAR_SIZES } from "./chassisStyles";
import { ChassisHeader } from "./ChassisHeader";
import { SlotRow } from "./SlotRow";

export type ModularChassisNodeData = {
  device: ConfiguredDevice;
  onConfigureSlot: (deviceId: string, slotId: string) => void;
  onConfigureDevice?: (deviceId: string) => void;
};

function ModularChassisNodeImpl({ data, selected }: NodeProps) {
  const { device, onConfigureSlot, onConfigureDevice } =
    data as ModularChassisNodeData;

  const layout: SlotLayoutEntry[] = getChassisSlotLayout(
    device.hardware.chassisPid,
  );

  if (layout.length === 0) {
    return (
      <div
        style={{
          background: MODULAR_TOKENS.bodyBg,
          color: "#ef4444",
          padding: 12,
          borderRadius: 4,
          border: "2px solid #ef4444",
          fontFamily: "monospace",
          fontSize: 11,
          minWidth: MODULAR_SIZES.CHASSIS_WIDTH,
        }}
      >
        ⚠ No modular layout for {device.hardware.chassisPid}
      </div>
    );
  }

  const catalog = getEffectiveCatalog();
  const series = catalog[device.hardware.series];
  const chassisPidEntry = series?.pids.find(
    (p) => p.pid === device.hardware.chassisPid,
  );

  const slots = normalizeSlots(device);
  const occupied = slots.filter((s) => s.modulePid).length;

  return (
    <div
      style={{
        position: "relative",
        width: MODULAR_SIZES.CHASSIS_WIDTH,
        background: MODULAR_TOKENS.bodyBg,
        border: `1px solid ${selected ? "#3b82f6" : MODULAR_TOKENS.bodyBorder}`,
        borderRadius: 4,
        boxShadow: selected
          ? `0 0 0 2px rgba(59,130,246,0.35), 0 4px 10px rgba(0,0,0,0.15)`
          : `0 2px 6px rgba(0,0,0,0.15)`,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onDoubleClick={() => onConfigureDevice?.(device.id)}
    >
      {/* Top metal-edge highlight (matches faceplate) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: MODULAR_TOKENS.bodyHighlight,
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />

      {/* Bottom metal-edge shadow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: MODULAR_TOKENS.bodyShadow,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <ChassisHeader
        hostname={device.name}
        pid={device.hardware.chassisPid}
        vendor={series?.vendor ?? "Cisco"}
        description={chassisPidEntry?.description}
        totalSlots={layout.length}
        occupiedSlots={occupied}
      />

      {/* Slot tower */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: MODULAR_SIZES.SLOT_GAP,
          padding: `${MODULAR_SIZES.SLOT_GAP}px 0`,
          background: MODULAR_TOKENS.slotPanelBg,
        }}
      >
        {layout.map((slotSpec) => {
          const slotId = String(slotSpec.slot);
          const assignment = slots.find((s) => s.slotId === slotId);
          return (
            <SlotRow
              key={slotId}
              deviceId={device.id}
              slotId={slotId}
              slotKind={slotSpec.kind}
              modulePid={assignment?.modulePid}
              required={slotSpec.required}
              note={slotSpec.note}
              onClick={() => onConfigureSlot(device.id, slotId)}
            />
          );
        })}
      </div>

      {/* Chassis-level handles for high-level diagrams */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${device.id}::chassis::top`}
        style={{
          background: "#22c55e",
          width: 8,
          height: 8,
          border: `1px solid ${MODULAR_TOKENS.bodyBorder}`,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${device.id}::chassis::bottom`}
        style={{
          background: "#22c55e",
          width: 8,
          height: 8,
          border: `1px solid ${MODULAR_TOKENS.bodyBorder}`,
        }}
      />

      {/* ⭐ Compatibility handles — match DeviceNode short IDs (t/b/l/r) */}
      {/* Required for bulk-connect and other code that uses short handle IDs */}
      <Handle
        type="target"
        position={Position.Top}
        id="t"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          top: 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          bottom: 0,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="l"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          left: 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          right: 0,
        }}
      />
    </div>
  );
}

export const ModularChassisNode = memo(ModularChassisNodeImpl);
