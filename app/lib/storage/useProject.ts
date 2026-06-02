"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Project,
  ConfiguredDevice,
  Link,
  GlobalDefaults,
  NamingConfig,
  UISettings,
  DeviceGroup,
} from "../types";
import { storage } from "./index";
import {
  generateGroupId,
  isCircularReparent,
  getDescendantGroupIds,
} from "../utils/groupHelpers";
import { validateStackComposition } from "../utils/stackValidation";
import {
  getDefaultStackingCable,
  getDefaultStackPowerCable,
  getEffectiveCatalog,
} from "../hardware/catalog";
import { isModularChassis } from "../hardware/chassisHelpers";

// ============================================================
// Migration helper — backfill `kind` on legacy groups
// ============================================================
function migrateGroup(
  g: Partial<DeviceGroup> & { groupKind?: DeviceGroup["kind"] },
): DeviceGroup {
  // Handle both legacy `groupKind` (used in earlier converters) and missing `kind`
  const resolvedKind: DeviceGroup["kind"] =
    g.kind ??
    g.groupKind ??
    (g.stackingCablePid || (g.memberOrder && g.memberOrder.length > 0)
      ? "stack"
      : "logical");

  return {
    id: g.id ?? `group-${Date.now()}`,
    label: g.label ?? "Group",
    kind: resolvedKind,
    collapsed: g.collapsed ?? false,
    position: g.position ?? { x: 100, y: 100 },
    parentGroupId: g.parentGroupId,
    size: g.size,
    color: g.color,
    stackingCablePid: g.stackingCablePid,
    stackingCableQty: g.stackingCableQty,
    stackPowerCablePid: g.stackPowerCablePid,
    stackPowerCableQty: g.stackPowerCableQty,
    memberOrder: g.memberOrder,
    stackAdapterKitPid: g.stackAdapterKitPid,
    stackAdapterKitQty: g.stackAdapterKitQty,
  };
}

