"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Logo from "../../images/Cisco_Logo_no_TM_Black-RGB.png"

type Props = {
  /** Optional: shown on the right (e.g., "12 devices · 8 links") */
  stats?: string;
  
};

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/canvas", label: "Topology Builder" },
  { href: "/hardwarelib", label: "Hardware Library" },
  { href: "/import", label: "SKU Importer" },
  { href: "/about", label: "About" },
];

export default function Navbar({ stats }: Props) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md ">
      <div className="max-w-480 mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* ============ LEFT: LOGO ============ */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
               <Image
            src={Logo}
            width={1440}
            height={1440}
            alt="Picture of the author"
          />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-slate-800 text-sm">KA-BOM</span>
              <span className="text-[10px] text-slate-500 -mt-0.5">
                Network Topology Builder
              </span>
            </div>
          </Link>

          {/* ============ CENTER: NAV LINKS ============ */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* ============ RIGHT: STATS + ACTIONS ============ */}
          <div className="flex items-center gap-3">
            

            {stats && (
              <span className="hidden lg:inline-block text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                {stats}
              </span>
            )}

            {/* GitHub / Docs link (optional) */}
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
