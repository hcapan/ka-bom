import { Project, SCHEMA_VERSION } from "../types";
import { StorageAdapter } from "./StorageAdapter";
import { migrateProject } from "./migrations";

const STORAGE_KEY = "ka-bom-project-v3";
const LEGACY_DEVICES_KEY = "topology-devices";
const LEGACY_LINKS_KEY = "topology-links";
const LEGACY_DEFAULT_OPTIC_KEY = "default-link-sku";

export class LocalStorageAdapter implements StorageAdapter {
  async loadProject(): Promise<Project | null> {
    if (typeof window === "undefined") return null;

    try {
      // Try new format first
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return migrateProject(parsed);
      }

      // Fall back to legacy format
      const legacyProject = this.loadLegacyData();
      if (legacyProject) {
        await this.saveProject(legacyProject); // persist in new format
        return legacyProject;
      }

      return null;
    } catch (err) {
      console.error("Failed to load project from localStorage:", err);
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    if (typeof window === "undefined") return;
    project.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  async resetProject(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_DEVICES_KEY);
    localStorage.removeItem(LEGACY_LINKS_KEY);
    localStorage.removeItem(LEGACY_DEFAULT_OPTIC_KEY);
  }

  async exportRaw(): Promise<string> {
    const project = await this.loadProject();
    return JSON.stringify(project, null, 2);
  }

  async importRaw(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    const project = migrateProject(parsed);
    await this.saveProject(project);
  }

  /**
   * Migrate from the OLD localStorage shape (devices/links as separate keys).
   */
  private loadLegacyData(): Project | null {
    try {
      const devicesRaw = localStorage.getItem(LEGACY_DEVICES_KEY);
      const linksRaw = localStorage.getItem(LEGACY_LINKS_KEY);
      const defaultOptic =
        localStorage.getItem(LEGACY_DEFAULT_OPTIC_KEY)?.replace(/"/g, "") ??
        "SFP-10G-SR-S";

      const devices = devicesRaw ? JSON.parse(devicesRaw) : [];
      const links = linksRaw ? JSON.parse(linksRaw) : [];

      if (devices.length === 0 && links.length === 0) return null;

      // Build a v3 project from legacy data
      return migrateProject({
        legacy: true,
        devices,
        links,
        defaultOptic,
      });
    } catch (err) {
      console.error("Legacy migration failed:", err);
      return null;
    }
  }
}