export function useProject() {
  const [project, setProjectRaw] = useState<Project | null>(null);

  const setProject: typeof setProjectRaw = useCallback((updaterOrValue) => {
  setProjectRaw((prev) => {
    const next =
      typeof updaterOrValue === "function"
        ? (updaterOrValue as (p: Project | null) => Project | null)(prev)
        : updaterOrValue;   

    return next;
  });
}, []);
  const projectRef = useRef<Project | null>(null);
  useEffect(() => {
    projectRef.current = project;
    console.log("[REF SYNC]", project?.topology.devices ?? 0);
  });
  const getCurrentDevices = useCallback(
    (): ConfiguredDevice[] => projectRef.current?.topology.devices ?? [],
    [],
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const setGroups = useCallback((groups: DeviceGroup[]) => {
    setProject((p) => (p ? { ...p, topology: { ...p.topology, groups } } : p));
  }, []);

  const addGroup = useCallback(
    (
      label: string,
      options?: {
        parentGroupId?: string;
        position?: { x: number; y: number };
        color?: string;
        kind?: DeviceGroup["kind"];
      },
    ): string => {
      let newId = "";
      setProject((p) => {
        if (!p) return p;
        newId = generateGroupId(p.topology.groups);
        const newGroup: DeviceGroup = {
          id: newId,
          label,
          kind: options?.kind ?? "logical", // ⭐ default to logical (was "stack")
          parentGroupId: options?.parentGroupId,
          collapsed: false,
          position: options?.position ?? { x: 100, y: 100 },
          color: options?.color,
        };
        return {
          ...p,
          topology: {
            ...p.topology,
            groups: [...p.topology.groups, newGroup],
          },
        };
      });
      return newId;
    },
    [],
  );

  const removeGroup = useCallback((id: string) => {
    setProject((p) => {
      if (!p) return p;
      const descendantIds = new Set(
        getDescendantGroupIds(p.topology.groups, id),
      );
      descendantIds.add(id); // ⭐ ensure the target group itself is removed too

      return {
        ...p,
        topology: {
          ...p.topology,
          groups: p.topology.groups.filter((g) => !descendantIds.has(g.id)),
          devices: p.topology.devices.map((d) =>
            d.groupId && descendantIds.has(d.groupId)
              ? { ...d, groupId: undefined }
              : d,
          ),
        },
      };
    });
  }, []);

  const renameGroup = useCallback((id: string, label: string) => {
    setProject((p) =>
      p
        ? {
            ...p,
            topology: {
              ...p.topology,
              groups: p.topology.groups.map((g) =>
                g.id === id ? { ...g, label } : g,
              ),
            },
          }
        : p,
    );
  }, []);

  const toggleGroupCollapse = useCallback((id: string) => {
    setProject((p) =>
      p
        ? {
            ...p,
            topology: {
              ...p.topology,
              groups: p.topology.groups.map((g) =>
                g.id === id ? { ...g, collapsed: !g.collapsed } : g,
              ),
            },
          }
        : p,
    );
  }, []);

  const moveDeviceToGroup = useCallback(
    (deviceId: string, groupId: string | null) => {
      setProject((p) =>
        p
          ? {
              ...p,
              topology: {
                ...p.topology,
                devices: p.topology.devices.map((d) =>
                  d.id === deviceId
                    ? { ...d, groupId: groupId ?? undefined }
                    : d,
                ),
              },
            }
          : p,
      );
    },
    [],
  );

  const moveGroupToParent = useCallback(
    (groupId: string, newParentId: string | null): boolean => {
      let success = false;
      setProject((p) => {
        if (!p) return p;
        if (isCircularReparent(p.topology.groups, groupId, newParentId)) {
          console.warn(
            `[useProject] Circular reparent blocked: ${groupId} → ${newParentId}`,
          );
          return p;
        }
        success = true;
        return {
          ...p,
          topology: {
            ...p.topology,
            groups: p.topology.groups.map((g) =>
              g.id === groupId
                ? { ...g, parentGroupId: newParentId ?? undefined }
                : g,
            ),
          },
        };
      });
      return success;
    },
    [],
  );

  /**
   * Atomically add devices, optionally creating a new group at the same time.
   * Used by bulk-add features to ensure group and devices arrive in state together,
   * so the canvas never sees children referencing a parent that doesn't exist yet.
   */
  const addDevicesWithOptionalGroup = useCallback(
    (params: {
      devices: ConfiguredDevice[];
      newGroup?: DeviceGroup;
      newLinks?: Link[];
    }) => {
      setProject((p) => {
        if (!p) return p;

        const updatedGroups = params.newGroup
          ? [...p.topology.groups, params.newGroup]
          : p.topology.groups;

        const updatedDevices = [...p.topology.devices, ...params.devices];

        const updatedLinks = params.newLinks
          ? [...p.topology.links, ...params.newLinks]
          : p.topology.links;

        return {
          ...p,
          topology: {
            ...p.topology,
            groups: updatedGroups,
            devices: updatedDevices,
            links: updatedLinks,
          },
        };
      });
    },
    [],
  );

  // ============================================================
  // ⭐ COMPOSITE STACK ARCHITECTURE
  // Stacks are now rendered as a SINGLE composite node by the canvas.
  // We no longer mutate member device positions — the PhysicalStackNode
  // renders members directly via group.memberOrder.
  // ============================================================

  const convertGroupToStack = useCallback((groupId: string) => {
    setProject((prev) => {
      if (!prev) return prev;

      const group = prev.topology.groups.find((g) => g.id === groupId);
      if (!group) return prev;

      // Members are devices either tagged with this groupId OR parentGroupId
      const members = prev.topology.devices.filter(
        (d) => d.parentGroupId === groupId || d.groupId === groupId,
      );

      if (members.length < 2) {
        alert(`Stack requires at least 2 devices (found ${members.length})`);
        return prev;
      }

      const validation = validateStackComposition(members);
      if (!validation.canStack) {
        const messages = validation.issues
          .filter((i) => i.severity === "block")
          .map((i) => `• ${i.message}`)
          .join("\n");
        alert(`Cannot convert to stack:\n\n${messages}`);
        return prev;
      }

      const warnings = validation.issues.filter((i) => i.severity === "warn");
      if (warnings.length > 0) {
        const ok = confirm(
          `The stack will be created with these warnings:\n\n${warnings
            .map((w) => `⚠ ${w.message}`)
            .join("\n")}\n\nContinue?`,
        );
        if (!ok) return prev;
      }

      const seriesName = members[0].hardware.series;
      const defaultCable = getDefaultStackingCable(seriesName);
      const defaultPowerCable = getDefaultStackPowerCable(seriesName);
      const effectiveCatalog = getEffectiveCatalog();
      const series = effectiveCatalog[seriesName];

      // Compute member order top-to-bottom from current y-positions
      const orderedMembers = [...members].sort((a, b) => {
        const ay = a.position?.y ?? 0;
        const by = b.position?.y ?? 0;
        return ay - by;
      });
      const memberOrder = orderedMembers.map((d) => d.id);

      return {
        ...prev,
        topology: {
          ...prev.topology,
          // ⭐ NO position mutation on devices — composite node handles layout
          groups: prev.topology.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  kind: "stack" as const, // ⭐ correct field name
                  memberOrder,
                  // size handled by PhysicalStackNode (intrinsic)
                  stackingCablePid: defaultCable ?? undefined,
                  stackingCableQty: members.length,
                  ...(series?.supportsStackPower && defaultPowerCable
                    ? {
                        stackPowerCablePid: defaultPowerCable,
                        stackPowerCableQty: members.length,
                      }
                    : {}),
                }
              : g,
          ),
        },
      };
    });
  }, []);

  const unstackGroup = useCallback((stackGroupId: string) => {
    setProject((prev): Project | null => {
      if (!prev) return null;

      const group = prev.topology.groups.find((g) => g.id === stackGroupId);
      if (!group || group.kind !== "stack") return prev;

      // Find member devices in their stored order
      const memberOrder = group.memberOrder ?? [];

      // Spread freed devices horizontally starting at the stack's position
      const SPACING_X = 250;
      const startX = group.position.x;
      const startY = group.position.y;

      const updatedDevices = prev.topology.devices.map((d) => {
        if (d.groupId !== stackGroupId) return d;

        const idx = memberOrder.indexOf(d.id);
        const safeIdx = idx >= 0 ? idx : 0;

        return {
          ...d,
          groupId: null,
          position: {
            x: startX + safeIdx * SPACING_X,
            y: startY,
          },
        };
      });

      return {
        ...prev,
        topology: {
          ...prev.topology,
          groups: prev.topology.groups.filter((g) => g.id !== stackGroupId),
          devices: updatedDevices,
        },
      };
    });
  }, []);

  const convertStackToLogical = useCallback((groupId: string) => {
    setProject((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        topology: {
          ...prev.topology,
          groups: prev.topology.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  kind: "logical" as const, // ⭐ correct field name
                  //  stackingCablePid: undefined,
                  // stackingCableQty: undefined,
                  // stackPowerCablePid: undefined,
                  //  stackPowerCableQty: undefined,
                  memberOrder: undefined, // ⭐ logical groups don't need order
                }
              : g,
          ),
        },
      };
    });
  }, []);

  const updateStackSettings = useCallback(
    (
      groupId: string,
      patch: {
        stackingCablePid?: string;
        stackingCableQty?: number;
        stackPowerCablePid?: string | null;
        stackPowerCableQty?: number;
      },
    ) => {
      setProject((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          topology: {
            ...prev.topology,
            groups: prev.topology.groups.map((g) => {
              if (g.id !== groupId) return g;
              return {
                ...g,
                ...(patch.stackingCablePid !== undefined && {
                  stackingCablePid: patch.stackingCablePid,
                }),
                ...(patch.stackingCableQty !== undefined && {
                  stackingCableQty: patch.stackingCableQty,
                }),
                ...(patch.stackPowerCablePid !== undefined && {
                  stackPowerCablePid: patch.stackPowerCablePid ?? undefined,
                  ...(patch.stackPowerCablePid === null && {
                    stackPowerCableQty: undefined,
                  }),
                }),
                ...(patch.stackPowerCableQty !== undefined && {
                  stackPowerCableQty: patch.stackPowerCableQty,
                }),
              };
            }),
          },
        };
      });
    },
    [],
  );

  /**
   * Create a new stack group from a list of device IDs.
   * Composite-node version: members keep their original positions in state,
   * but the canvas renders them as a single stacked unit via PhysicalStackNode.
   */
  const createStackFromDevices = useCallback(
    (deviceIds: string[], label: string = "Stack") => {
      // ⭐ Read current devices from ref — never stale across renders
      const currentDevices = getCurrentDevices();

      const earlyMembers = currentDevices.filter((d) =>
        deviceIds.includes(d.id),
      );

      console.log("[STACK ENTRY]", {
        deviceIds,
        refLen: currentDevices.length,
        matched: earlyMembers.map((d) => d.id),
      });

      if (earlyMembers.length < 2) {
        alert(
          `Stack requires at least 2 devices.\n\n` +
            `Selected: ${deviceIds.length}\n` +
            `Found in project: ${earlyMembers.length}`,
        );
        return;
      }

      const validation = validateStackComposition(earlyMembers);
      if (!validation.canStack) {
        const messages = validation.issues
          .filter((i) => i.severity === "block")
          .map((i) => `• ${i.message}`)
          .join("\n");
        alert(`Cannot create stack:\n\n${messages}`);
        return;
      }

      const warnings = validation.issues.filter((i) => i.severity === "warn");
      if (warnings.length > 0) {
        const ok = confirm(
          `Stack will be created with these warnings:\n\n${warnings
            .map((w) => `⚠ ${w.message}`)
            .join("\n")}\n\nContinue?`,
        );
        if (!ok) return;
      }

      setProject((prev): Project | null => {
        if (!prev) return null;

        const members = prev.topology.devices.filter((d) =>
          deviceIds.includes(d.id),
        );
        if (members.length < 2) return prev;

        const seriesName = members[0].hardware.series;
        const chassisPid = members[0].hardware.chassisPid;
        const defaultCable = getDefaultStackingCable(seriesName);
        const defaultPowerCable = getDefaultStackPowerCable(seriesName);
        const effectiveCatalog = getEffectiveCatalog();
        const series = effectiveCatalog[seriesName];
        const pidObj = series?.pids?.find((p) => p.pid === chassisPid);
        const stackingSpec = pidObj?.bundle?.stacking;

        let stackAdapterKitPid: string | undefined;
        let stackAdapterKitQty: number | undefined;

        if (stackingSpec?.adapterRequired && stackingSpec.adapterKits?.length) {
          const defaultKit =
            stackingSpec.adapterKits.find((k) => k.default) ??
            stackingSpec.adapterKits[0];
          stackAdapterKitPid = defaultKit.pid;
          stackAdapterKitQty = members.length;
        }

        const positions = members
          .map((d) => d.position)
          .filter((p): p is { x: number; y: number } => !!p);
        const cx =
          positions.reduce((s, p) => s + p.x, 0) /
          Math.max(1, positions.length);
        const cy =
          positions.reduce((s, p) => s + p.y, 0) /
          Math.max(1, positions.length);

        const newGroupId = `stack-${Date.now()}`;
        const orderedMembers = [...members].sort((a, b) => {
          const ay = a.position?.y ?? 0;
          const by = b.position?.y ?? 0;
          return ay - by;
        });
        const memberOrder = orderedMembers.map((d) => d.id);

        const newGroup: DeviceGroup = {
          id: newGroupId,
          label,
          kind: "stack",
          collapsed: false,
          position: { x: cx, y: cy },
          memberOrder,
          stackingCablePid: defaultCable ?? undefined,
          stackingCableQty: members.length,
          ...(stackAdapterKitPid && stackAdapterKitQty
            ? { stackAdapterKitPid, stackAdapterKitQty }
            : {}),
          ...(series?.supportsStackPower && defaultPowerCable
            ? {
                stackPowerCablePid: defaultPowerCable,
                stackPowerCableQty: members.length,
              }
            : {}),
        };

        const memberIdSet = new Set(deviceIds);
        const updatedDevices = prev.topology.devices.map((d) =>
          memberIdSet.has(d.id) ? { ...d, groupId: newGroupId } : d,
        );

        return {
          ...prev,
          topology: {
            ...prev.topology,
            groups: [...(prev.topology.groups ?? []), newGroup],
            devices: updatedDevices,
          },
        };
      });
    },
    [getCurrentDevices],
  );
  // ============================================================
  // Lifecycle: Load on mount (with group migration)
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storage.loadProject();
      if (cancelled) return;
      if (loaded) {
        // ⭐ Migrate any legacy groups missing `kind`
        const migrated: Project = {
          ...loaded,
          topology: {
            ...loaded.topology,
            groups: (loaded.topology.groups ?? []).map(migrateGroup),
          },
        };
        setProject(migrated);
      } else {
        const fresh = await initializeFreshProject();
        setProject(fresh);
      }
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!project || !isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      storage.saveProject(project);
    }, 200);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [project, isLoaded]);

  // ----- Setters -----
  const setDevices = useCallback((devices: ConfiguredDevice[]) => {
     console.log("[setDevices] called with", devices.length, "devices",
    devices.map(d => d.id)); 
    setProject((p) => {
      if (!p) return p;
      // 🔍 DIAGNOSTIC
      const modular = devices.find((d) =>
        isModularChassis(d.hardware.chassisPid),
      );
      if (modular) {
        console.log("[setDevices] modular position:", {
          id: modular.id,
          position: modular.position,
        });
      }

      // ⭐ Defensive cleanup: when devices are removed, prune them from group memberOrder
      // and drop empty stacks. This kills phantom devices like ACC-05.
      const newDeviceIds = new Set(devices.map((d) => d.id));
      const cleanedGroups = p.topology.groups
        .map((g) => ({
          ...g,
          memberOrder: (g.memberOrder ?? []).filter((id) =>
            newDeviceIds.has(id),
          ),
        }))
        // Drop empty stacks (logical groups can stay empty)
        .filter((g) => g.kind !== "stack" || (g.memberOrder?.length ?? 0) > 0);

      // Also strip orphan groupId references on remaining devices
      const validGroupIds = new Set(cleanedGroups.map((g) => g.id));
      const cleanedDevices = devices.map((d) =>
        d.groupId && !validGroupIds.has(d.groupId)
          ? { ...d, groupId: undefined }
          : d,
      );

      return {
        ...p,
        topology: {
          ...p.topology,
          devices: cleanedDevices,
          groups: cleanedGroups,
        },
      };
    });
  }, []);

  const setLinks = useCallback((links: Link[]) => {
    setProject((p) => (p ? { ...p, topology: { ...p.topology, links } } : p));
  }, []);

  const updateDevice = useCallback(
    (id: string, patch: Partial<ConfiguredDevice>) => {
      setProject((p) =>
        p
          ? {
              ...p,
              topology: {
                ...p.topology,
                devices: p.topology.devices.map((d) =>
                  d.id === id ? { ...d, ...patch } : d,
                ),
              },
            }
          : p,
      );
    },
    [],
  );

  const setGlobalDefaults = useCallback((patch: Partial<GlobalDefaults>) => {
    setProject((p) =>
      p ? { ...p, globalDefaults: { ...p.globalDefaults, ...patch } } : p,
    );
  }, []);

  const setMetadata = useCallback((patch: Partial<Project["metadata"]>) => {
    setProject((p) =>
      p ? { ...p, metadata: { ...p.metadata, ...patch } } : p,
    );
  }, []);

  const setNaming = useCallback((naming: NamingConfig) => {
    setProject((p) => (p ? { ...p, metadata: { ...p.metadata, naming } } : p));
  }, []);

  // ✨ UI setters
  const setUI = useCallback((patch: Partial<UISettings>) => {
    setProject((p) => (p ? { ...p, ui: { ...p.ui, ...patch } } : p));
  }, []);

  const toggleBundleEdges = useCallback(() => {
    setProject((p) =>
      p ? { ...p, ui: { ...p.ui, bundleEdges: !p.ui.bundleEdges } } : p,
    );
  }, []);

  const expandBundle = useCallback((bundleId: string) => {
    setProject((p) => {
      if (!p) return p;
      if (p.ui.expandedBundles.includes(bundleId)) return p;
      return {
        ...p,
        ui: { ...p.ui, expandedBundles: [...p.ui.expandedBundles, bundleId] },
      };
    });
  }, []);

  const collapseBundle = useCallback((bundleId: string) => {
    setProject((p) =>
      p
        ? {
            ...p,
            ui: {
              ...p.ui,
              expandedBundles: p.ui.expandedBundles.filter(
                (id) => id !== bundleId,
              ),
            },
          }
        : p,
    );
  }, []);

  const collapseAllBundles = useCallback(() => {
    setProject((p) => (p ? { ...p, ui: { ...p.ui, expandedBundles: [] } } : p));
  }, []);

  // ----- Project actions -----
  const resetProject = useCallback(async () => {
    await storage.resetProject();
    const fresh = await initializeFreshProject();
    setProject(fresh);
  }, []);

  const importProject = useCallback(async (json: string) => {
    await storage.importRaw(json);
    const reloaded = await storage.loadProject();
    if (reloaded) {
      // ⭐ Run migration on imported projects too
      const migrated: Project = {
        ...reloaded,
        topology: {
          ...reloaded.topology,
          groups: (reloaded.topology.groups ?? []).map(migrateGroup),
        },
      };
      setProject(migrated);
    }
  }, []);

  const exportProject = useCallback(async (): Promise<string> => {
    return storage.exportRaw();
  }, []);

  return {
    // State
    project,
    setProject,
    isLoaded,
    devices: project?.topology.devices ?? [],
    links: project?.topology.links ?? [],
    globalDefaults: project?.globalDefaults,
    metadata: project?.metadata,
    naming: project?.metadata.naming ?? {
      autoEnabled: false,
      pattern: "{LAYER}-{NN}",
    },
    ui: project?.ui ?? { bundleEdges: true, expandedBundles: [] },

    // Setters
    setDevices,
    setLinks,
    updateDevice,
    setGlobalDefaults,
    setMetadata,
    setNaming,
    setUI,
    toggleBundleEdges,
    expandBundle,
    collapseBundle,
    collapseAllBundles,

    // Project actions
    resetProject,
    importProject,
    exportProject,

    // Groups
    groups: project?.topology.groups ?? [],
    setGroups,
    addGroup,
    removeGroup,
    renameGroup,
    toggleGroupCollapse,
    moveDeviceToGroup,
    moveGroupToParent,
    addDevicesWithOptionalGroup,

    // Stacking
    convertGroupToStack,
    convertStackToLogical,
    updateStackSettings,
    createStackFromDevices,
    unstackGroup,
  };
}

async function initializeFreshProject(): Promise<Project> {
  const fresh = (await import("./migrations")).migrateProject({});
  await storage.saveProject(fresh);
  return fresh;
}
