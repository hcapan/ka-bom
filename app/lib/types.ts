import type { DeviceType } from "./hardware";

export interface Device {
  id: string;
  name: string;
  model: string;     // series name, e.g., "Catalyst 9500"
  pid: string;       // ✅ orderable SKU, e.g., "C9500-48Y4C-A"
  type: DeviceType;
  position?: { x: number; y: number };
}


export interface Link {
  id: string;
  from: string;
  to: string;
  sku: string;
  sourceHandle?: string;   // ✅ NEW: which handle on source node
  targetHandle?: string;   // ✅ NEW: which handle on target node
  isLateral?: boolean;     // ✅ NEW: HA/VSS/SVL flag
}