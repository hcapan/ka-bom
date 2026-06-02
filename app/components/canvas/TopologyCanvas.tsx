"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Panel,
  EdgeChange,
  applyNodeChanges,
  NodePositionChange,
  useReactFlow,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DeviceNode from "./DeviceNode";
import CustomEdge from "./Edges/CustomEdge";
import {
  Device,
  Link,
  UISettings,
  ConfiguredDevice,
  DeviceGroup,
} from "../../lib/types";
import {
  LAYER_CONFIG,
  DeviceType,
  getEffectiveCatalog,
} from "../../lib/hardware/catalog";
import { BundledEdge } from "./Edges/BundledEdge";
import { bundleLinks } from "../../lib/utils/bundleLinks";
import GroupNode, { GroupNodeData, StackPatch } from "./GroupNode";
import { computeCenteredGridPos } from "../../lib/utils/groupLayout";
import { calcGroupSize, pickColsFor } from "@/app/lib/utils/groupLayout";
import {
  getChildGroups,
  getGroupDepth,
  findVisibleAncestor,
} from "../../lib/utils/groupHelpers";
import { PhysicalStackNode } from "./PhysicalStackNode";
import { ModularChassisNode } from "./ModularChassisNode";
import { isModularChassis } from "@/app/lib/hardware/chassisHelpers";

const nodeTypes = {
  device: DeviceNode,
  group: GroupNode,
  stack: PhysicalStackNode,
  modular: ModularChassisNode,
};
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
  onConfigureSlot: (deviceId: string, slotId: string) => void;
  onUpdateStack?: (id: string, patch: Partial<StackPatch>) => void;
  onConvertStackToLogical?: (id: string) => void;
  onTidyGroup?: (id: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onUnstackGroup?: (id: string) => void;
};

// ============================================================
// HELPERS
// ============================================================

function devicesToNodes(
  devices: ConfiguredDevice[],
  groups: DeviceGroup[],
  handlers: {
    onConfigureSlot: (deviceId: string, slotId: string) => void;
    onConfigureDevice: (deviceId: string) => void;
  },
): Node[] {
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const siblingsByGroup = new Map<string, ConfiguredDevice[]>();
  devices.forEach((d) => {
    if (d.groupId && groupById.has(d.groupId)) {
      if (!siblingsByGroup.has(d.groupId)) siblingsByGroup.set(d.groupId, []);
      siblingsByGroup.get(d.groupId)!.push(d);
    }
  });

  // Group free devices by type to calculate horizontal offsets
  const freeDevicesByType = new Map<DeviceType, ConfiguredDevice[]>();
  devices.forEach((d) => {
    if (!d.groupId || !groupById.has(d.groupId)) {
      if (!freeDevicesByType.has(d.type)) freeDevicesByType.set(d.type, []);
      freeDevicesByType.get(d.type)!.push(d);
    }
  });

  const isHidden = (deviceGroupId: string | null | undefined): boolean => {
    if (!deviceGroupId) return false;
    let cur = groupById.get(deviceGroupId);
    if (!cur) return false;
    while (cur) {
      if (cur.collapsed) return true;
      cur = cur.parentGroupId ? groupById.get(cur.parentGroupId) : undefined;
    }
    return false;
  };

  return devices
    .filter((d) => !isHidden(d.groupId))
    .flatMap<Node>((d) => {
      // ⭐ Detect if device is a stack member
      const parentGroup = d.groupId ? groupById.get(d.groupId) : undefined;
      const isStackMember = parentGroup?.kind === "stack" && !!parentGroup;

      // Stack members are rendered by PhysicalStackNode — skip them here.
      if (isStackMember) {
        return [];
      }

      // ⭐ Detect modular chassis (C9404R / C9407R / C9410R, etc.)
      const isModular = isModularChassis(d.hardware.chassisPid);

      let basePosition: { x: number; y: number };
      if (d.groupId && parentGroup) {
        const siblings = siblingsByGroup.get(d.groupId) ?? [];
        const localIndex = siblings.findIndex((x) => x.id === d.id);
        const cols = pickColsFor(siblings.length);
        const { width: groupWidth } = calcGroupSize(siblings.length, cols);

        basePosition = computeCenteredGridPos(
          localIndex,
          siblings.length,
          groupWidth,
          cols,
        );
      } else {
        // Free device — use persisted or default
        const siblingsInLayer = freeDevicesByType.get(d.type) ?? [];
        const typeIndex = siblingsInLayer.findIndex((x) => x.id === d.id);

        // Spacing: 250px apart horizontally, starting at x:100
        basePosition = d.position ?? {
          x: 100 + typeIndex * 250,
          y: LAYER_CONFIG[d.type].y + 50,
        };
      }

      if (isModular) {
        return [
          {
            id: d.id,
            type: "modular",
            position: basePosition,
            data: { device: d, ...handlers },
            parentId: d.groupId ?? undefined,
            extent: d.groupId ? ("parent" as const) : undefined,
            draggable: !d.groupId,
          },
        ];
      }

      // ─── Fixed-switch (existing) branch ───────────────────────
      return [
        {
          id: d.id,
          type: "device",
          position: basePosition,
          data: {
            name: d.name,
            pid: d.hardware.chassisPid,
            model: d.hardware.series,
            type: d.type,
            networkModulePid: d.hardware.networkModulePid,
          },
          parentId: d.groupId ?? undefined,
          extent: d.groupId ? ("parent" as const) : undefined,
          draggable: !d.groupId,
        },
      ];
    });
}

