"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import HeroSphere from "./components/HeroSphere";
import HeroText from "./components/HeroText";
import Navbar from "./components/Navbar";
import CTASection from "./components/CTASection";
import { FeaturesSection } from "./components/FeaturesSection";

const developerHighlights = [
  {
    title: "Write & Compile",
    description: "Author Cairo in the browser editor. Compile via Docker backend and inspect Sierra artifacts instantly.",
  },
  {
    title: "Deploy & Interact",
    description: "Gasless deploy to Starknet Sepolia. Call any contract function directly from its ABI — no boilerplate.",
  },
  {
    title: "Generate Frontend",
    description: "Scaffold a typed Next.js starter pre-wired to your deployed contract in one click.",
  },
];

const workflowSteps = [
  { step: "01", label: "Write Contract" },
  { step: "02", label: "Compile" },
  { step: "03", label: "Deploy" },
  { step: "04", label: "Interact" },
  { step: "05", label: "Generate App" },
];

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.unzap.xyz";

const resourceLinks = [
  { label: "Studio Hub",   href: `${APP}/studio`,              external: true },
  { label: "Contract Lab", href: `${APP}/studio/contract-lab`, external: true },
  { label: "GitHub",       href: "https://github.com/manovHacksaw/Unzap", external: true },
];

export default function UnzapLanding() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 250),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 750),
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

      {/* ── HERO ── */}
      <motion.main
        layout
        transition={{
          layout: { type: "spring", stiffness: 200, damping: 25, mass: 1 }
        }}
        className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pb-8 pt-4 sm:px-8 xl:min-h-[calc(100vh-180px)] xl:flex-row xl:items-stretch xl:gap-6 xl:px-10"
        id="developers"
      >
        {/* Left column - Headline */}
        <motion.div
          layout
          className="order-1 flex min-w-0 flex-col justify-end py-2 xl:basis-[34%] xl:py-6 xl:pr-4 will-change-transform"
        >
          <AnimatePresence mode="wait">
            {phase >= 1 && <HeroText key="hero-text" />}
          </AnimatePresence>
        </motion.div>

        {/* Center column — 3D Sphere */}
        <motion.div
          layout
          className="order-3 relative flex min-h-[320px] items-center justify-center overflow-hidden sm:min-h-[360px] xl:order-2 xl:min-h-0 xl:flex-1"
        >
          <div
            className="relative z-10 aspect-square w-full max-w-[360px] sm:max-w-[440px] lg:max-w-[520px] xl:max-w-[600px]"
          >
            <HeroSphere isReacting={phase >= 1} />
          </div>
        </motion.div>

        {/* Right column - CTA */}
        <motion.div
          layout
          className="order-2 flex flex-col justify-end gap-6 py-2 xl:order-3 xl:basis-[24%] xl:items-end xl:py-6 xl:pl-4 will-change-transform"
        >
          <AnimatePresence mode="wait">
            {phase >= 3 && <CTASection key="cta-section" />}
          </AnimatePresence>
        </motion.div>
      </motion.main>

      {/* ── WORKFLOW STEPS ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 16 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-4 sm:px-8 lg:px-10"
      >
        <div className="flex items-center overflow-x-auto rounded-[20px] border border-neutral-800 bg-neutral-900/40 px-2 py-3 sm:px-4">
          {workflowSteps.map((item, index) => (
            <div key={item.step} className="flex shrink-0 items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
                <span
                  className="text-[10px] text-neutral-600"
                  style={{ fontFamily: "monospace" }}
                >
                  {item.step}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-300 whitespace-nowrap">
                  {item.label}
                </span>
              </div>
              {index < workflowSteps.length - 1 && (
                <span className="text-neutral-700 text-xs px-1">→</span>
              )}
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── DEVELOPER HIGHLIGHTS ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 24 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-6 sm:px-8 lg:px-10"
      >
        <div className="grid gap-px overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-800 md:grid-cols-3">
          {developerHighlights.map((item) => (
            <div key={item.title} className="bg-[#0a0a0a] px-5 py-6 sm:px-6">
              <div
                className="mb-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500"
                style={{ fontFamily: "monospace" }}
              >
                {item.title}
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-neutral-300">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── FEATURES SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 40 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <FeaturesSection />
      </motion.div>

      {/* ── FOOTER TRUST BAR ── */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-5 px-5 pb-16 pt-20 sm:px-8 lg:px-10"
        id="resources"
      >
        <p className="text-neutral-500 text-[11px] tracking-widest uppercase" style={{ fontFamily: "monospace" }}>
          Mainnet ready • Cairo Contract Lab • Powered by Starkzap SDK
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
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
