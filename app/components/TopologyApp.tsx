"use client";

import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import Sidebar from "./SideBar";
import TopologyCanvas from "./TopologyCanvas";
import { Device, Link } from "../lib/types";
export default function TopologyApp() {
  const [devices, setDevices] = useLocalStorage<Device[]>("topology-devices", []);
  const [links, setLinks] = useLocalStorage<Link[]>("topology-links", []);
  const [defaultLinkSku, setDefaultLinkSku] = useLocalStorage<string>(
    "default-link-sku",
    "SFP-10G-SR"
  );

  const TOPOLOGY_SCHEMA_VERSION = 2;

  const handleSetDevices = useCallback((d: Device[]) => setDevices(d), [setDevices]);
  const handleSetLinks = useCallback((l: Link[]) => setLinks(l), [setLinks]);


  const exportTopology = useCallback(() => {
    if (devices.length === 0) {
      alert("Nothing to export — add some devices first.");
      return;
    }
    const data = {
      schemaVersion: TOPOLOGY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      devices,
      links,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [devices, links]);




  return (
     <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-slate-50">
          
          <aside className="lg:col-span-2 xl:col-span-2">
            <Sidebar
              devices={devices}
              links={links}
              setDevices={handleSetDevices}
              setLinks={handleSetLinks}
              defaultLinkSku={defaultLinkSku}
              setDefaultLinkSku={setDefaultLinkSku}
            />
          </aside>
    
          <section className="lg:col-span-10 xl:col-span-10 max-h-screen min-w-0">
            <TopologyCanvas
              devices={devices}
              links={links}
              setDevices={handleSetDevices}
              setLinks={handleSetLinks}
              defaultLinkSku={defaultLinkSku}
            />
          </section>
    
        </main>
  );
}