function groupsToNodes(
  groups: DeviceGroup[],
  devices: ConfiguredDevice[],
  handlers: {
    onToggleCollapse: (id: string) => void;
    onRename: (id: string, label: string) => void;
    onDelete: (id: string) => void;
    // ⭐ STACK
    onUpdateStack?: GroupNodeData["onUpdateStack"];
    onConvertToLogical?: GroupNodeData["onConvertToLogical"];
    onTidy?: (id: string) => void;
  },
): Node[] {
  return groups.map((g) => {
    const childDevices = devices.filter((d) => d.groupId === g.id);
    const childSubgroups = getChildGroups(groups, g.id);
    const depth = getGroupDepth(groups, g.id) - 1;

    const count = childDevices.length;
    const cols = pickColsFor(count);
    const { width, height } = calcGroupSize(count, cols);

    // ⭐ STACK: derive series + maxStackSize from member devices
    let stackSeries: string | undefined;
    let stackMaxSize: number | undefined;
    if (g.kind === "stack" && childDevices.length > 0) {
      stackSeries = childDevices[0].hardware.series;
      // Look up maxStackSize from the catalog (uses override-aware lookup)
      const catalog = getEffectiveCatalog();
      const seriesData = catalog[stackSeries];
      stackMaxSize = seriesData?.maxStackSize ?? 8;
    }

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
      onTidy: handlers.onTidy,

      childDevicesSummary: childDevices.map((d) => ({
        model: d.hardware.chassisPid ?? d.hardware.series ?? "Unknown",
        series: d.hardware.series,
      })),

      // ⭐ STACK fields
      groupKind: g.kind,
      stackingCablePid: g.stackingCablePid,
      stackingCableQty: g.stackingCableQty,
      stackPowerCablePid: g.stackPowerCablePid,
      stackPowerCableQty: g.stackPowerCableQty,
      stackSeries,
      stackMaxSize,
      onUpdateStack: handlers.onUpdateStack,
      onConvertToLogical: handlers.onConvertToLogical,
    };

    return {
      id: g.id,
      type: "group",
      position: g.position,
      style: g.collapsed ? { width: 150, height: 100 } : { width, height },
      data,
      parentId: g.parentGroupId ?? undefined,
      extent: g.parentGroupId ? ("parent" as const) : undefined,

      zIndex: -1 - depth,
      deletable: false,
      selectable: true,
      draggable: true,
    };
  });
}

/**
 * Ensures parent nodes appear before child nodes in the array.
 * Strips parentId from nodes whose parent doesn't exist in the array.
 *
 * React Flow requires this ordering, otherwise it crashes on
 * `clampPositionToParent` / `updateNodeInternals` when a child
 * is processed before its parent has been measured.
 */
function orderNodesParentFirst(nodes: Node[]): Node[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const parents: Node[] = [];
  const children: Node[] = [];
  const orphansFixed: Node[] = [];

  for (const n of nodes) {
    if (!n.parentId) {
      parents.push(n);
    } else if (nodeIds.has(n.parentId)) {
      children.push(n);
    } else {
      // Parent doesn't exist — strip parentId, treat as standalone
      console.warn(
        `[CANVAS] Node ${n.id} has parentId="${n.parentId}" but parent not in nodes. Stripping.`,
      );
      orphansFixed.push({
        ...n,
        parentId: undefined,
        extent: undefined,
      });
    }
  }

  return [...parents, ...children, ...orphansFixed];
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

function ZoomBadge() {
  const { getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setZoom(getZoom()), 200);
    return () => clearInterval(id);
  }, [getZoom]);

  return (
    <div
      className="
        rounded-full border border-slate-200 bg-white/90
        px-2.5 py-1 text-[10px] font-semibold text-slate-600
        shadow-sm backdrop-blur-md
        tabular-nums
      "
      title="Current zoom"
    >
      {Math.round(zoom * 100)}%
    </div>
  );
}

