"use client";

import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import Sidebar from "./SideBar";
import TopologyCanvas from "./TopologyCanvas";
import InventoryPanel from "./InventoryPanel";
import { Device, Link } from "../lib/types";

export default function TopologyApp() {
  const [devices, setDevices] = useLocalStorage<Device[]>("topology-devices", []);
  const [links, setLinks] = useLocalStorage<Link[]>("topology-links", []);
  const [defaultLinkSku, setDefaultLinkSku] = useLocalStorage<string>(
    "default-link-sku",
    "SFP-10G-SR"
  );

  const handleSetDevices = useCallback((d: Device[]) => setDevices(d), [setDevices]);
  const handleSetLinks = useCallback((l: Link[]) => setLinks(l), [setLinks]);

  return (
     <main className="min-h-screen grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-slate-50">
          <aside className="lg:col-span-1">
            <Sidebar
              devices={devices}
              links={links}
              setDevices={handleSetDevices}
              setLinks={handleSetLinks}
              defaultLinkSku={defaultLinkSku}
              setDefaultLinkSku={setDefaultLinkSku}
            />
          </aside>
    
          <section className="lg:col-span-2">
            <TopologyCanvas
              devices={devices}
              links={links}
              setDevices={handleSetDevices}
              setLinks={handleSetLinks}
              defaultLinkSku={defaultLinkSku}
            />
          </section>
    
          <aside className="lg:col-span-1">
            <InventoryPanel devices={devices} links={links} />
          </aside>
        </main>
  );
}