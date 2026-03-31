"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0f1c]/90 backdrop-blur-lg border-b border-[#22d3ee]/10"
          : "bg-transparent"
      }`}
    >
      {/* Logo */}
      <a href="#" className="flex items-center gap-2 group">
        <div className="relative w-8 h-8">
          {/* Zap / lightning icon */}
          <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
            <path
              d="M18 3L6 17h10l-2 12 14-16H18L20 3z"
              fill="url(#zapGrad)"
              className="drop-shadow-[0_0_6px_#22d3ee]"
            />
            <defs>
              <linearGradient id="zapGrad" x1="6" y1="3" x2="24" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" />
                <stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#22d3ee] transition-colors">
          Unzap
        </span>
      </a>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        {["Studio", "Guided Flows", "Playground", "Visualizer", "Contract Lab", "Docs"].map(
          (item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-slate-400 hover:text-[#22d3ee] transition-colors font-medium"
            >
              {item}
            </a>
          )
        )}
      </div>

      {/* Auth buttons */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
        >
          Log in
        </a>
        <a
          href="#"
          className="btn-primary text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
        >
          Launch Studio
        </a>
      </div>
    </motion.nav>
  );
}

/* ─── Guided Mode Panel (left) ───────────────────────────────── */
function GuidedPanel() {
  return (
    <div className="panel-glass rounded-2xl overflow-hidden w-[300px] glow-cyan">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#22d3ee]/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-slate-400 font-medium ml-2">Guided Mode</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Prompt input */}
        <div>
          <div className="text-[10px] text-[#22d3ee] font-semibold uppercase tracking-widest mb-2">
            Your Goal
          </div>
          <div className="bg-[#0a0f1c] border border-[#22d3ee]/20 rounded-lg p-3 text-xs text-slate-300 leading-relaxed font-mono">
            I want to build a voting app with
            <br />
            <span className="text-[#22d3ee]">gasless voting</span> on Starknet
          </div>
        </div>

        {/* Contract snippet */}
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">
            Generated Cairo Contract
          </div>
          <div className="bg-[#060b14] rounded-lg p-3 font-mono text-[10px] leading-relaxed border border-slate-800/50">
            <div className="text-slate-500"># Voting contract</div>
            <div>
              <span className="code-keyword">#[starknet::contract]</span>
            </div>
            <div>
              <span className="code-keyword">mod</span>{" "}
              <span className="code-fn">VotingApp</span> {"{"}
            </div>
            <div className="pl-3 text-slate-500">&nbsp;&nbsp;// Storage</div>
            <div className="pl-3">
              <span className="code-keyword">use</span>{" "}
              <span className="code-type">starknet</span>::*;
            </div>
            <div className="pl-3">
              <span className="code-keyword">fn</span>{" "}
              <span className="code-fn">vote</span>(
              <span className="code-type">proposal_id</span>: u256)
            </div>
            <div className="text-slate-600">{"}"}</div>
          </div>

          {/* Explanation badge */}
          <div className="mt-2 flex items-start gap-2 bg-[#22d3ee]/5 border border-[#22d3ee]/15 rounded-lg p-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] mt-1 shrink-0 step-dot" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Paymaster handles gas so voters pay nothing — built with Starkzap&apos;s gasless flow.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pt-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 ${
                s === 1
                  ? "bg-[#22d3ee]"
                  : s === 2
                  ? "bg-[#22d3ee]/40"
                  : "bg-slate-800"
              }`}
            />
          ))}
          <span className="text-[9px] text-slate-600 ml-1">Step 1/4</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Execution Visualizer Panel (center, hero) ──────────────── */
