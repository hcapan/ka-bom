"use client";
import { Handle, Position, NodeProps, type Node } from "@xyflow/react";
import {
  LAYER_CONFIG,
  DeviceType,
  getFaceplate,
} from "../../lib/hardware/catalog";
import SwitchFaceplate from "./SwitchFaceplate";

export type DeviceData = {
  name: string;
  pid: string;
  model: string;
  type: DeviceType;
  [key: string]: unknown;
};

export type DeviceNodeType = Node<DeviceData, "device">;

const handleBase: React.CSSProperties = {
  width: 10,
  height: 10,
  border: "2px solid white",
  borderRadius: "50%",
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  transition: "all 0.15s ease",
};

const verticalHandle = (color: string): React.CSSProperties => ({
  ...handleBase,
  background: color,
  width: 12,
  height: 12,
});

const lateralHandle: React.CSSProperties = {
  ...handleBase,
  background: "#f59e0b",
  width: 10,
  height: 10,
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
        padding: 6, // ↓ was 3 — use this for breathing room around faceplate
        minWidth: 180, // ↓ was 200
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

      {/* Left */}
      <Handle id="l-tgt" type="target" position={Position.Left} style={{ ...lateralHandle, opacity: 0 }} />
      <Handle id="l" type="source" position={Position.Left} style={lateralHandle} />

      {/* Right */}
      <Handle id="r-tgt" type="target" position={Position.Right} style={{ ...lateralHandle, opacity: 0 }} />
      <Handle id="r" type="source" position={Position.Right} style={lateralHandle} />

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: cfg.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 10, // ↓ smaller, no scale hack
              color: "#0f172a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.name}
          </span>
        </div>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          {cfg.label.split(" ")[0]}
        </span>
      </div>

      {/* FACEPLATE */}
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
            fontSize: 10,
            color: "#475569",
            background: "#f1f5f9",
            padding: 6,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          {data.pid}
        </div>
      )}

      {/* FOOTER */}
      <div
        style={{
          fontSize: 9,
          color: "#94a3b8",
          marginTop: 3,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {data.model} --- {data.pid}
      </div>
    </div>
  );
}