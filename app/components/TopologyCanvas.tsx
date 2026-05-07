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

import DeviceNode from "./DeviceNode";
import CustomEdge from "./CustomEdge";
import { Device, Link } from "../lib/types";
import { LAYER_CONFIG, DeviceType } from "../lib/hardware";

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

function devicesToNodes(devices: Device[]): Node[] {
  return devices.map((d, i) => ({
    id: d.id,
    type: "device",
    position: d.position ?? {
      x: 100 + (i % 4) * 220,
      y: LAYER_CONFIG[d.type].y + 50,
    },
    data: {
      name: d.name,
      pid: d.pid,            // ✅ orderable SKU (e.g., C9500-48Y4C-A)
      model: d.model,        // ✅ series name (e.g., Catalyst 9500)
      type: d.type,
    },
  }));
}

function linksToEdges(links: Link[]): Edge[] {
  return links.map((l) => {
    // Determine link speed from optic SKU for visual styling
    const is100G = l.sku.includes("100G");
    const is40G = l.sku.includes("40G");
    const is25G = l.sku.includes("25G");
    const isHighSpeed = is100G || is40G;

    let label = "10G";
    let stroke = "#0ea5e9"; // sky blue (10G default)

    if (is100G) {
      label = "100G";
      stroke = "#9333ea"; // violet
    } else if (is40G) {
      label = "40G";
      stroke = "#7c3aed"; // purple
    } else if (is25G) {
      label = "25G";
      stroke = "#06b6d4"; // cyan
    } else if (l.sku.includes("1G") || l.sku.startsWith("GLC")) {
      label = "1G";
      stroke = "#64748b"; // slate
    }

    return {
      id: l.id,
      source: l.from,
      target: l.to,
      type: "custom",
      label,
      animated: isHighSpeed,
      style: {
        stroke,
        strokeWidth: isHighSpeed ? 3 : 2,
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

  // ---------- One-way sync: PARENT → CANVAS (only when prop IDs differ) ----------
  // Handles external adds (Sidebar), Reset, Import JSON
  const lastSyncedDeviceIdsRef = useRef<string>("");
  const lastSyncedLinkIdsRef = useRef<string>("");

  useEffect(() => {
    const incomingIds = devices.map((d) => d.id).sort().join("|");
    if (incomingIds !== lastSyncedDeviceIdsRef.current) {
      lastSyncedDeviceIdsRef.current = incomingIds;
      setNodes(devicesToNodes(devices));
    }
  }, [devices, setNodes]);

  useEffect(() => {
    const incomingIds = links.map((l) => l.id).sort().join("|");
    if (incomingIds !== lastSyncedLinkIdsRef.current) {
      lastSyncedLinkIdsRef.current = incomingIds;
      setEdges(linksToEdges(links));
    }
  }, [links, setEdges]);

  // ---------- Imperative sync: CANVAS → PARENT ----------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current);

        // Only sync to parent when something meaningful happens
        const hasPositionChange = changes.some(
          (c) => c.type === "position" && !c.dragging
        );
        const hasRemoval = changes.some((c) => c.type === "remove");

        if (hasPositionChange || hasRemoval) {
          const newDevices: Device[] = next.map((n) => {
            const data = n.data as {
              name: string;
              pid: string;
              model: string;
              type: DeviceType;
            };
            return {
              id: n.id,
              name: data.name,
              pid: data.pid,        // ✅ correct field
              model: data.model,
              type: data.type,
              position: n.position,
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
        }

        return next;
      });
    },
    [setNodes, setEdges, setDevices, setLinks]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);

        const hasRemoval = changes.some((c) => c.type === "remove");
        if (hasRemoval) {
          const remainingIds = new Set(next.map((e) => e.id));
          const newLinks = linksRef.current.filter((l) =>
            remainingIds.has(l.id)
          );
          lastSyncedLinkIdsRef.current = newLinks
            .map((l) => l.id)
            .sort()
            .join("|");
          setLinks(newLinks);

          // Rebuild edges so CustomEdge re-evaluates pair counts
          return linksToEdges(newLinks);
        }

        return next;
      });
    },
    [setEdges, setLinks]
  );

  // ---------- Connect handler ----------
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      const newId = `LNK-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;
      const newLink: Link = {
        id: newId,
        from: params.source,
        to: params.target,
        sku: defaultLinkSku,
      };

      const newLinks = [...linksRef.current, newLink];

      lastSyncedLinkIdsRef.current = newLinks
        .map((l) => l.id)
        .sort()
        .join("|");

      setLinks(newLinks);
      setEdges(linksToEdges(newLinks));
    },
    [setEdges, setLinks, defaultLinkSku]
  );

  // ---------- Layer band labels ----------
  const layerBands = useMemo(
    () =>
      Object.entries(LAYER_CONFIG).map(([type, cfg]) => ({
        type: type as DeviceType,
        ...cfg,
      })),
    []
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

{ (
        <button
          onClick={onExport}
          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
          title="Export topology as JSON"
        >
          ⬇ Export BOM
        </button>
      )}
      <div className="absolute top-2 right-2 z-10">
        
        <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border">
          DRAG NODES • CONNECT HANDLES • DEL TO REMOVE
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