"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Project, ConfiguredDevice, Link, GlobalDefaults } from "../types";
import { storage } from "./index";

/**
 * Single React hook for the entire project.
 *
 * Components don't need to know about adapters or persistence —
 * just read and call the setters.
 */
export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storage.loadProject();
      if (cancelled) return;
      if (loaded) {
        setProject(loaded);
      } else {
        // Fresh project — persist a default empty one
        const fresh = await initializeFreshProject();
        setProject(fresh);
      }
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save on every change (debounced via ref to avoid double-writes)
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
                  d.id === id ? { ...d, ...patch } : d
                ),
              },
            }
          : p
      );
    },
    []
  );

  const setGlobalDefaults = useCallback(
    (patch: Partial<GlobalDefaults>) => {
      setProject((p) =>
        p ? { ...p, globalDefaults: { ...p.globalDefaults, ...patch } } : p
      );
    },
    []
  );

  const setMetadata = useCallback(
    (patch: Partial<Project["metadata"]>) => {
      setProject((p) =>
        p ? { ...p, metadata: { ...p.metadata, ...patch } } : p
      );
    },
    []
  );

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

    // Setters
    setDevices,
    setLinks,
    updateDevice,
    setGlobalDefaults,
    setMetadata,

    // Project actions
    resetProject,
    importProject,
    exportProject,
  };
}

async function initializeFreshProject(): Promise<Project> {
  // Forces a migration that returns a fresh empty project
  const fresh = (await import("./migrations")).migrateProject({});
  await storage.saveProject(fresh);
  return fresh;
}