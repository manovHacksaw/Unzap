"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Play, Eye, FlaskConical, Bot, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";

const tabs = [
  { href: "/studio/playground",   icon: Play,          label: "Playground",   sub: "Live execution"  },
  { href: "/studio/guided",       icon: Zap,           label: "Guided Mode",  sub: "Learn by doing"  },
  { href: "/studio/visualizer",   icon: Eye,           label: "Visualizer",   sub: "Step breakdown"  },
  { href: "/studio/contract-lab", icon: FlaskConical,  label: "Contract Lab", sub: "Call any fn"     },
  { href: "/studio/ai",           icon: Bot,           label: "AI Chat",      sub: "Ask anything"    },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]"
      style={{ fontFamily: "var(--font-space-grotesk), 'Inter', sans-serif" }}
    >
      {/* ── LEFT SIDEBAR ── */}
      <aside className="flex flex-col w-56 flex-shrink-0 border-r border-neutral-900 bg-[#0a0a0a]">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-900">
          <Zap className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
          <span
            className="text-white font-bold text-sm uppercase"
            style={{ letterSpacing: "0.2em" }}
          >
            UNZAP
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {tabs.map(({ href, icon: Icon, label, sub }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group flex items-center gap-3 px-3 py-2.5 border transition-colors",
                  active
                    ? "border-neutral-700 bg-white/[0.03] text-white"
                    : "border-transparent text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.02]"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-amber-400" : "text-neutral-700 group-hover:text-neutral-500"
                  )}
                  strokeWidth={1.5}
                />
                <div className="min-w-0">
                  <div className={clsx(
                    "text-[11px] font-medium tracking-wider uppercase",
                    active ? "text-white" : ""
                  )}>
                    {label}
                  </div>
                  <div className="text-[10px] text-neutral-700 truncate font-mono">{sub}</div>
                </div>
                {active && <div className="ml-auto w-1 h-1 bg-amber-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-neutral-900 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to home
          </Link>
          <div className="px-3">
            <div className="text-[10px] font-mono text-neutral-800 tracking-widest">
              [ V0.1 · SEPOLIA ]
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-auto bg-[#0a0a0a]">
        {children}
      </main>
    </div>
  );
}
