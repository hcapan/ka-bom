import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Singleton adapter instance.
 *
 * To migrate to a backend later, change this ONE line:
 *   export const storage: StorageAdapter = new SupabaseAdapter(...);
 */
export const storage: StorageAdapter = new LocalStorageAdapter();

export { useProject } from "./useProject";
export type { StorageAdapter } from "./StorageAdapter";