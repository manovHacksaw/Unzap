"use client";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]"
      style={{ fontFamily: "var(--font-space-grotesk), 'Inter', sans-serif" }}
    >
      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-auto bg-[#0a0a0a]">
        {children}
      </main>
    </div>
  );
}