function VisualizerPanel() {
  const steps = [
    { label: "Wallet Connected", detail: "0x04a9…f3c2", done: true },
    { label: "Transaction Created", detail: "zap.pay({ amount: 1 })", done: true },
    { label: "Paymaster Applied", detail: "Gasless via AVNU", done: true, highlight: true },
    { label: "Signed", detail: "ArgentX • EIP-712", done: true },
    { label: "Sent to Starknet", detail: "tx: 0x1f2e…a9b1", done: false, active: true },
    { label: "Confirmed", detail: "Block #891,204", done: false },
  ];

  return (
    <div className="panel-glass rounded-2xl overflow-hidden w-[340px] glow-cyan-strong">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#22d3ee]/15">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22d3ee] step-dot" />
          <span className="text-xs font-semibold text-white tracking-wide">
            Execution Visualizer
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#22d3ee] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="p-5">
        {/* Function call badge */}
        <div className="bg-[#060b14] border border-[#22d3ee]/20 rounded-lg px-4 py-2.5 mb-5 font-mono text-xs">
          <span className="code-keyword">await</span>{" "}
          <span className="code-fn">zap</span>.
          <span className="code-fn">pay</span>({"{"}{" "}
          <span className="code-prop">amount</span>:{" "}
          <span className="code-number">1</span> {"}"})
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                    step.highlight
                      ? "border-[#22d3ee] bg-[#22d3ee] step-dot"
                      : step.done
                      ? "border-[#22d3ee] bg-[#22d3ee]/30"
                      : step.active
                      ? "border-[#22d3ee]/60 bg-[#22d3ee]/10 animate-pulse"
                      : "border-slate-700 bg-transparent"
                  }`}
                />
                {i < steps.length - 1 && (
                  <div
                    className={`w-px flex-1 mt-0.5 mb-0.5 min-h-[24px] ${
                      step.done
                        ? "bg-gradient-to-b from-[#22d3ee]/60 to-[#22d3ee]/20"
                        : "bg-slate-800"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-3">
                <div
                  className={`text-xs font-semibold ${
                    step.highlight
                      ? "text-[#22d3ee] text-glow-cyan"
                      : step.done
                      ? "text-slate-200"
                      : step.active
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  {step.label}
                  {step.highlight && (
                    <span className="ml-2 text-[9px] bg-[#22d3ee]/15 text-[#22d3ee] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      gasless
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Glow line decoration */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
      </div>
    </div>
  );
}

/* ─── Live Playground Panel (right) ─────────────────────────── */
function PlaygroundPanel() {
  const result = `{
  "tx_hash": "0x1f2e…a9b1",
  "status": "ACCEPTED",
  "gas_used": 0,
  "block": 891204
}`;

  return (
    <div className="panel-glass rounded-2xl overflow-hidden w-[280px] glow-cyan">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#22d3ee]/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-slate-400 font-medium ml-1">Playground</span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">TypeScript</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Code block */}
        <div className="bg-[#060b14] rounded-lg p-3 font-mono text-[10px] leading-relaxed border border-slate-800/50">
          <div className="text-slate-500">// Initialize SDK</div>
          <div>
            <span className="code-keyword">import</span>{" "}
            <span className="code-string">{"{ Zap }"}</span>{" "}
            <span className="code-keyword">from</span>{" "}
            <span className="code-string">&apos;starkzap&apos;</span>
          </div>
          <div className="mt-1">
            <span className="code-keyword">const</span>{" "}
            <span className="code-fn">zap</span> ={" "}
            <span className="code-keyword">new</span>{" "}
            <span className="code-fn">Zap</span>(config)
          </div>
          <div className="mt-2 text-slate-500">// Execute gasless payment</div>
          <div>
            <span className="code-keyword">await</span>{" "}
            <span className="code-fn">zap</span>.
            <span className="code-fn">pay</span>({"{"}
          </div>
          <div className="pl-3">
            <span className="code-prop">amount</span>:{" "}
            <span className="code-number">1</span>,
          </div>
          <div className="pl-3">
            <span className="code-prop">token</span>:{" "}
            <span className="code-string">&apos;USDC&apos;</span>,
          </div>
          <div className="pl-3">
            <span className="code-prop">gasless</span>:{" "}
            <span className="code-keyword">true</span>
          </div>
          <div>{"}"});</div>
        </div>

        {/* Run button */}
        <button className="btn-primary w-full py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M3 2l10 6-10 6V2z" />
          </svg>
          Run
        </button>

        {/* Result */}
        <div className="bg-[#060b14] rounded-lg p-3 border border-[#22d3ee]/15">
          <div className="text-[9px] text-[#22d3ee] font-semibold uppercase tracking-widest mb-1.5">
            Result
          </div>
          <pre className="text-[9px] text-slate-400 font-mono leading-relaxed whitespace-pre">
            {result}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ─── Floating Panels Composition ────────────────────────────── */
function FloatingPanels() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Subtle parallax on mouse move
  const rotXContainer = useTransform(mouseY, [-300, 300], [3, -3]);
  const rotYContainer = useTransform(mouseX, [-500, 500], [-2, 2]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => {
    animate(mouseX, 0, { duration: 0.8, ease: "easeOut" });
    animate(mouseY, 0, { duration: 0.8, ease: "easeOut" });
  };

  return (
    <motion.div
      className="relative w-full flex items-end justify-center"
      style={{ perspective: 1200, perspectiveOrigin: "50% 60%" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative flex items-end justify-center"
        style={{ rotateX: rotXContainer, rotateY: rotYContainer }}
      >
        {/* ── Left Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateY: -6 }}
          animate={{ opacity: 1, y: 0, rotateY: -6 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="float-left relative z-10"
          style={{
            transform: "translateX(-60px) translateY(30px) rotateY(-10deg) rotateZ(-3deg)",
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <GuidedPanel />
        </motion.div>

        {/* ── Center Panel (hero) ── */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="float-center relative z-20"
          style={{
            transform: "translateY(-10px) rotateZ(1deg)",
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <VisualizerPanel />
        </motion.div>

        {/* ── Right Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateY: 6 }}
          animate={{ opacity: 1, y: 0, rotateY: 6 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="float-right relative z-10"
          style={{
            transform: "translateX(60px) translateY(30px) rotateY(10deg) rotateZ(3deg)",
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <PlaygroundPanel />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Background beam / glow ─────────────────────────────────── */
function BackgroundGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Central vertical beam */}
      <div
        className="beam-pulse absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(34,211,238,0.18) 0%, rgba(59,130,246,0.08) 50%, transparent 80%)",
        }}
      />

      {/* Bottom glow pool */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(34,211,238,0.12) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Corner accent blobs */}
      <div
        className="absolute top-1/4 -left-32 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-32 w-48 h-48 rounded-full opacity-8"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
      />
    </div>
  );
}

/* ─── Philosophy / pipeline line ─────────────────────────────── */
function PhilosophyLine() {
  const steps = ["Explain", "Execute", "Visualize", "Copy", "Understand"];
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#22d3ee] text-glow-cyan">{s}</span>
          {i < steps.length - 1 && (
            <svg viewBox="0 0 16 8" className="w-5 h-3 text-[#22d3ee]/40" fill="none">
              <path d="M0 4h12M9 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Trust line ─────────────────────────────────────────────── */
function TrustLine() {
  const items = [
    "Testnet ready",
    "Powered by Starkzap SDK",
    "Built for Starknet builders",
  ];
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-medium">{item}</span>
          {i < items.length - 1 && (
            <span className="text-slate-700">•</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Hero Section (root export) ────────────────────────────── */
export default function HeroSection() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0f1c]">
      {/* Background visual effects */}
      <BackgroundGlow />

      {/* Navbar */}
      <Navbar />

      {/* Main hero content */}
      <main className="relative z-10 flex flex-col items-center flex-1 pt-20 pb-0">
        {/* ─── Floating Panels (upper half) ─── */}
        <motion.div
          className="w-full max-w-5xl px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <FloatingPanels />
        </motion.div>

        {/* ─── Text content (lower half) ─── */}
        <div className="relative w-full flex flex-col items-center px-6 pt-10 pb-16 text-center">
          {/* Gradient fade from panels into text area */}
          <div
            className="absolute inset-x-0 top-0 h-32 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,15,28,0) 0%, rgba(10,15,28,0.85) 60%, rgba(10,15,28,1) 100%)",
            }}
          />

          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative mb-6 inline-flex items-center gap-2 bg-[#22d3ee]/10 border border-[#22d3ee]/25 rounded-full px-4 py-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
            <span className="text-xs font-semibold text-[#22d3ee] tracking-wide">
              Starkzap Dev Studio — Now in Beta
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative gradient-text text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight max-w-4xl"
          >
            Learn Starknet + Starkzap
            <br />
            by doing.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="relative mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed"
          >
            Guided flows. Live execution on Starknet. Real-time visualization that
            removes the black box.
          </motion.p>

          {/* Philosophy pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="relative mt-5"
          >
            <PhilosophyLine />
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.05 }}
            className="relative mt-10 flex items-center gap-4 flex-wrap justify-center"
          >
            <button className="btn-primary text-white font-bold text-base px-8 py-4 rounded-xl">
              Try Unzap Studio Now
            </button>
            <button className="btn-secondary text-slate-300 font-semibold text-base px-8 py-4 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center">
                <svg viewBox="0 0 12 14" fill="currentColor" className="w-3 h-3 ml-0.5 text-white">
                  <path d="M1 1l10 6L1 13V1z" />
                </svg>
              </div>
              Watch 45-second Demo
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.25 }}
            className="relative mt-8"
          >
            <TrustLine />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
