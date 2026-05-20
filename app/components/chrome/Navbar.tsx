"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Network,
  HardDrive,
  Upload,
  Info,
  type LucideIcon,
} from "lucide-react";
import Logo from "../../images/Cisco_Logo_no_TM_Black-RGB.png";

type Props = {
  /** Optional: shown on the right (e.g., "12 devices · 8 links") */
  stats?: string;
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/canvas", label: "Topology Builder", icon: Network },
  { href: "/hardwarelib", label: "Hardware Library", icon: HardDrive },
  { href: "/import", label: "SKU Importer", icon: Upload },
  { href: "/about", label: "About", icon: Info },
];

export default function Navbar({ stats }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="
        sticky top-0 z-50
        border-b border-slate-200
        bg-white/85 backdrop-blur-md
        shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)]
      "
    >
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* ============ LEFT: LOGO ============ */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="CCW CANVAS"
          >
            <div
              className="
                flex h-8 w-8 items-center justify-center
                rounded-lg border border-slate-200 bg-white
                shadow-sm
                transition-shadow group-hover:shadow-md
              "
            >
              <Image
                src={Logo}
                width={32}
                height={32}
                alt="Cisco"
                className="h-5 w-auto"
                priority
              />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-bold tracking-tight text-cisco-indigo-500">
                CCW<span className="text-cisco-blue-500">·</span>CANVAS
              </span>
              <span className="-mt-0.5 text-[9px] uppercase tracking-[0.15em] text-slate-400">
                BOM AUTOMATION TOOL
              </span>
            </div>
          </Link>

          {/* ============ CENTER: NAV LINKS ============ */}
          <div className="hidden flex-1 justify-center md:flex">
            <div className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative flex items-center gap-1.5
                      rounded-md px-3 py-1.5
                      text-xs font-semibold transition-colors
                      ${
                        isActive
                          ? "text-cisco-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }
                    `}
                  >
                    <Icon size={14} strokeWidth={2} />
                    {item.label}
                    {isActive && (
                      <span
                        aria-hidden
                        className="
                          absolute inset-x-2 -bottom-[15px]
                          h-[2px] rounded-full bg-cisco-blue-500
                        "
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ============ RIGHT: STATS + GITHUB ============ */}
          <div className="flex shrink-0 items-center gap-3">
            {stats && (
              <span
                className="
                  hidden rounded-full border border-slate-200 bg-slate-50
                  px-2.5 py-0.5 font-mono text-[10px] text-slate-600
                  lg:inline-block
                "
              >
                {stats}
              </span>
            )}

            <a
              href="https://github.com/hcapan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
              title="View on GitHub"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
