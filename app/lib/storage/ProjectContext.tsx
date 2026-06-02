"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useProject as useProjectInternal } from "./useProject";

type ProjectAPI = ReturnType<typeof useProjectInternal>;

const ProjectContext = createContext<ProjectAPI | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const api = useProjectInternal();
  return (
    <ProjectContext.Provider value={api}>{children}</ProjectContext.Provider>
  );
}

/**
 * Shared singleton — every consumer gets the same project state, refs,
 * autosave timer, and storage instance. Replaces direct useProject() calls.
 */
export function useProject(): ProjectAPI {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used inside <ProjectProvider>");
  }
  return ctx;
}