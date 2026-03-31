"use client";

import dynamic from "next/dynamic";

const ParticleSphere = dynamic(() => import("./components/ParticleSphere"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});

const navLinks = ["PRODUCT", "SOLUTIONS", "DEVELOPERS", "RESOURCES"];

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
    name: "Outreach",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
  {
    name: "Adobe",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm6.23 0H24v21.248z" />
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
    name: "Amazon",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.16-.06.28-.022.354.09.07.11.048.226-.065.346-3.33 2.694-7.026 4.04-11.082 4.04-4.02 0-7.76-1.306-11.203-3.926-.12-.09-.14-.21-.065-.32zm.29-2.76c.117.05.17.09.17.23v1.54c0 .23-.165.34-.48.34H.025V15.3c0-.25-.1-.38-.3-.38H-.2v-.51h.51c.35 0 .53.18.54.54v3.2h.5c.53 0 .8-.15.8-.44v-1.7c0-.25.08-.38.24-.38h.45v.65zm1.47 1.39h1.64v-.24c0-.25-.11-.38-.34-.38h-.97c-.22 0-.33.13-.33.38v.24zm1.64.65H1.805v.55c0 .29.11.44.33.44h.94c.27 0 .4-.15.4-.44v-.07h.67v.16c0 .51-.33.77-1.01.77H2.04c-.66 0-.99-.26-.99-.77V16.7c0-.51.33-.77 1-.77h.97c.66 0 .99.26.99.77v.63zM4.8 19h.65v-3.2h-.65V19zm2.74-2.3H6.9v2.3h-.65v-2.3h-.65v-.65h.65v-.24c0-.5.32-.75.98-.75h.5v.64h-.43c-.22 0-.33.1-.33.3v.05h.76v.65zm1.99 1.65h-.66l-.87-2.3h.67l.54 1.56.54-1.56h.67l-.89 2.3zm1.73-.65h1.65v-.24c0-.25-.11-.38-.34-.38h-.97c-.22 0-.33.13-.33.38v.24zm1.65.65h-1.65v.55c0 .29.11.44.33.44h.94c.27 0 .4-.15.4-.44v-.07h.67v.16c0 .51-.33.77-1.01.77h-.97c-.66 0-.99-.26-.99-.77V16.7c0-.51.33-.77 1-.77h.97c.66 0 .99.26.99.77v.63zm2.85.39c0 .37-.3.56-.88.56h-1.1V16.35h1.04c.56 0 .84.19.84.56v.32c0 .21-.1.36-.31.44.24.09.36.24.36.47v.33zm-.64-1.37c0-.1-.07-.15-.22-.15h-.36v.45h.36c.15 0 .22-.06.22-.16v-.14zm.01 1.17c0-.11-.08-.17-.24-.17h-.35v.47h.35c.16 0 .24-.06.24-.17v-.13zm2.29.57c.6 0 .9-.2.9-.61V16.7c0-.4-.3-.61-.9-.61h-1.08c-.6 0-.9.2-.9.61v1.9c0 .41.3.61.9.61h1.08zm.24-.61c0 .14-.08.22-.24.22h-.84c-.16 0-.24-.08-.24-.22v-1.68c0-.15.08-.22.24-.22h.84c.16 0 .24.07.24.22v1.68zm2.34-1.52c-.14 0-.22.04-.26.13l-.5 1.16V16.35h-.65V19h.6l.65-1.52.65 1.52h.6v-2.65h-.65v1.43l-.5-1.16c-.04-.09-.12-.13-.26-.13h.32zm-16.4-9.24c-.7-1.46-.9-3.09-.56-4.66.35-1.55 1.19-2.98 2.38-4.07C7.39.91 8.88.18 10.45.02c1.57-.16 3.19.21 4.57 1.05 1.37.84 2.45 2.12 3.06 3.62.62 1.5.7 3.17.25 4.72-.45 1.55-1.43 2.92-2.76 3.86-1.33.94-2.96 1.38-4.58 1.24-1.62-.14-3.16-.86-4.32-2.02C5.5 11.33 4.77 9.77 4.45 8.08L3.06 8.5c.38 1.97 1.26 3.82 2.59 5.3 1.33 1.48 3.06 2.54 4.96 3.03v.02h.43c.04 0 .08 0 .12.01l.14.01.03-.01.1-.01v-.02c1.87-.44 3.6-1.43 4.96-2.86 1.36-1.43 2.29-3.21 2.67-5.11.38-1.9.2-3.87-.5-5.67-.7-1.8-1.92-3.37-3.49-4.5C13.56.57 11.67 0 9.74 0 7.8 0 5.91.57 4.33 1.7 2.76 2.83 1.54 4.4.84 6.2.14 8 0 9.96.39 11.85l1.34-.35c-.35-1.6-.2-3.27.43-4.76z" />
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
  {
    name: "Hopin",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.Seven.513.373.14-.374.327L6.62 4.728c-.98.047-1.494-.093-1.981-.44z" />
      </svg>
    ),
  },
];

