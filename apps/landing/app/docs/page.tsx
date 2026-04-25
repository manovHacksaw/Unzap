"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { DocumentationSection } from "../components/doc/DocumentationSection";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.unzap.xyz";

const resourceLinks = [
  { label: "Studio Hub",   href: `${APP}/studio`,              external: true },
  { label: "Contract Lab", href: `${APP}/studio/contract-lab`, external: true },
  { label: "GitHub",       href: "https://github.com/manovHacksaw/Unzap", external: true },
];

export default function DocsPage() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 200),
      setTimeout(() => setPhase(3), 300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden selection:bg-amber-500/30"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "var(--font-space-grotesk), 'Inter', sans-serif" }}
    >
      {/* Dynamic Background Gradient */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial={{ opacity: 0.5 }}
        animate={{
          opacity: phase >= 1 ? 1 : 0.6,
          background: "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(180,100,0,0.18) 0%, rgba(140,60,0,0.10) 40%, transparent 70%)"
        }}
        transition={{ duration: 2 }}
      />

      {/* Decorative Marks */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {[
          { top: "38%", left: "8%" },
          { top: "38%", right: "8%" },
          { top: "68%", left: "38%" },
          { top: "68%", right: "38%" },
        ].map((pos, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            className="absolute text-neutral-700 text-lg font-light"
            style={pos}
          >
            +
          </motion.div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <AnimatePresence>
        {phase >= 2 && <Navbar />}
      </AnimatePresence>

      <div className="pt-24 min-h-[calc(100vh-160px)]">
        {/* ── DOCUMENTATION SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 40 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <DocumentationSection />
        </motion.div>
      </div>

      {/* ── FOOTER TRUST BAR ── */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-5 px-5 pb-16 pt-10 sm:px-8 lg:px-10"
        id="resources"
      >
        <p className="text-neutral-500 text-[11px] tracking-widest uppercase" style={{ fontFamily: "monospace" }}>
          Mainnet ready • Cairo Contract Lab • Powered by Starkzap SDK
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
          >
            Back to Home
          </Link>
          {resourceLinks.map((resource) => (
            <div key={resource.label}>
              {resource.external ? (
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
                >
                  {resource.label}
                  <span className="text-[9px] leading-none">↗</span>
                </a>
              ) : (
                <Link
                  href={resource.href}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
                >
                  {resource.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </motion.footer>
    </div>
  );
}
