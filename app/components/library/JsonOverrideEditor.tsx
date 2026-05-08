"use client";
import { useState } from "react";
import {
  loadCatalogOverrides,
  saveOverrides,
  clearOverrides,
  CatalogOverride,
} from "../../lib/hardware";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PLACEHOLDER = `{
  "bundles": {
    "Catalyst 9500": {
      "C9500-48Y4C-A": {
        "bundle": {
          "autoIncluded": [
            { "pid": "C9K-PWR-650WAC-R", "qty": 1 }
          ],
          "powerCord": {
            "qty": 2,
            "byRegion": { "EU": "CAB-9K10A-EU" }
          },
          "smartnet": {
            "baseSkuByTier": { "SNT": "CON-SNT-C9504YA4" }
          },
          "license": {
            "tier": "Advantage",
            "entitlementPid": "C9500-DNA-48Y4C-A",
            "subscriptionByTerm": { "3": "C9500-DNA-A-3Y" }
          }
        }
      }
    }
  }
}`;

// ============================================================
// OUTER WRAPPER — controls mount/unmount via `open`
// ============================================================
export default function JsonOverrideEditor({ open, onClose }: Props) {
  if (!open) return null;
  return <EditorContent onClose={onClose} />;
}

// ============================================================
// INNER COMPONENT — initializes state lazily on mount
// ============================================================
function EditorContent({ onClose }: { onClose: () => void }) {
  // ✅ Lazy initializer — runs once when component mounts
  const [text, setText] = useState(() => {
    const current = loadCatalogOverrides();
    return Object.keys(current.bundles).length > 0
      ? JSON.stringify(current, null, 2)
      : PLACEHOLDER;
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    try {
      const parsed = JSON.parse(text) as CatalogOverride;
      if (!parsed.bundles || typeof parsed.bundles !== "object") {
        throw new Error("Missing or invalid `bundles` object");
      }
      saveOverrides(parsed);
      setSuccess("✓ Overrides saved. Reload the page to see changes.");
    } catch (err) {
      setError(
        `Could not parse JSON: ${err instanceof Error ? err.message : "error"}`
      );
    }
  };

  const handleClear = () => {
    if (!confirm("Remove all catalog overrides?")) return;
    clearOverrides();
    setText(PLACEHOLDER);
    setSuccess("✓ Overrides cleared. Reload to see baseline catalog.");
    setError(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-4 sm:inset-auto sm:top-10 sm:left-1/2 sm:-translate-x-1/2 sm:w-200 sm:max-w-[90vw] sm:max-h-[80vh] bg-white shadow-2xl z-50 rounded-xl flex flex-col border border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Catalog JSON Override Editor
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Patch catalog data via localStorage without code changes.
              Overrides merge into the base catalog.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold ml-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full font-mono text-xs border border-slate-200 rounded p-3 resize-none custom-scrollbar bg-slate-900 text-slate-200"
          />

          {error && (
            <div className="text-xs p-3 rounded bg-rose-50 border border-rose-200 text-rose-700">
              ✕ {error}
            </div>
          )}
          {success && (
            <div className="text-xs p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={handleClear}
              className="text-xs py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold transition-colors"
            >
              Clear All Overrides
            </button>
            <button
              onClick={onClose}
              className="text-xs py-2 px-4 bg-slate-200 hover:bg-slate-300 rounded font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors"
            >
              Save Overrides
            </button>
          </div>
        </div>
      </div>
    </>
  );
}