"use client";

import { useState } from "react";
import { PipelineState } from "../page";
import { ClassifiedAnchorGroup, ClassifiedLine } from "@/app/lib/import/types";

interface Step2ReviewProps {
  pipeline: PipelineState;
  onContinue: () => void;
  onBack: () => void;
}

export function Step2Review({ pipeline, onContinue, onBack }: Step2ReviewProps) {
  const { patch, classified, fileName } = pipeline;
  const reviewCount = patch.needsReview.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Detected from <span className="font-mono text-sm">{fileName}</span>
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-4 text-center">
          <Stat label="Chassis" value={patch.chassisBundles.length} />
          <Stat label="Modules" value={patch.modules.length} />
          <Stat label="Optics" value={patch.optics.length} />
          <Stat
            label="Need Review"
            value={reviewCount}
            warning={reviewCount > 0}
          />
        </div>
      </div>

      {/* Review-required warning */}
      {reviewCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <strong className="text-amber-900">
            ⚠ {reviewCount} item(s) could not be auto-classified
          </strong>
          <p className="mt-1 text-sm text-amber-800">
            These will be excluded from the catalog patch and listed as
            comments at the bottom of the output. Add classifier rules and
            re-import to capture them.
          </p>
        </div>
      )}

      {/* Anchor groups */}
      <div className="space-y-3">
        {classified.map((group, i) => (
          <AnchorGroupCard key={i} group={group} />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t border-slate-200 pt-4">
        <button
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Start over
        </button>
        <button
          onClick={onContinue}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Generate Catalog Patch →
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Stat({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-2xl font-semibold ${
          warning ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function AnchorGroupCard({ group }: { group: ClassifiedAnchorGroup }) {
  const [expanded, setExpanded] = useState(false);
  const reviewCount = group.children.filter(
    (c) => c.confidence === "review-required"
  ).length;

  const roleLabel: Record<string, string> = {
    "chassis-modular": "Modular chassis",
    "chassis-fixed": "Fixed-config switch",
    "optic-standalone": "Standalone optic",
    "unknown-anchor": "⚠ Unknown",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-400">{expanded ? "▼" : "▶"}</span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {group.anchor.raw.partNumber}
          </span>
          <span className="text-xs text-slate-500">
            {roleLabel[group.anchor.role] ?? group.anchor.role}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {group.vendorFamily}
          </span>
          {group.stackingProfile && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              stack: {group.stackingProfile.pattern}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {group.children.length} children
          </span>
          {reviewCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              ⚠ {reviewCount} review
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-200">
          <ChildrenTable lines={group.children} />
        </div>
      )}
    </div>
  );
}

function ChildrenTable({ lines }: { lines: ClassifiedLine[] }) {
  if (lines.length === 0) {
    return (
      <div className="px-5 py-4 text-sm text-slate-500">
        No children. (Standalone item.)
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-2 text-left">PID</th>
          <th className="px-4 py-2 text-right">Qty</th>
          <th className="px-4 py-2 text-left">Role</th>
          <th className="px-4 py-2 text-left">Slot kind</th>
          <th className="px-4 py-2 text-left">Confidence</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((c, i) => (
          <tr
            key={i}
            className={`border-t border-slate-100 ${
              c.confidence === "review-required" ? "bg-amber-50" : ""
            }`}
          >
            <td className="px-4 py-2 font-mono text-xs text-slate-900">
              {c.raw.partNumber}
            </td>
            <td className="px-4 py-2 text-right text-slate-600">
              {c.raw.quantity}
            </td>
            <td className="px-4 py-2 text-slate-700">{c.role}</td>
            <td className="px-4 py-2 text-slate-500">{c.slotKind ?? "—"}</td>
            <td className="px-4 py-2">
              {c.confidence === "high" ? (
                <span className="text-green-600">✓ high</span>
              ) : (
                <span className="text-amber-700">⚠ review</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}