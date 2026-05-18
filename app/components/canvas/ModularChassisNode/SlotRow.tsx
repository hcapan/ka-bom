"use client";

import { Handle, Position } from "@xyflow/react";
import type { SlotKind } from "@/app/lib/types";
import {
  getModuleByPid,
  type ModuleCatalogEntry,
} from "@/app/lib/hardware/chassisHelpers";
import { MODULAR_TOKENS, SLOT_HEIGHT } from "./chassisStyles";
import { EmptySlot } from "./slotRenderers/EmptySlot";
import { SupervisorSlot } from "./slotRenderers/SupervisorSlot";
import { LinecardSlot } from "./slotRenderers/LineCardSlot";
import { ServiceModuleSlot } from "./slotRenderers/ServiceModuleSlot";
import { FabricModuleSlot } from "./slotRenderers/FabricModuleSlot";

type Props = {
  deviceId: string;
  slotId: string;
  slotKind: SlotKind;
  modulePid?: string;
  required?: boolean;
  note?: string;
  onClick: () => void;
};

export function SlotRow({
  deviceId,
  slotId,
  slotKind,
  modulePid,
  required,
  note,
  onClick,
}: Props) {
  // ⭐ renamed `module` → `moduleEntry` to avoid Next.js reserved name
  const moduleEntry: ModuleCatalogEntry | undefined = modulePid
    ? getModuleByPid(modulePid)
    : undefined;

  return (
    <div
      style={{
        position: "relative",
        height: SLOT_HEIGHT,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {!moduleEntry ? (
        <EmptySlot
          slotId={slotId}
          slotKind={slotKind}
          required={required}
          note={note}
          onClick={onClick}
        />
      ) : (
        renderModule({ slotId, slotKind, moduleEntry, onClick })
      )}

      {/* Per-slot cabling handles — only on populated slots */}
      {moduleEntry && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id={`${deviceId}::slot:${slotId}::right`}
            style={{
              top: "50%",
              background: MODULAR_TOKENS.brandBg,
              width: 8,
              height: 8,
              border: `1px solid ${MODULAR_TOKENS.bodyBg}`,
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={`${deviceId}::slot:${slotId}::left`}
            style={{
              top: "50%",
              background: MODULAR_TOKENS.brandBg,
              width: 8,
              height: 8,
              border: `1px solid ${MODULAR_TOKENS.bodyBg}`,
            }}
          />
        </>
      )}
    </div>
  );
}

function renderModule(args: {
  slotId: string;
  slotKind: SlotKind;
  moduleEntry: ModuleCatalogEntry;
  onClick: () => void;
}) {
  const { slotId, slotKind, moduleEntry, onClick } = args;

  switch (slotKind) {
    case "supervisor":
      return (
        <SupervisorSlot
          slotId={slotId}
          module={moduleEntry}
          onClick={onClick}
        />
      );
    case "linecard":
      return (
        <LinecardSlot
          slotId={slotId}
          module={moduleEntry}
          onClick={onClick}
        />
      );
    case "fabric-module":
      return (
        <FabricModuleSlot
          slotId={slotId}
          module={moduleEntry}
          onClick={onClick}
        />
      );
    case "ssd":
    default:
      return (
        <ServiceModuleSlot
          slotId={slotId}
          module={moduleEntry}
          onClick={onClick}
        />
      );
  }
}