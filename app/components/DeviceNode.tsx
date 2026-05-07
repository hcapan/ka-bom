"use client";
import { Handle, Position, NodeProps, type Node } from "@xyflow/react";
import { LAYER_CONFIG, DeviceType, getFaceplate } from "../lib/hardware";
import SwitchFaceplate from "./SwitchFaceplate";

export type DeviceData = {
  name: string;
  pid: string;        // ← read from device.hardware.chassisPid
  model: string;      // ← read from device.hardware.series
  type: DeviceType;
  [key: string]: unknown;
};

export type DeviceNodeType = Node<DeviceData, "device">;

// ============================================================
// HANDLE STYLES — visible, color-coded by purpose
// ============================================================
const handleBase: React.CSSProperties = {
  width: 12,
  height: 12,
  border: "2px solid white",
  borderRadius: "50%",
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  transition: "all 0.15s ease",
};

// Vertical (uplink/downlink) — uses layer color
const verticalHandle = (color: string): React.CSSProperties => ({
  ...handleBase,
  background: color,
  width: 14,
  height: 14,
});

// Horizontal (HA/VSS/SVL) — distinctive amber/orange to stand out
const lateralHandle: React.CSSProperties = {
  ...handleBase,
  background: "#f59e0b", // amber
  width: 12,
  height: 12,
};

export default function DeviceNode({
  data,
  selected,
}: NodeProps<DeviceNodeType>) {
  const cfg = LAYER_CONFIG[data.type] ?? {
    label: "UNKNOWN",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.05)",
    y: 0,
  };

  const faceplate = getFaceplate(data.model, data.pid);

  return (
    <div
      style={{
        background: "white",
        border: `2px solid ${selected ? "#0ea5e9" : cfg.color}`,
        borderRadius: 10,
        padding: 8,
        minWidth: 280,
        boxShadow: selected
          ? "0 0 0 3px rgba(14,165,233,0.25), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 2px 6px rgba(0,0,0,0.08)",
        position: "relative",
        transition: "all 0.15s ease",
      }}
    >
     {/* Top */}
      <Handle id="t" type="target" position={Position.Top} style={verticalHandle(cfg.color)} />
      <Handle id="t-src" type="source" position={Position.Top} style={{ ...verticalHandle(cfg.color), top: -6, opacity: 0 }} />

      {/* Bottom */}
      <Handle id="b-tgt" type="target" position={Position.Bottom} style={{ ...verticalHandle(cfg.color), bottom: -6, opacity: 0 }} />
      <Handle id="b" type="source" position={Position.Bottom} style={verticalHandle(cfg.color)} />

      {/* Left — both directions for HA */}
      <Handle id="l-tgt" type="target" position={Position.Left} style={{ ...lateralHandle, opacity: 0 }} />
      <Handle id="l" type="source" position={Position.Left} style={lateralHandle} />

      {/* Right — both directions for HA */}
      <Handle id="r-tgt" type="target" position={Position.Right} style={{ ...lateralHandle, opacity: 0 }} />
      <Handle id="r" type="source" position={Position.Right} style={lateralHandle} />

      {/* ==================================================== */}
      {/* HEADER: Hostname + Layer Tag                          */}
      {/* ==================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: cfg.color,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            {data.name}
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: "0.08em",
          }}
        >
          {cfg.label.split(" ")[0]}
        </span>
      </div>

      {/* ==================================================== */}
      {/* SVG FACEPLATE                                         */}
      {/* ==================================================== */}
      {faceplate?.accessPorts ? (
        <SwitchFaceplate
          pid={data.pid}
          accessPortCount={faceplate.accessPorts.count}
          accessPortSpeed={faceplate.accessPorts.speed}
          uplinkPortCount={faceplate.uplinkPorts?.count ?? 0}
          uplinkPortSpeed={faceplate.uplinkPorts?.speed ?? "10G"}
          hasPoe={faceplate.accessPorts.poe}
          rackUnits={faceplate.rackUnits}
        />
      ) : (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "#475569",
            background: "#f1f5f9",
            padding: 8,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          {data.pid}
        </div>
      )}

      {/* ==================================================== */}
      {/* FOOTER: Series                                        */}
      {/* ==================================================== */}
      <div
        style={{
          fontSize: 10,
          color: "#94a3b8",
          marginTop: 4,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {data.model}
      </div>

      {/* ==================================================== */}
      {/* BOTTOM HANDLE — Downlink (source = goes downstream)   */}
      {/* ==================================================== */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={verticalHandle(cfg.color)}
        title="Downlink (upstream connection)"
      />
    </div>
  );
}
