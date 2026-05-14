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
  };
}

async function initializeFreshProject(): Promise<Project> {
  const fresh = (await import("./migrations")).migrateProject({});
  await storage.saveProject(fresh);
  return fresh;
}
