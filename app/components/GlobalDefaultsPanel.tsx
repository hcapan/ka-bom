"use client";
import {
  GlobalDefaults,
  Region,
  SmartnetTier,
  ContractTermYears,
} from "../lib/types";

type Props = {
  defaults: GlobalDefaults;
  onChange: (patch: Partial<GlobalDefaults>) => void;
};

const REGIONS: { value: Region; label: string }[] = [
  { value: "EU", label: "Europe (EU)" },
  { value: "US", label: "United States (US/NA)" },
  { value: "UK", label: "United Kingdom (UK)" },
  { value: "JP", label: "Japan (JP)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "IN", label: "India (IN)" },
  { value: "CN", label: "China (CN)" },
];

const SMARTNET_TIERS: {
  value: SmartnetTier;
  label: string;
  description: string;
}[] = [
  { value: "SNT",  label: "SNT — 8x5xNBD",            description: "Business-hours, next-business-day" },
  { value: "SNTP", label: "SNTP — 24x7x4",            description: "24/7, 4-hour replacement" },
  { value: "OS",   label: "OS — Solution 8x5xNBD",    description: "Multi-vendor solution support" },
  { value: "OSP",  label: "OSP — Solution Premium",   description: "24/7 solution support" },
  { value: "PSUP", label: "PSUP — Partner Support",   description: "Partner-delivered" },
  { value: "ECMU", label: "ECMU — Software Only",     description: "Software entitlement only" },
  { value: "NONE", label: "NONE — No Support",        description: "No service contract" },
];

const TERMS: ContractTermYears[] = [1, 3, 5, 7];

export default function GlobalDefaultsPanel({ defaults, onChange }: Props) {
  const tierInfo = SMARTNET_TIERS.find((t) => t.value === defaults.smartnetTier);

  return (
    <div className="space-y-4">
      <Field label="Region (Power Cord)" hint="Used when device has no override">
        <select
          value={defaults.region}
          onChange={(e) => onChange({ region: e.target.value as Region })}
          className="w-full border border-slate-200 p-2 rounded text-xs"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="License Term">
        <TermButtons
          value={defaults.licenseTermYears}
          onChange={(t) => onChange({ licenseTermYears: t })}
        />
      </Field>

      <Field label="SmartNet Tier" hint={tierInfo?.description}>
        <select
          value={defaults.smartnetTier}
          onChange={(e) =>
            onChange({ smartnetTier: e.target.value as SmartnetTier })
          }
          className="w-full border border-slate-200 p-2 rounded text-xs"
        >
          {SMARTNET_TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="SmartNet Term">
        <TermButtons
          value={defaults.smartnetTermYears}
          onChange={(t) => onChange({ smartnetTermYears: t })}
          disabled={defaults.smartnetTier === "NONE"}
        />
      </Field>

      <Field label="Default Link Optic" hint="Used when drag-connecting nodes">
        <select
          value={defaults.defaultOptic}
          onChange={(e) => onChange({ defaultOptic: e.target.value })}
          className="w-full border border-slate-200 p-2 rounded text-xs"
        >
          <optgroup label="100G">
            <option value="QSFP-100G-SR4">100G SR4 (Multi-mode)</option>
            <option value="QSFP-100G-LR4">100G LR4 (Single-mode)</option>
          </optgroup>
          <optgroup label="40G">
            <option value="QSFP-40G-SR4">40G SR4</option>
          </optgroup>
          <optgroup label="25G">
            <option value="SFP-25G-SR-S">25G SR</option>
          </optgroup>
          <optgroup label="10G">
            <option value="SFP-10G-SR">10G SR (Multi-mode)</option>
            <option value="SFP-10G-LR">10G LR (Single-mode)</option>
          </optgroup>
          <optgroup label="1G">
            <option value="GLC-SX-MMD">1G SX (Multi-mode)</option>
            <option value="GLC-LH-SMD">1G LH (Single-mode)</option>
          </optgroup>
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-slate-400 italic mt-1">{hint}</p>
      )}
    </div>
  );
}

function TermButtons({
  value,
  onChange,
  disabled = false,
}: {
  value: ContractTermYears;
  onChange: (t: ContractTermYears) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {TERMS.map((t) => {
        const isSelected = value === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            disabled={disabled}
            className={`text-xs py-1.5 rounded border font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t}Y
          </button>
        );
      })}
    </div>
  );
}