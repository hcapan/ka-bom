"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import DeviceNode, { DeviceData } from "./DeviceNode";
import CustomEdge from "./CustomEdge";
import { Device, Link } from "../lib/types";
import { LAYER_CONFIG, DeviceType } from "../lib/hardware";
import { ConfiguredDevice } from "../lib/types";

const nodeTypes = { device: DeviceNode };
const edgeTypes = { custom: CustomEdge };

type Props = {
  devices: Device[];
  links: Link[];
  setDevices: (d: Device[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  onExport?: () => void;
};

// ============================================================
// HELPERS
// ============================================================

function devicesToNodes(devices: ConfiguredDevice[]): Node[] {
  return devices.map((d, i) => ({
    id: d.id,
    type: "device",
    position: d.position ?? {
      x: 100 + (i % 4) * 220,
      y: LAYER_CONFIG[d.type].y + 50,
    },
    data: {
      name: d.name,
      pid: d.hardware.chassisPid, // ← was d.pid
      model: d.hardware.series, // ← was d.model
      type: d.type,
    },
  }));
}

function linksToEdges(links: Link[]): Edge[] {
  return links.map((l) => {
    const opticPid = l.optic.pid; // ← was l.sku
    const is100G = opticPid.includes("100G");
    const is40G = opticPid.includes("40G");
    const is25G = opticPid.includes("25G");
    const isHighSpeed = is100G || is40G; 

    let label = "10G";
    let stroke = "#0ea5e9";

    if (l.isLateral) {
      label = "HA/VSS";
      stroke = "#f59e0b"; // amber
    } else if (is100G) {
      label = "100G";
      stroke = "#9333ea";
    } else if (is40G) {
      label = "40G";
      stroke = "#7c3aed";
    } else if (is25G) {
      label = "25G";
      stroke = "#06b6d4";
    } else if (opticPid.includes("1G") || opticPid.startsWith("GLC")) {
      label = "1G";
      stroke = "#64748b";
    }

    return {
      id: l.id,
      source: l.from,
      target: l.to,
      sourceHandle: l.sourceHandle, // ✅ tell RF which handle to attach to
      targetHandle: l.targetHandle, // ✅
      type: "custom",
      label,
      animated: isHighSpeed && !l.isLateral, // don't animate HA links
      style: {
        stroke,
        strokeWidth: l.isLateral ? 3 : isHighSpeed ? 3 : 2,
        strokeDasharray: l.isLateral ? "8 4" : undefined,
      },
    };
  });
}

// ============================================================
// CANVAS COMPONENT
// ============================================================

function CanvasInner({
  devices,
  links,
  setDevices,
  setLinks,
  defaultLinkSku,
  onExport,
}: Props) {
  // React Flow owns live state during interaction
  const [nodes, setNodes] = useNodesState(devicesToNodes(devices));
  const [edges, setEdges] = useEdgesState(linksToEdges(links));

  // Refs for latest values inside event handlers (no re-creating callbacks)
  const devicesRef = useRef(devices);
  const linksRef = useRef(links);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const layerBands = useMemo(
    () =>
      Object.entries(LAYER_CONFIG).map(([type, cfg]) => ({
        type: type as DeviceType,
        ...cfg,
      })),
    [],
  );

  // ---------- One-way sync: PARENT → CANVAS (only when prop IDs differ) ----------
  // Handles external adds (Sidebar), Reset, Import JSON
  const lastSyncedDeviceIdsRef = useRef<string>("");
  const lastSyncedLinkIdsRef = useRef<string>("");

  useEffect(() => {
    const incomingIds = devices
      .map((d) => d.id)
      .sort()
      .join("|");
    if (incomingIds !== lastSyncedDeviceIdsRef.current) {
      lastSyncedDeviceIdsRef.current = incomingIds;
      setNodes(devicesToNodes(devices));
    }
  }, [devices, setNodes]);

  useEffect(() => {
    const incomingIds = links
      .map((l) => l.id)
      .sort()
      .join("|");
    if (incomingIds !== lastSyncedLinkIdsRef.current) {
      lastSyncedLinkIdsRef.current = incomingIds;
      setEdges(linksToEdges(links));
    }
  }, [links, setEdges]);

  // ---------- Imperative sync: CANVAS → PARENT ----------
  const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    // ✅ Compute next state OUTSIDE any setState updater
    const next = applyNodeChanges(changes, nodes);

    // Always update React Flow's internal state
    setNodes(next);

    // Detect meaningful changes for parent sync
    const hasPositionChange = changes.some(
      (c) => c.type === "position" && !c.dragging
    );
    const hasRemoval = changes.some((c) => c.type === "remove");

    if (!hasPositionChange && !hasRemoval) return;

    // Build new devices array (preserve hardware/license/smartnet config)
    const newDevices: ConfiguredDevice[] = next.map((n) => {
      const data = n.data as DeviceData;
      const existing = devicesRef.current.find((d) => d.id === n.id);
      return existing
        ? { ...existing, position: n.position }
        : {
            id: n.id,
            name: data.name,
            type: data.type,
            position: n.position,
            hardware: {
              series: data.model,
              chassisPid: data.pid,
            },
          };
    });

    lastSyncedDeviceIdsRef.current = newDevices
      .map((d) => d.id)
      .sort()
      .join("|");
    setDevices(newDevices);

    // Cascade-remove orphan links
    if (hasRemoval) {
      const ids = new Set(newDevices.map((d) => d.id));
      const filtered = linksRef.current.filter(
        (l) => ids.has(l.from) && ids.has(l.to)
      );
      if (filtered.length !== linksRef.current.length) {
        lastSyncedLinkIdsRef.current = filtered
          .map((l) => l.id)
          .sort()
          .join("|");
        setLinks(filtered);
        setEdges(linksToEdges(filtered));
      }
    }
  },
  [nodes, setNodes, setEdges, setDevices, setLinks]
);

  const onEdgesChange = useCallback(
  (changes: EdgeChange[]) => {
    // ✅ Compute next state OUTSIDE any setState updater
    const next = applyEdgeChanges(changes, edges);

    const hasRemoval = changes.some((c) => c.type === "remove");

    if (hasRemoval) {
      const remainingIds = new Set(next.map((e) => e.id));
      const newLinks = linksRef.current.filter((l) => remainingIds.has(l.id));

      lastSyncedLinkIdsRef.current = newLinks
        .map((l) => l.id)
        .sort()
        .join("|");

      // Sequential setState calls (React batches them automatically)
      setLinks(newLinks);
      setEdges(linksToEdges(newLinks)); // rebuild for CustomEdge pair-counting
    } else {
      // No removal — just apply the changes (selection, etc.)
      setEdges(next);
    }
  },
  [edges, setEdges, setLinks]
);

  // ---------- Connect handler ----------
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      // Detect lateral link (HA/VSS/SVL)
      const isLateral =
        (params.sourceHandle === "left" || params.sourceHandle === "right") &&
        (params.targetHandle === "left" || params.targetHandle === "right");

      const newId = `${isLateral ? "HA" : "LNK"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;

      const newLink: Link = {
        id: newId,
        from: params.source,
        to: params.target,
        sourceHandle: params.sourceHandle ?? undefined,
        targetHandle: params.targetHandle ?? undefined,
        isLateral,
        optic: { pid: defaultLinkSku },
      };

      const newLinks = [...linksRef.current, newLink];
      lastSyncedLinkIdsRef.current = newLinks
        .map((l) => l.id)
        .sort()
        .join("|");
      setLinks(newLinks);
      setEdges(linksToEdges(newLinks));
    },
    [setEdges, setLinks, defaultLinkSku],
  );

  return (
    <div className="w-full h-[80vh] bg-slate-100 rounded-xl shadow-inner border-2 border-slate-300 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const type = (n.data as { type?: DeviceType })?.type;
            return type ? LAYER_CONFIG[type].color : "#94a3b8";
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>

      {/* Layer labels (non-interactive overlay) */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
        {layerBands.map((band) => (
          <span
            key={band.type}
            className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-white/90 rounded shadow-sm border"
            style={{ color: band.color, borderColor: `${band.color}40` }}
          >
            ▎ {band.label}
          </span>
        ))}
      </div>

      <div className="absolute top-2 right-35 z-10">
        <span className="bg-white/90 px-3 py-1 rounded-full text-[12px] font-bold text-slate-500 shadow-sm border">
          DRAG NODES • CONNECT HANDLES • DEL TO REMOVE
        </span>
      </div>
      <div className="absolute top-2 right-5 z-10">
        <span className="text-[12px] font-bold bg-white/90 px-3 py-1 rounded-full text-slate-500 shadow-sm border">
          {
            <button onClick={onExport} title="Export topology as JSON">
              ⬇ Export BOM
            </button>
          }
        </span>
      </div>
    </div>
  );
}

export default function TopologyCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
