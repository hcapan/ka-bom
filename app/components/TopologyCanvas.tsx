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
import { Device, Link, UISettings, ConfiguredDevice } from "../lib/types";
import { LAYER_CONFIG, DeviceType } from "../lib/hardware";
import { BundledEdge } from "./BundledEdge";
import { bundleLinks } from "../lib/utils/bundlelink";

const nodeTypes = { device: DeviceNode };
const edgeTypes = { custom: CustomEdge, bundled: BundledEdge };

type Props = {
  devices: Device[];
  links: Link[];
  setDevices: (d: Device[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  onExport?: () => void;
  onNodeClick?: (deviceId: string) => void;

  // ✨ NEW — bundling props from useProject()
  ui: UISettings;
  onExpandBundle: (bundleId: string) => void;
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
      pid: d.hardware.chassisPid,
      model: d.hardware.series,
      type: d.type,
    },
  }));
}

/** Convert a single Link → React Flow Edge (used for non-bundled rendering) */
function linkToEdge(l: Link): Edge {
  const opticPid = l.optic.pid;
  const is100G = opticPid.includes("100G");
  const is40G = opticPid.includes("40G");
  const is25G = opticPid.includes("25G");
  const isHighSpeed = is100G || is40G;

  let label = "10G";
  let stroke = "#0ea5e9";

  if (l.isLateral) {
    label = "HA/VSS";
    stroke = "#f59e0b";
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
    sourceHandle: l.sourceHandle,
    targetHandle: l.targetHandle,
    type: "custom",
    label,
    animated: isHighSpeed && !l.isLateral,
    style: {
      stroke,
      strokeWidth: l.isLateral ? 3 : isHighSpeed ? 3 : 2,
      strokeDasharray: l.isLateral ? "8 4" : undefined,
    },
  };
}

/**
 * ✨ NEW — Bundle-aware edge builder.
 * - When bundling is OFF → renders all links individually (legacy behavior)
 * - When ON → groups links by (pair + optic + handle pair), collapses to one edge
 * - Expanded bundles render as individual links again
 * - Lateral (HA/VSS) links bypass bundling and always render individually
 */
function buildEdges(
  links: Link[],
  ui: UISettings,
  onExpandBundle: (bundleId: string) => void
): Edge[] {
  if (!ui.bundleEdges) return links.map(linkToEdge);

  const safeUI: UISettings = ui ?? { bundleEdges: false, expandedBundles: [] };
  // Lateral HA links should never bundle — render them as-is
  const lateralLinks = links.filter((l) => l.isLateral);
  const hierarchicalLinks = links.filter((l) => !l.isLateral);

  const bundles = bundleLinks(hierarchicalLinks);
  const result: Edge[] = lateralLinks.map(linkToEdge);

  for (const b of bundles) {
    const isExpanded = ui.expandedBundles.includes(b.bundleId);

    if (b.count === 1 || isExpanded) {
      // Render member links individually
      const members = hierarchicalLinks.filter((l) =>
        b.linkIds.includes(l.id)
      );
      result.push(...members.map(linkToEdge));
    } else {
      // Render as a single bundle edge
      result.push({
        id: b.bundleId,
        source: b.source,
        target: b.target,
        sourceHandle: b.sourceHandle,
        targetHandle: b.targetHandle,
        type: "bundled",
        data: {
          count: b.count,
          opticPid: b.opticPid,
          totalBandwidthGbps: b.totalBandwidthGbps,
          linkIds: b.linkIds,
          onExpand: onExpandBundle,
        },
      });
    }
  }
  return result;
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
  onNodeClick,
  ui,                  // ✨
  onExpandBundle,      // ✨
}: Props) {
  // React Flow owns live state during interaction
  const [nodes, setNodes] = useNodesState(devicesToNodes(devices));
  const [edges, setEdges] = useEdgesState(
    buildEdges(links, ui, onExpandBundle)
  );

  // Refs for latest values inside event handlers
  const devicesRef = useRef(devices);
  const linksRef = useRef(links);
  const uiRef = useRef(ui);
  const onExpandBundleRef = useRef(onExpandBundle);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  useEffect(() => {
    onExpandBundleRef.current = onExpandBundle;
  }, [onExpandBundle]);

  const layerBands = useMemo(
    () =>
      Object.entries(LAYER_CONFIG).map(([type, cfg]) => ({
        type: type as DeviceType,
        ...cfg,
      })),
    []
  );

  // ---------- One-way sync: PARENT → CANVAS ----------
  const lastSyncedDeviceIdsRef = useRef<string>("");
  const lastSyncedLinkIdsRef = useRef<string>("");
  const lastSyncedUIRef = useRef<string>("");

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

  // ✨ Re-render edges when links OR bundling state changes
  useEffect(() => {
    const incomingLinkIds = links
      .map((l) => l.id)
      .sort()
      .join("|");
    const incomingUIKey = `${ui.bundleEdges}|${[...ui.expandedBundles]
      .sort()
      .join(",")}`;

    const linksChanged = incomingLinkIds !== lastSyncedLinkIdsRef.current;
    const uiChanged = incomingUIKey !== lastSyncedUIRef.current;

    if (linksChanged || uiChanged) {
      lastSyncedLinkIdsRef.current = incomingLinkIds;
      lastSyncedUIRef.current = incomingUIKey;
      setEdges(buildEdges(links, ui, onExpandBundle));
    }
  }, [links, ui, onExpandBundle, setEdges]);

  // ---------- Imperative sync: CANVAS → PARENT ----------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, nodes);
      setNodes(next);

      const hasPositionChange = changes.some(
        (c) => c.type === "position" && !c.dragging
      );
      const hasRemoval = changes.some((c) => c.type === "remove");

      if (!hasPositionChange && !hasRemoval) return;

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
          setEdges(buildEdges(filtered, uiRef.current, onExpandBundleRef.current));
        }
      }
    },
    [nodes, setNodes, setEdges, setDevices, setLinks]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edges);
      const removalChanges = changes.filter((c) => c.type === "remove");

      if (removalChanges.length > 0) {
        // ✨ A removed edge could be a BUNDLE — expand its linkIds to delete all members
        const removedEdgeIds = new Set(removalChanges.map((c) => c.id));

        // Look up current edges to identify bundles being removed
        const removedLinkIds = new Set<string>();
        for (const e of edges) {
          if (!removedEdgeIds.has(e.id)) continue;
          if (e.type === "bundled") {
            const bundleData = e.data as { linkIds?: string[] };
            bundleData.linkIds?.forEach((id) => removedLinkIds.add(id));
          } else {
            removedLinkIds.add(e.id);
          }
        }

        const newLinks = linksRef.current.filter(
          (l) => !removedLinkIds.has(l.id)
        );

        lastSyncedLinkIdsRef.current = newLinks
          .map((l) => l.id)
          .sort()
          .join("|");

        setLinks(newLinks);
        setEdges(buildEdges(newLinks, uiRef.current, onExpandBundleRef.current));
      } else {
        // No removal — just apply (selection, etc.)
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
      setEdges(buildEdges(newLinks, uiRef.current, onExpandBundleRef.current));
    },
    [setEdges, setLinks, defaultLinkSku]
  );

  return (
    <div className="w-full h-full bg-slate-100 rounded-xl shadow-inner border-2 border-slate-300 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
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

      {/* Layer labels */}
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

      <div className="absolute top-2 right-5 z-10">
        <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border">
          DRAG NODES • CONNECT HANDLES • DEL TO REMOVE
          {ui.bundleEdges && " • BUNDLED"}
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