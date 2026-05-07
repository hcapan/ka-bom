import { Project } from "../types";

/**
 * Abstract storage interface.
 * Today: LocalStorageAdapter
 * Tomorrow: SupabaseAdapter, FirestoreAdapter, RestAPIAdapter, etc.
 */
export interface StorageAdapter {
  // Project lifecycle
  loadProject(): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  resetProject(): Promise<void>;

  // Future hooks
  exportRaw(): Promise<string>;
  importRaw(data: string): Promise<void>;

  // Subscribe to external changes (Phase 2: real-time collaboration)
  subscribe?(listener: (project: Project) => void): () => void;
}