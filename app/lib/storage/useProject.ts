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
  HARDWARE_LIBRARY,
} from "../hardware/catalog";

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
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
      },
    ): string => {
      let newId = "";
      setProject((p) => {
        if (!p) return p;
        newId = generateGroupId(p.topology.groups);
        const newGroup: DeviceGroup = {
          id: newId,
          label,
          parentGroupId: options?.parentGroupId,
          collapsed: false, // expanded by default per spec
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
      // Detach: orphan all descendant groups (re-parent to undefined)
      // and remove devices' groupId references
      const descendantIds = new Set(
        getDescendantGroupIds(p.topology.groups, id),
      );
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
        // Safety: prevent cycles
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

  const convertGroupToStack = useCallback(
    (groupId: string) => {
      setProject((prev) => {
        if (!prev) return prev; // ⭐ early return when no project loaded

        const group = prev.topology.groups.find((g) => g.id === groupId);
        if (!group) return prev;

        const members = prev.topology.devices.filter(
          (d) => d.parentGroupId === groupId,
        );

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
        const series = HARDWARE_LIBRARY[seriesName];

        return {
          ...prev,
          topology: {
            ...prev.topology,
            groups: prev.topology.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    groupKind: "stack" as const,
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
    },
    [setProject],
  );

  const convertStackToLogical = useCallback(
    (groupId: string) => {
      setProject((prev) => {
        if (!prev) return prev; // ⭐

        return {
          ...prev,
          topology: {
            ...prev.topology,
            groups: prev.topology.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    groupKind: "logical" as const,
                    stackingCablePid: undefined,
                    stackingCableQty: undefined,
                    stackPowerCablePid: undefined,
                    stackPowerCableQty: undefined,
                  }
                : g,
            ),
          },
        };
      });
    },
    [setProject],
  );

  /**
   * Update stacking-related fields on a stack group.
   * Pass `stackPowerCablePid: null` to disable StackPower.
   */
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
        if (!prev) return prev; // ⭐

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
    [setProject],
  );

  /**
   * Create a new stack group from a list of device IDs.
   * Used by the "Group as Stack" button.
   */
  const createStackFromDevices = useCallback(
    (deviceIds: string[], label: string = "Stack") => {
      setProject((prev): Project | null => {
        if (!prev) return null;

        const members = prev.topology.devices.filter((d) =>
          deviceIds.includes(d.id),
        );

        if (members.length < 2) {
          alert(`Stack requires at least 2 devices (found ${members.length})`);
          return prev; // ✅ return existing state
        }

        const validation = validateStackComposition(members);
        if (!validation.canStack) {
          const messages = validation.issues
            .filter((i) => i.severity === "block")
            .map((i) => `• ${i.message}`)
            .join("\n");
          alert(`Cannot create stack:\n\n${messages}`);
          return prev; // ✅ return existing state
        }

        const warnings = validation.issues.filter((i) => i.severity === "warn");
        if (warnings.length > 0) {
          const ok = confirm(
            `Stack will be created with these warnings:\n\n${warnings
              .map((w) => `⚠ ${w.message}`)
              .join("\n")}\n\nContinue?`,
          );
          if (!ok) return prev; // ✅ return existing state
        }

        const seriesName = members[0].hardware.series;
        const defaultCable = getDefaultStackingCable(seriesName);
        const defaultPowerCable = getDefaultStackPowerCable(seriesName);
        const effectiveCatalog = getEffectiveCatalog();
        const series = effectiveCatalog[seriesName];

        const positions = members
          .map((d) => d.position)
          .filter((p): p is { x: number; y: number } => !!p);
        const cx =
          positions.reduce((s, p) => s + p.x, 0) /
          Math.max(1, positions.length);
        const cy =
          positions.reduce((s, p) => s + p.y, 0) /
          Math.max(1, positions.length);

        const newGroupId = `group-${Date.now()}`;
        const newGroup: DeviceGroup = {
          id: newGroupId,
          label,
          collapsed: false,
          position: { x: cx - 100, y: cy - 100 },
          size: { width: 320, height: 240 },
          groupKind: "stack",
          stackingCablePid: defaultCable ?? undefined,
          stackingCableQty: members.length,
          ...(series?.supportsStackPower && defaultPowerCable
            ? {
                stackPowerCablePid: defaultPowerCable,
                stackPowerCableQty: members.length,
              }
            : {}),
        };

        // ⭐ THE CRITICAL RETURN — likely what was missing
        return {
          ...prev,
          topology: {
            ...prev.topology,
            groups: [...(prev.topology.groups ?? []), newGroup],
            devices: prev.topology.devices.map((d) =>
              deviceIds.includes(d.id) ? { ...d, groupId: newGroupId } : d,
            ),
          },
        };
      });
    },
    [setProject],
  );
  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storage.loadProject();
      if (cancelled) return;
      if (loaded) {
        setProject(loaded);
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
    setProject((p) => (p ? { ...p, topology: { ...p.topology, devices } } : p));
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

  // ✨ NEW: UI setters
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
    if (reloaded) setProject(reloaded);
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
    // ✨ UI state
    ui: project?.ui ?? { bundleEdges: true, expandedBundles: [] },

    // Setters
    setDevices,
    setLinks,
    updateDevice,
    setGlobalDefaults,
    setMetadata,
    setNaming,
    // ✨ UI setters
    setUI,
    toggleBundleEdges,
    expandBundle,
    collapseBundle,
    collapseAllBundles,

    // Project actions
    resetProject,
    importProject,
    exportProject,
    groups: project?.topology.groups ?? [],
    setGroups,
    addGroup,
    removeGroup,
    renameGroup,
    toggleGroupCollapse,
    moveDeviceToGroup,
    moveGroupToParent,

    convertGroupToStack,
    convertStackToLogical,
    updateStackSettings,
    createStackFromDevices,
  };
}

async function initializeFreshProject(): Promise<Project> {
  const fresh = (await import("./migrations")).migrateProject({});
  await storage.saveProject(fresh);
  return fresh;
}
