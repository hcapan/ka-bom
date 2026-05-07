"use client";
import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { LAYER_CONFIG, DeviceType } from "../lib/hardware";

export type DeviceNodeData = {
  name: string;
  sku: string;
  model: string;
  type: DeviceType;
};

function DeviceNode({ data, selected }: NodeProps) {
  const d = data as DeviceNodeData;
  const layer = LAYER_CONFIG[d.type];

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 px-4 py-3 min-w-45 transition-all ${
        selected ? "shadow-xl scale-105" : ""
      }`}
      style={{
        borderColor: layer.color,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: layer.color, width: 10, height: 10 }}
      />

      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: layer.color }}
        />
        <span
          className="text-[9px] uppercase font-bold tracking-wider"
          style={{ color: layer.color }}
        >
          {d.type}
        </span>
        
      </div>

      <div className="text-sm font-bold text-slate-800 mb-0.5">{d.name}</div>
      <div className="text-[10px] text-slate-500 font-mono">{d.sku}</div>
      <div className="text-[9px] text-slate-400 mt-0.5">{d.model}</div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: layer.color, width: 10, height: 10 }}
      />
    </div>
  );
}

export default memo(DeviceNode);
