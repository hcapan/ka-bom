import type { DeviceType } from "./hardware";

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  model: string;
  sku: string;
  position?: { x: number; y: number };
};

export type Link = {
  id: string;
  from: string;
  to: string;
  sku: string;
};