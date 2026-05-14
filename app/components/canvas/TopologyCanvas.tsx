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
import {
  Device,
  Link,
  UISettings,
  ConfiguredDevice,
  DeviceGroup,
} from "../../lib/types";
import { LAYER_CONFIG, DeviceType } from "../../lib/hardware/catalog";
import { BundledEdge } from "./BundledEdge";
import { bundleLinks } from "../../lib/utils/bundleLinks";
import GroupNode, { GroupNodeData } from "./GroupNode";
import { computeGroupBox } from "../../lib/utils/groupLayout";
import {
  getChildGroups,
  getGroupDepth,
  findVisibleAncestor,
} from "../../lib/utils/groupHelpers";

const nodeTypes = { device: DeviceNode, group: GroupNode };
const edgeTypes = { custom: CustomEdge, bundled: BundledEdge };

type Props = {
  devices: Device[];
  links: Link[];
  setDevices: (d: Device[]) => void;
  setLinks: (l: Link[]) => void;
  defaultLinkSku: string;
  onExport?: () => void;
  onNodeClick?: (deviceId: string) => void;
  ui: UISettings;
  onExpandBundle: (bundleId: string) => void;
  groups: DeviceGroup[];
  setGroups: (groups: DeviceGroup[]) => void;
  onToggleGroupCollapse: (id: string) => void;
  onRenameGroup: (id: string, label: string) => void;
  onRemoveGroup: (id: string) => void;
};

// ============================================================
// HELPERS
// ============================================================

function devicesToNodes(
  devices: ConfiguredDevice[],
  groups: DeviceGroup[]
): Node[] {
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const isHidden = (deviceGroupId: string | null | undefined): boolean => {
    if (!deviceGroupId) return false;
    let cur = groupById.get(deviceGroupId);
    while (cur) {
      if (cur.collapsed) return true;
      cur = cur.parentGroupId ? groupById.get(cur.parentGroupId) : undefined;
    }
    return false;
  };

  return devices
    .filter((d) => !isHidden(d.groupId))
    .map((d, i) => ({
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
      parentId: d.groupId ?? undefined,
      extent: d.groupId ? ("parent" as const) : undefined,
    }));
}

function groupsToNodes(
  groups: DeviceGroup[],
  devices: ConfiguredDevice[],
  handlers: {
    onToggleCollapse: (id: string) => void;
    onRename: (id: string, label: string) => void;
    onDelete: (id: string) => void;
  }
): Node[] {
  return groups.map((g) => {
    const childDevices = devices.filter((d) => d.groupId === g.id);
    const childSubgroups = getChildGroups(groups, g.id);
    const depth = getGroupDepth(groups, g.id) - 1;
    // ✨ Box only for expanded — collapsed groups don't need width/height
    const box = g.collapsed ? null : computeGroupBox(g.id, devices, groups);

    const data: GroupNodeData = {
      label: g.label,
      collapsed: g.collapsed,
      childDeviceCount: childDevices.length,
      childGroupCount: childSubgroups.length,
      depth,
      color: g.color,
      onToggleCollapse: handlers.onToggleCollapse,
      onRename: handlers.onRename,
      onDelete: handlers.onDelete,
    };

    return {
      id: g.id,
      type: "group",
      position: g.position,                        // ✅ ALWAYS g.position
      width: box?.width,
      height: box?.height,
      data,
      parentId: g.parentGroupId ?? undefined,
      extent: g.parentGroupId ? ("parent" as const) : undefined,
      zIndex: -1 - depth,
      deletable: false,
      selectable: true,
      draggable: true,                             // ✅ always draggable
    };
  });
}

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

function redirectLinksThroughGroups(
  links: Link[],
  devices: ConfiguredDevice[],
  groups: DeviceGroup[]
): Link[] {
  return links
    .map((l) => {
      const newFrom = findVisibleAncestor(l.from, devices, groups);
      const newTo = findVisibleAncestor(l.to, devices, groups);
      if (newFrom === l.from && newTo === l.to) return l;
      return { ...l, from: newFrom, to: newTo };
    })
    .filter((l) => l.from !== l.to);
}

