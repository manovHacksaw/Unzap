"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroSphere from "./components/HeroSphere";
import HeroText from "./components/HeroText";
import Navbar from "./components/Navbar";
import CTASection from "./components/CTASection";
import { FeaturesSection } from "./components/FeaturesSection";

const partners = [
  {
    name: "Medium",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
      </svg>
    ),
  },
  {
    name: "Framer",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
];

export default function UnzapLanding() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500), // Phase 2: Headline
      setTimeout(() => setPhase(2), 3000), // Phase 3: Navbar
      setTimeout(() => setPhase(3), 4000), // Phase 4: CTA
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
        className="relative z-10 flex items-stretch min-h-[calc(100vh-180px)] px-10 pt-4"
      >
        {/* Left column - Headline */}
        <motion.div
          layout
          className="flex flex-col justify-between w-[38%] py-6 pr-4 will-change-transform"
        >
          <div className="invisible">
            <span className="text-neutral-400 text-[11px] tracking-widest" style={{ fontFamily: "monospace" }}>
              [ V01.3 N ]
            </span>
          </div>

          <AnimatePresence mode="wait">
            {phase >= 1 && <HeroText key="hero-text" />}
          </AnimatePresence>
        </motion.div>

        {/* Center column — 3D Sphere */}
        <motion.div
          layout
          className="flex-1 relative flex items-center justify-center"
        >
          <div className="absolute" style={{ inset: "-60px -40px", zIndex: 5 }}>
            <HeroSphere isReacting={phase >= 1} />
          </div>
        </motion.div>

        {/* Right column - CTA */}
        <motion.div
          layout
          className="flex flex-col justify-between w-[30%] py-6 pl-4 will-change-transform"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 3 ? 1 : 0 }}
            className="flex items-center justify-end"
          >
            <span className="text-neutral-400 text-[11px] tracking-widest" style={{ fontFamily: "monospace" }}>
              [ V0.1 ]&emsp;&emsp;[ STARKZAP POWERED ]&emsp;&emsp;[ 001 / 005 ]
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            {phase >= 3 && <CTASection key="cta-section" />}
          </AnimatePresence>
        </motion.div>
      </motion.main>

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
        className="relative z-10 flex flex-col items-center gap-5 pb-16 px-10 pt-20"
      >
        <p className="text-neutral-500 text-[11px] tracking-widest uppercase" style={{ fontFamily: "monospace" }}>
          Testnet ready • Powered by Starkzap SDK • Built for Starknet builders
        </p>
        <div className="flex items-center justify-center gap-10 flex-wrap">
          {partners.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-400 transition-colors"
              title={p.name}
            >
              {p.svg}
              <span className="text-xs tracking-widest text-neutral-600">{p.name}</span>
            </div>
          ))}
        </div>
      </motion.footer>
    </div>
  );
}
