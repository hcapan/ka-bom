"use client";
import { Device, Link } from "../lib/types";

type Props = { devices: Device[]; links: Link[] };

export default function InventoryPanel({ devices, links }: Props) {
  const chassisCounts = devices.reduce(
    (acc, d) => ({ ...acc, [d.hardware.chassisPid]: (acc[d.hardware.chassisPid] || 0) + 1 }),
    {} as Record<string, number>
  );
  const sfpCounts = links.reduce(
    (acc, l) => ({ ...acc, [l.optic.pid]: (acc[l.optic.pid] || 0) + 2 }),
    {} as Record<string, number>
  );

  return (
    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl space-y-4">
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">
          Chassis Inventory
        </p>
        {Object.keys(chassisCounts).length === 0 ? (
          <p className="text-xs text-slate-600 italic">None</p>
        ) : (
          Object.entries(chassisCounts).map(([m, c]) => (
            <div key={m} className="flex justify-between text-sm">
              <span className="text-slate-300">{m}</span>
              <span className="font-bold">{c}</span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slate-700 pt-4">
        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">
          Transceivers Required (2 per link)
        </p>
        {Object.keys(sfpCounts).length === 0 ? (
          <p className="text-xs text-slate-600 italic">None</p>
        ) : (
          Object.entries(sfpCounts).map(([s, c]) => (
            <div key={s} className="flex justify-between text-sm text-green-400">
              <span>{s}</span>
              <span className="font-bold">{c}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}