function redirectLinksThroughGroups(
  links: Link[],
  devices: ConfiguredDevice[],
  groups: DeviceGroup[],
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
  onExpandBundle: (bundleId: string) => void,
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
      const members = hierarchicalLinks.filter((l) => b.linkIds.includes(l.id));
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
  onConfigureSlot,
  onRemoveGroup,
  onUpdateStack,
  onConvertStackToLogical,
  onTidyGroup,
  onSelectionChange,
  onUnstackGroup
}: Props) {
  const { getNodes } = useReactFlow();

  const deviceHandlers = useMemo(
    () => ({
      onConfigureSlot,
      onConfigureDevice: (deviceId: string) => onNodeClick?.(deviceId),
    }),
    [onConfigureSlot, onNodeClick],
  );

  // ⭐ Consolidate node generation logic.
  // Note: We use the currentDevices argument to avoid stale closures.
  const buildAllNodes = useCallback(
    (currentDevices: ConfiguredDevice[], currentGroups: DeviceGroup[]) => {
      const stackGroups = currentGroups.filter((g) => g.kind === "stack");
      const logicalGroups = currentGroups.filter((g) => g.kind === "logical");
      const stackMemberIds = new Set<string>(
        stackGroups.flatMap((g) => g.memberOrder ?? []),
      );

      const stackNodes: Node[] = stackGroups.map((stack) => {
        const foundMembers = (stack.memberOrder ?? [])
          .map((id) => currentDevices.find((d) => d.id === id))
          .filter((d): d is ConfiguredDevice => Boolean(d));


        return {
          id: stack.id,
          type: "stack",
          position: stack.position,
          data: {
            stackId: stack.id,
            label: stack.label,
            members: foundMembers,
            collapsed: stack.collapsed,
            onToggleCollapse: onToggleGroupCollapse,
            onConvertToLogical: onConvertStackToLogical,
            onUnstack:onUnstackGroup,
            onDelete: onRemoveGroup,
          },
        };
      });

      const logicalGroupNodes = groupsToNodes(logicalGroups, currentDevices, {
        onToggleCollapse: onToggleGroupCollapse,
        onRename: onRenameGroup,
        onDelete: onRemoveGroup,
        onUpdateStack,
        onConvertToLogical: onConvertStackToLogical,
        onTidy: onTidyGroup,
      });

      const standaloneDevices = currentDevices.filter(
        (d) => !stackMemberIds.has(d.id),
      );
      const deviceNodes = devicesToNodes(
        standaloneDevices,
        logicalGroups,
        deviceHandlers,
      );

      return orderNodesParentFirst([
        ...logicalGroupNodes,
        ...stackNodes,
        ...deviceNodes,
      ]);
    },
    [
      onToggleGroupCollapse,
      onConvertStackToLogical,
      onRemoveGroup,
      onUpdateStack,
      onUnstackGroup,
      onTidyGroup,
      onRenameGroup,
      deviceHandlers,
    ],
  );

  const initialNodes = useMemo(
    () => buildAllNodes(devices as ConfiguredDevice[], groups),
    [devices, groups, buildAllNodes],
  );

  const [nodes, setNodes] = useNodesState(initialNodes);

  const [edges, setEdges] = useEdgesState(
    buildEdges(links, devices, groups, ui, onExpandBundle),
  );

  // Refs for latest values inside event handlers
  const devicesRef = useRef(devices);
  const linksRef = useRef(links);
  const groupsRef = useRef(groups);
  const uiRef = useRef(ui);
  const onExpandBundleRef = useRef(onExpandBundle);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);
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
    [],
  );

  // Sync refs for one-way prop→canvas
  const lastSyncedDevicesKeyRef = useRef<string>("");
  const lastSyncedGroupKeyRef = useRef<string>("");
  const lastSyncedLinkIdsRef = useRef<string>("");
  const lastSyncedUIRef = useRef<string>("");
  const lastSyncedCollapseKeyRef = useRef<string>("");

  // Unified key generator to ensure useEffect and onNodesChange speak the same language
  const generateDevicesKey = useCallback(
    (devs: ConfiguredDevice[]) =>
      devs
        .map(
          (d) =>
            `${d.id}:${d.name}:${d.groupId ?? ""}:${JSON.stringify(d.hardware)}:${d.position?.x},${d.position?.y}`,
        )
        .sort()
        .join("|"),
    [],
  );

  const generateGroupsKey = useCallback(
    (grps: DeviceGroup[]) =>
      grps
        .map(
          (g) =>
            `${g.id}:${g.kind}:${g.label}:${g.collapsed}:${g.parentGroupId ?? ""}:${g.position.x},${g.position.y}:${(g.memberOrder ?? []).join(",")}`,
        )
        .sort()
        .join("|"),
    [],
  );

  // Re-sync NODES when devices or groups change
  useEffect(() => {
    const incomingDevicesKey = generateDevicesKey(devices);
    const incomingGroupKey = generateGroupsKey(groups);

    const devicesChanged =
      incomingDevicesKey !== lastSyncedDevicesKeyRef.current;
    const groupsChanged = incomingGroupKey !== lastSyncedGroupKeyRef.current;

    if (!devicesChanged && !groupsChanged) {
      return;
    }
    setNodes(buildAllNodes(devices, groups));
    lastSyncedDevicesKeyRef.current = incomingDevicesKey;
    lastSyncedGroupKeyRef.current = incomingGroupKey;

    
  }, [
    devices,
    groups,
    buildAllNodes,
    setNodes,
    generateDevicesKey,
    generateGroupsKey,
  ]);

  // Re-sync EDGES when links, devices, groups, or ui change
  useEffect(() => {
    const incomingLinkIds = links
      .map((l) => l.id)
      .sort()
      .join("|");
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
      setEdges(buildEdges(links, devices, groups, ui, onExpandBundle));
      lastSyncedLinkIdsRef.current = incomingLinkIds;
      lastSyncedUIRef.current = incomingUIKey;
      lastSyncedCollapseKeyRef.current = incomingCollapseKey;
      
    }
  }, [links, devices, groups, ui, onExpandBundle, setEdges]);

  // ---------- Imperative sync: CANVAS → PARENT ----------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const prevNodes = getNodes();
      const nextNodes = applyNodeChanges(changes, prevNodes);
      setNodes(nextNodes);

      // ⭐ Selection Sync: Notify parent/sidebar of current selection
      const selectionChanges = changes.filter((c) => c.type === "select");
      if (selectionChanges.length > 0 && onSelectionChange) {
        const selectedIds = nextNodes
          .filter((n) => n.selected)
          .map((n) => n.id);
        onSelectionChange(selectedIds);
      }

      const hasPositionChange = changes.some(
        (c) => c.type === "position" && c.dragging === false,
      );
      const hasRemoval = changes.some((c) => c.type === "remove");
      const hasAddition = changes.some((c) => c.type === "add");

      if (!hasPositionChange && !hasRemoval && !hasAddition) return;

      const groupNodesNow = nextNodes.filter(
        (n) => n.type === "group" || n.type === "stack",
      );
      let groupsChanged = false;

      const dragEndChanges = changes.filter(
        (c): c is NodePositionChange =>
          c.type === "position" && c.dragging === false,
      );
      const draggedIds = new Set(dragEndChanges.map((c) => c.id));

      const updatedGroups = groupsRef.current.map((g) => {
        if (!draggedIds.has(g.id)) return g;
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
        //lastSyncedGroupKeyRef.current = generateGroupsKey(updatedGroups);
        setGroups(updatedGroups);
      }

      // Sync DEVICE nodes — MERGE, don't replace (preserves hidden devices)
      const deviceNodesNow = nextNodes.filter(
        (n) => n.type === "device" || n.type === "modular",
      );
      const visibleNodeIds = new Set(deviceNodesNow.map((n) => n.id));

      const positionUpdates = new Map<string, { x: number; y: number }>();
      for (const n of deviceNodesNow) {
        positionUpdates.set(n.id, { x: n.position.x, y: n.position.y });
      }

      let devicesChanged = false;
      let finalDevices: ConfiguredDevice[] = devicesRef.current.map((d) => {
        if (d.groupId) return d;
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

      // ✨ Addition: Sync newly added nodes from Canvas -> Parent
      if (hasAddition) {
        const existingIds = new Set(devicesRef.current.map((d) => d.id));
        const newNodes = deviceNodesNow.filter((n) => !existingIds.has(n.id));

        if (newNodes.length > 0) {
          const newDevices: ConfiguredDevice[] = newNodes.map(
            (n) =>
              ({
                id: n.id,
                name: n.data.name as string,
                type: n.data.type as DeviceType,
                position: n.position,
                groupId: null,
                hardware: {
                  series: n.data.model as string,
                  chassisPid: n.data.pid as string,
                  networkModulePid: n.data.networkModulePid as string,
                },
              }) as ConfiguredDevice,
          );

          finalDevices = [...finalDevices, ...newDevices];
          devicesChanged = true;
        }
      }

      // Removal: detect by comparing previously-visible to currently-visible device sets
      if (hasRemoval) {
        const previouslyVisibleIds = new Set(
          prevNodes
            .filter((n) => n.type === "device" || n.type === "modular")
            .map((n) => n.id),
        );
        const removedIds = new Set<string>();
        for (const id of previouslyVisibleIds) {
          if (!visibleNodeIds.has(id)) removedIds.add(id);
        }
        if (removedIds.size > 0) {
          finalDevices = finalDevices.filter((d) => !removedIds.has(d.id));
          devicesChanged = true;
        }
      }

      if (devicesChanged) {
        // lastSyncedDevicesKeyRef.current = generateDevicesKey(finalDevices);
        setDevices(finalDevices);

        if (hasRemoval) {
          const ids = new Set(finalDevices.map((d) => d.id));
          const filtered = linksRef.current.filter(
            (l) => ids.has(l.from) && ids.has(l.to),
          );
          if (filtered.length !== linksRef.current.length) {
              /*lastSyncedLinkIdsRef.current = filtered
              .map((l) => l.id)
              .sort()
              .join("|"); */
            setLinks(filtered);
            setEdges(
              buildEdges(
                filtered,
                devicesRef.current,
                groupsRef.current,
                uiRef.current,
                onExpandBundleRef.current,
              ),
            );
          }
        }
      }
    },
    [
      getNodes,
      setNodes,
      setEdges,
      setDevices,
      setLinks,
      setGroups,
      onSelectionChange,
      // generateGroupsKey,
      generateDevicesKey,
    ],
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
          (l) => !removedLinkIds.has(l.id),
        );

        /*lastSyncedLinkIdsRef.current = newLinks
          .map((l) => l.id)
          .sort()
          .join("|");*/

        setLinks(newLinks);
        setEdges(
          buildEdges(
            newLinks,
            devicesRef.current,
            groupsRef.current,
            uiRef.current,
            onExpandBundleRef.current,
          ),
        );
      } else {
        setEdges(next);
      }
    },
    [edges, setEdges, setLinks],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      // Validation: Check if a link already exists between these specific handles
      const exists = linksRef.current.some(
        (l) =>
          l.from === params.source &&
          l.to === params.target &&
          l.sourceHandle === params.sourceHandle &&
          l.targetHandle === params.targetHandle,
      );

      if (exists) {
        console.warn("Link already exists between these ports.");
        return;
      }

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
      /*lastSyncedLinkIdsRef.current = newLinks
        .map((l) => l.id)
        .sort()
        .join("|");*/
      setLinks(newLinks);
      setEdges(
        buildEdges(
          newLinks,
          devicesRef.current,
          groupsRef.current,
          uiRef.current,
          onExpandBundleRef.current,
        ),
      );
    },
    [setEdges, setLinks, defaultLinkSku],
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
          console.log("[CANVAS CLICK]", {
            nodeId: node.id,
            nodeType: node.type,
            willOpenPanel: node.type === "device" || node.type === "modular",
          });
          if (node.type === "device" || node.type === "modular") {
            onNodeClick?.(node.id);
          }
        }}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#A3BBDB"
          className="opacity-40"
        />

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="
    rounded-xl! border! border-slate-200! bg-white/90!
    shadow-lg! backdrop-blur-md!
    [&>button]:border-slate-200!
    [&>button]:bg-transparent!
    [&>button:hover]:bg-sky-50!
    [&>button:hover]:text-sky-600!
    [&>button]:text-slate-600!
  "
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          nodeColor={(n) => {
            if (n.type === "group") return "#0ea5e9"; // sky (was violet)
            if (n.type === "stack") return "#0284c7"; // sky-600
            if (n.type === "modular") return "#0369a1"; // sky-700
            const type = (n.data as { type?: DeviceType })?.type;
            return type ? LAYER_CONFIG[type].color : "#94a3b8";
          }}
          nodeStrokeColor="#ffffff"
          maskColor="rgba(241, 245, 249, 0.6)"
          className="
            rounded-xl! border! border-slate-200! bg-white/80!
            shadow-lg! backdrop-blur-md! overflow-hidden
        "
          style={{ width: 180, height: 120 }}
        />

        <Panel position="bottom-center" className="m-2!">
          <ZoomBadge />
        </Panel>
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