function buildEdges(
  links: Link[],
  devices: ConfiguredDevice[],
  groups: DeviceGroup[],
  ui: UISettings | undefined,
  onExpandBundle: (bundleId: string) => void
): Edge[] {
  const safeUI: UISettings = ui ?? { bundleEdges: false, expandedBundles: [] };

  // ✨ Redirect FIRST, then operate on redirected list everywhere
  const redirectedLinks = redirectLinksThroughGroups(links, devices, groups);

  if (!safeUI.bundleEdges) return redirectedLinks.map(linkToEdge);

  const lateralLinks = redirectedLinks.filter((l) => l.isLateral);
  const hierarchicalLinks = redirectedLinks.filter((l) => !l.isLateral);

  const bundles = bundleLinks(hierarchicalLinks);
  const result: Edge[] = lateralLinks.map(linkToEdge);

  for (const b of bundles) {
    const isExpanded = safeUI.expandedBundles.includes(b.bundleId);

    if (b.count === 1 || isExpanded) {
      const members = hierarchicalLinks.filter((l) =>
        b.linkIds.includes(l.id)
      );
      result.push(...members.map(linkToEdge));
    } else {
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
  ui,
  onExpandBundle,
  groups,
  setGroups,
  onToggleGroupCollapse,
  onRenameGroup,
  onRemoveGroup,
}: Props) {
  const [nodes, setNodes] = useNodesState([
    ...groupsToNodes(groups, devices, {
      onToggleCollapse: onToggleGroupCollapse,
      onRename: onRenameGroup,
      onDelete: onRemoveGroup,
    }),
    ...devicesToNodes(devices, groups),
  ]);

  const [edges, setEdges] = useEdgesState(
    buildEdges(links, devices, groups, ui, onExpandBundle)
  );

  // Refs for latest values inside event handlers
  const devicesRef = useRef(devices);
  const linksRef = useRef(links);
  const groupsRef = useRef(groups);
  const uiRef = useRef(ui);
  const onExpandBundleRef = useRef(onExpandBundle);

  useEffect(() => { devicesRef.current = devices; }, [devices]);
  useEffect(() => { linksRef.current = links; }, [links]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { uiRef.current = ui; }, [ui]);
  useEffect(() => { onExpandBundleRef.current = onExpandBundle; }, [onExpandBundle]);

  const layerBands = useMemo(
    () =>
      Object.entries(LAYER_CONFIG).map(([type, cfg]) => ({
        type: type as DeviceType,
        ...cfg,
      })),
    []
  );

  // Sync refs for one-way prop→canvas
  const lastSyncedDeviceIdsRef = useRef<string>("");
  const lastSyncedGroupKeyRef = useRef<string>("");
  const lastSyncedLinkIdsRef = useRef<string>("");
  const lastSyncedUIRef = useRef<string>("");
  const lastSyncedCollapseKeyRef = useRef<string>("");

  // Re-sync NODES when devices or groups change
  useEffect(() => {
    const incomingDeviceIds = devices.map((d) => d.id).sort().join("|");
    const incomingGroupKey = groups
      .map(
        (g) =>
          `${g.id}:${g.label}:${g.collapsed}:${g.parentGroupId ?? ""}:${
            g.position.x
          },${g.position.y}`
      )
      .sort()
      .join("|");

    const devicesChanged = incomingDeviceIds !== lastSyncedDeviceIdsRef.current;
    const groupsChanged = incomingGroupKey !== lastSyncedGroupKeyRef.current;

    if (devicesChanged || groupsChanged) {
      lastSyncedDeviceIdsRef.current = incomingDeviceIds;
      lastSyncedGroupKeyRef.current = incomingGroupKey;
      setNodes([
        ...groupsToNodes(groups, devices, {
          onToggleCollapse: onToggleGroupCollapse,
          onRename: onRenameGroup,
          onDelete: onRemoveGroup,
        }),
        ...devicesToNodes(devices, groups),
      ]);
    }
  }, [
    devices,
    groups,
    onToggleGroupCollapse,
    onRenameGroup,
    onRemoveGroup,
    setNodes,
  ]);

  // Re-sync EDGES when links, devices, groups, or ui change
  useEffect(() => {
    const incomingLinkIds = links.map((l) => l.id).sort().join("|");
    const safeUI = ui ?? { bundleEdges: false, expandedBundles: [] };
    const incomingUIKey = `${safeUI.bundleEdges}|${[...safeUI.expandedBundles]
      .sort()
      .join(",")}`;
    const incomingCollapseKey = groups
      .map((g) => `${g.id}:${g.collapsed}`)
      .sort()
      .join("|");

    const linksChanged = incomingLinkIds !== lastSyncedLinkIdsRef.current;
    const uiChanged = incomingUIKey !== lastSyncedUIRef.current;
    const collapseChanged =
      incomingCollapseKey !== lastSyncedCollapseKeyRef.current;

    if (linksChanged || uiChanged || collapseChanged) {
      lastSyncedLinkIdsRef.current = incomingLinkIds;
      lastSyncedUIRef.current = incomingUIKey;
      lastSyncedCollapseKeyRef.current = incomingCollapseKey;
      setEdges(buildEdges(links, devices, groups, ui, onExpandBundle));
    }
  }, [links, devices, groups, ui, onExpandBundle, setEdges]);

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

      // Sync GROUP node positions back to project
      const groupNodesNow = next.filter((n) => n.type === "group");
      let groupsChanged = false;
      const updatedGroups = groupsRef.current.map((g) => {
        const node = groupNodesNow.find((n) => n.id === g.id);
        if (!node) return g;
        if (
          node.position.x !== g.position.x ||
          node.position.y !== g.position.y
        ) {
          groupsChanged = true;
          return { ...g, position: { x: node.position.x, y: node.position.y } };
        }
        return g;
      });
      if (groupsChanged) {
        setGroups(updatedGroups);
      }

      // Sync DEVICE nodes — MERGE, don't replace (preserves hidden devices)
      const deviceNodesNow = next.filter((n) => n.type === "device");
      const visibleNodeIds = new Set(deviceNodesNow.map((n) => n.id));

      const positionUpdates = new Map<string, { x: number; y: number }>();
      for (const n of deviceNodesNow) {
        positionUpdates.set(n.id, { x: n.position.x, y: n.position.y });
      }

      let devicesChanged = false;
      const updatedDevices: ConfiguredDevice[] = devicesRef.current.map((d) => {
        const newPos = positionUpdates.get(d.id);
        if (!newPos) return d; // hidden device — keep as-is

        if (
          !d.position ||
          d.position.x !== newPos.x ||
          d.position.y !== newPos.y
        ) {
          devicesChanged = true;
          return { ...d, position: newPos };
        }
        return d;
      });

      // Removal: detect by comparing previously-visible to currently-visible device sets
      let finalDevices = updatedDevices;
      if (hasRemoval) {
        const previouslyVisibleIds = new Set(
          nodes.filter((n) => n.type === "device").map((n) => n.id)
        );
        const removedIds = new Set<string>();
        for (const id of previouslyVisibleIds) {
          if (!visibleNodeIds.has(id)) removedIds.add(id);
        }
        if (removedIds.size > 0) {
          finalDevices = updatedDevices.filter((d) => !removedIds.has(d.id));
          devicesChanged = true;
        }
      }

      if (devicesChanged) {
        lastSyncedDeviceIdsRef.current = finalDevices
          .map((d) => d.id)
          .sort()
          .join("|");
        setDevices(finalDevices);

        if (hasRemoval) {
          const ids = new Set(finalDevices.map((d) => d.id));
          const filtered = linksRef.current.filter(
            (l) => ids.has(l.from) && ids.has(l.to)
          );
          if (filtered.length !== linksRef.current.length) {
            lastSyncedLinkIdsRef.current = filtered
              .map((l) => l.id)
              .sort()
              .join("|");
            setLinks(filtered);
            setEdges(
              buildEdges(
                filtered,
                devicesRef.current,
                groupsRef.current,
                uiRef.current,
                onExpandBundleRef.current
              )
            );
          }
        }
      }
    },
    [nodes, setNodes, setEdges, setDevices, setLinks, setGroups]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edges);
      const removalChanges = changes.filter((c) => c.type === "remove");

      if (removalChanges.length > 0) {
        const removedEdgeIds = new Set(removalChanges.map((c) => c.id));
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
        setEdges(
          buildEdges(
            newLinks,
            devicesRef.current,
            groupsRef.current,
            uiRef.current,
            onExpandBundleRef.current
          )
        );
      } else {
        setEdges(next);
      }
    },
    [edges, setEdges, setLinks]
  );

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
      setEdges(
        buildEdges(
          newLinks,
          devicesRef.current,
          groupsRef.current,
          uiRef.current,
          onExpandBundleRef.current
        )
      );
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
        onNodeClick={(_, node) => {
          if (node.type === "device") onNodeClick?.(node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        translateExtent={[
          [-10000, -10000],
          [10000, 10000],
        ]}
        nodeExtent={[
          [-10000, -10000],
          [10000, 10000],
        ]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "group") return "#a855f7";
            const type = (n.data as { type?: DeviceType })?.type;
            return type ? LAYER_CONFIG[type].color : "#94a3b8";
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>

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
          {ui?.bundleEdges && " • BUNDLED"}
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