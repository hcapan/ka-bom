"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import SwitchFaceplate from "./SwitchFaceplate";
import { getEffectiveCatalog } from "@/app/lib/hardware/catalog";
import type { ConfiguredDevice } from "../../lib/types";
import type { PortSpeed } from '../../lib/hardware/schema/base';

// Derive the catalog & PID entry types from the loader itself — no any, no guessing.
type Catalog = ReturnType<typeof getEffectiveCatalog>;
type SwitchSeries = Catalog[string];
type SwitchPIDEntry = SwitchSeries["pids"][number];

export type PhysicalStackNodeData = {
  stackId: string;
  label: string;
  members: ConfiguredDevice[];
  onConvertToLogical?: (stackId: string) => void;
  onDelete?: (stackId: string) => void;
};

function PhysicalStackNodeImpl({ data, selected }: NodeProps) {
  const { stackId, label, members, onConvertToLogical, onDelete } =
    data as PhysicalStackNodeData;

  const catalog = getEffectiveCatalog();

  // 🔍 Debug: log first member's shape so we can verify field names match
  if (members[0]) {
    const dbgSeries = catalog[members[0].hardware.series];
    const dbgPid = dbgSeries?.pids?.find(
      (p) => p.pid === members[0].hardware.chassisPid,
    );
    console.log("[STACK MEMBER SHAPE]", {
      deviceHardware: members[0].hardware,
      seriesKeys: dbgSeries ? Object.keys(dbgSeries) : null,
      pidEntry: dbgPid,
      pidEntryKeys: dbgPid ? Object.keys(dbgPid) : null,
      pidEntryFull: JSON.stringify(dbgPid, null, 2),
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 6,
        background: "#ffffff",
        border: `2px solid ${selected ? "#3b82f6" : "#005EB8"}`,
        borderRadius: 8,
        boxShadow: selected
          ? "0 0 0 3px rgba(59,130,246,0.3)"
          : "0 2px 6px rgba(0,0,0,0.4)",
        minWidth: 380,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2px 6px 4px",
          borderBottom: "1px solid #1e293b",
          marginBottom: 2,
        }}
      >
        <span className="text-stone-900 text-l" >
          📚 {label}
        </span>
        <span style={{ color: "#64748b", fontSize: 10 }}>
          {members.length} units
        </span>
      </div>

      {/* Stack members */}
      {members.map((device, idx) => {
        const series: SwitchSeries | undefined =
          catalog[device.hardware.series];
        const pidEntry: SwitchPIDEntry | undefined = series?.pids?.find(
          (p) => p.pid === device.hardware.chassisPid,
        );

        if (!series || !pidEntry) {
          return (
            <div
              key={device.id}
              style={{
                color: "#ef4444",
                fontSize: 10,
                padding: "6px 10px",
                background: "#1e293b",
                border: "1px solid #ef4444",
                borderRadius: 3,
              }}
            >
              ⚠ Unknown PID: {device.hardware.chassisPid}
            </div>
          );
        }

        // Resolve faceplate spec — try common shapes
        // (Replace with the real path once you confirm via the debug log)
        const fp = resolveFaceplate(pidEntry);

        return (
          <div
            key={device.id}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            
            data-stack-member-id={device.id}
            data-stack-member-index={idx}
          >
            {/* Unit number badge (left side) */}
            <div
              style={{
                flex: "0 0 24px",
                textAlign: "center",
                fontSize: 10,
                color: "#64748b",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {idx + 1 }
            </div>

            {/* Faceplate */}
            <div style={{ position: "relative", flex:1 }}>
              <SwitchFaceplate
                pid={pidEntry.pid}
                vendor={series.vendor ?? "Cisco"}
                accessPortCount={fp.accessPortCount}
                accessPortSpeed={fp.accessPortSpeed as PortSpeed}
                uplinkPortCount={fp.uplinkPortCount}
                uplinkPortSpeed={fp.accessPortSpeed as PortSpeed}
                rackUnits={fp.rackUnits}
                hasPoe={fp.hasPoe}
              />
            </div>

            {/* Hostname label (right side, doesn't overlap) */}
            {device.name && (
              <div
                style={{
                  flex: "0 0 50px",
                  fontSize: 10,
                  color: "#cbd5e1",
                  fontFamily: "monospace",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={device.name}
              >
                {device.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Stack-level handles for uplinks */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${stackId}-top`}
        style={{ background: "#22c55e" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${stackId}-bottom`}
        style={{ background: "#22c55e" }}
      />

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          gap: 4,
          paddingTop: 4,
          marginTop: 2,
          borderTop: "1px solid #1e293b",
        }}
      >
        {onConvertToLogical && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvertToLogical(stackId);
            }}
            style={{
              fontSize: 9,
              color: "#94a3b8",
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: 3,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            Unstack
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(stackId);
            }}
            style={{
              fontSize: 9,
              color: "#ef4444",
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: 3,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Faceplate spec resolver — typed for nested accessPorts/uplinkPorts schema
// ============================================================
const VALID_PORT_SPEEDS: readonly PortSpeed[] = [
  '1G', '2.5G', '10G', '25G', '40G', '50G', '100G', '400G',
] as const;

function isPortSpeed(value: unknown): value is PortSpeed {
  return (
    typeof value === 'string' &&
    (VALID_PORT_SPEEDS as readonly string[]).includes(value)
  );
}

type FaceplateSpec = {
  accessPortCount: number;
  accessPortSpeed: PortSpeed;
  uplinkPortCount: number;
  uplinkPortSpeed: PortSpeed;
  rackUnits: number;
  hasPoe: boolean;
};

function resolveFaceplate(pidEntry: SwitchPIDEntry): FaceplateSpec {
  const entry = pidEntry as unknown as {
    faceplate?: {
      accessPorts?: { count?: number; speed?: string; poe?: boolean };
      uplinkPorts?: { count?: number; speed?: string };
      rackUnits?: number;
    };
  };

  const fp = entry.faceplate;
  const access = fp?.accessPorts;
  const uplink = fp?.uplinkPorts;

  return {
    accessPortCount: typeof access?.count === 'number' ? access.count : 0,
    accessPortSpeed: isPortSpeed(access?.speed) ? access.speed : '1G',
    uplinkPortCount: typeof uplink?.count === 'number' ? uplink.count : 0,
    uplinkPortSpeed: isPortSpeed(uplink?.speed) ? uplink.speed : '10G',
    rackUnits: typeof fp?.rackUnits === 'number' ? fp.rackUnits : 1,
    hasPoe: typeof access?.poe === 'boolean' ? access.poe : false,
  };
}

export const PhysicalStackNode = memo(PhysicalStackNodeImpl);