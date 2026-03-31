"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Play, Eye, FlaskConical, Bot, ArrowLeft, Code2, Settings, Help } from "lucide-react";
import { clsx } from "clsx";

const primaryTabs = [
  { href: "/studio/contract-lab", icon: FlaskConical, label: "Contract Lab", sub: "Cairo IDE"       },
  { href: "/studio/playground",   icon: Play,         label: "Playground",  sub: "Live execution"  },
];

const secondaryTabs = [
  { href: "/studio/guided",     icon: Zap,  label: "Guided Mode", sub: "Learn by doing"   },
  { href: "/studio/visualizer", icon: Eye,  label: "Visualizer",  sub: "Step breakdown"   },
  { href: "/studio/ai",         icon: Bot,  label: "AI Chat",     sub: "Ask anything"     },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]"
      style={{ fontFamily: "var(--font-space-grotesk), 'Inter', sans-serif" }}
    >
      {/* ── LEFT SIDEBAR (IDE-style) ── */}
      <aside className="flex flex-col w-56 flex-shrink-0 border-r border-neutral-900 bg-[#0a0a0a] overflow-hidden flex-col">

        {/* Brand + Status Bar */}
        <div className="flex flex-col px-4 py-4 border-b border-neutral-900 gap-3">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
            <span className="text-white font-bold text-xs uppercase tracking-widest">
              Unzap IDE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-600 pl-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Connected · Sepolia</span>
          </div>
        </div>

        {/* Primary Navigation (Contract Lab prioritized) */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 border-b border-neutral-900">
          <div className="text-[9px] font-mono text-neutral-700 tracking-widest px-2 mb-1">WORKSPACE</div>
          {primaryTabs.map(({ href, icon: Icon, label, sub }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group flex items-center gap-3 px-3 py-2.5 border rounded transition-all",
                  active
                    ? "border-amber-500/50 bg-amber-500/8 text-white shadow-sm shadow-amber-500/10"
                    : "border-transparent text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.03]"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-amber-400" : "text-neutral-700 group-hover:text-neutral-500"
                  )}
                  strokeWidth={1.5}
                />
                <div className="min-w-0 flex-1">
                  <div className={clsx(
                    "text-xs font-semibold tracking-wide",
                    active ? "text-white" : ""
                  )}>
                    {label}
                  </div>
                  <div className="text-[10px] text-neutral-700 truncate font-mono">{sub}</div>
                </div>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation (collapsed) */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 border-b border-neutral-900">
          <div className="text-[9px] font-mono text-neutral-700 tracking-widest px-2 mb-1">TOOLS</div>
          {secondaryTabs.map(({ href, icon: Icon, label, sub }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group flex items-center gap-3 px-3 py-2 border transition-colors",
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
                <div className="min-w-0 flex-1">
                  <div className={clsx(
                    "text-[10px] font-medium truncate",
                    active ? "text-white" : ""
                  )}>
                    {label}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="px-2 py-3 border-t border-neutral-900 space-y-1 text-[9px]">
          <div className="flex items-center gap-2 px-3 text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer">
            <Help className="w-3 h-3" />
            <span>Documentation</span>
          </div>
          <div className="flex items-center gap-2 px-3 text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer">
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back</span>
          </Link>
          <div className="px-3 pt-2 border-t border-neutral-900">
            <div className="font-mono text-neutral-800 tracking-widest">
              V0.1 IDE
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