export default function UnzapLanding() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "var(--font-space-grotesk), 'Inter', sans-serif" }}
    >
      {/* Radial glow behind sphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(180,100,0,0.18) 0%, rgba(140,60,0,0.10) 40%, transparent 70%)",
        }}
      />

      {/* Cross grid marks (decorative) */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {[
          { top: "38%", left: "8%" },
          { top: "38%", right: "8%" },
          { top: "68%", left: "38%" },
          { top: "68%", right: "38%" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute text-neutral-700 text-lg font-light"
            style={pos}
          >
            +
          </div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-50 flex items-start justify-between px-10 pt-8">
        <span
          className="text-white font-bold tracking-[0.25em] text-base uppercase"
          style={{ letterSpacing: "0.22em" }}
        >
          Unzap
        </span>

        <nav className="flex flex-col items-end gap-1">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="flex items-center gap-1 text-[11px] text-neutral-400 uppercase tracking-[0.15em] hover:text-neutral-200 transition-colors"
            >
              {link}
              <span className="text-[9px] leading-none">↗</span>
            </a>
          ))}
        </nav>
      </header>

      {/* ── HERO ── */}
      <main className="relative z-10 flex items-stretch min-h-[calc(100vh-180px)] px-10 pt-4">
        {/* Left column */}
        <div className="flex flex-col justify-between w-[38%] py-6 pr-4">
          <div className="invisible">
            <span
              className="text-neutral-400 text-[11px] tracking-widest"
              style={{ fontFamily: "monospace" }}
            >
              [ V01.3 N ]
            </span>
          </div>

          <div className="mt-auto pb-8">
            <span
              className="text-neutral-400 text-[11px] tracking-widest mb-5 block"
              style={{ fontFamily: "monospace" }}
            >
              [ LIVE EXECUTION ]
            </span>

            <h1 className="font-black uppercase leading-[0.92] tracking-tight">
              <span className="block text-white" style={{ fontSize: "clamp(2.4rem, 5.25vw, 5.25rem)" }}>
                WHERE STARKNET
              </span>
              <span
                className="flex items-center gap-3 text-white"
                style={{ fontSize: "clamp(2.4rem, 5.25vw, 5.25rem)" }}
              >
                MEETS{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 30%, #ffffff 55%, #6b7280 80%, #d1d5db 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  STARKZAP
                </span>
              </span>
              <span className="block text-white" style={{ fontSize: "clamp(2.4rem, 5.25vw, 5.25rem)" }}>
                WITH LIVE UNDERSTANDING
              </span>
            </h1>
          </div>
        </div>

        {/* Center column — 3D Sphere */}
        <div className="flex-1 relative flex items-center justify-center">
          <div
            className="absolute"
            style={{ inset: "-60px -40px", zIndex: 5 }}
          >
            <ParticleSphere />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col justify-between w-[30%] py-6 pl-4">
          <div className="flex items-center justify-end">
            <span
              className="text-neutral-400 text-[11px] tracking-widest"
              style={{ fontFamily: "monospace" }}
            >
              [ V0.1 ]&emsp;&emsp;[ STARKZAP POWERED ]&emsp;&emsp;[ 001 / 005 ]
            </span>
          </div>

          <div className="mt-auto pb-8 flex flex-col items-end">
            <p className="text-neutral-400 text-sm leading-relaxed mb-7 max-w-[320px] text-right">
              Unzap removes the black box. Guided flows. Live execution on Starknet.
              Real-time visualization of every step — from Cairo to paymaster to confirmation.
            </p>

            <div className="flex items-center gap-7">
              <button className="text-xs uppercase tracking-widest text-white hover:text-neutral-300 transition-colors">
                Watch Demo
              </button>

              <button
                className="px-5 py-2.5 text-xs uppercase tracking-widest text-white border transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 0 18px rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                Try Unzap Studio Now
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER TRUST BAR ── */}
      <footer className="relative z-10 flex flex-col items-center gap-5 pb-8 px-10">
        <p
          className="text-neutral-500 text-[11px] tracking-widest uppercase"
          style={{ fontFamily: "monospace" }}
        >
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
      </footer>
    </div>
  );
}
  