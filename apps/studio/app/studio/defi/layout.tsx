import type { Metadata } from "next";
export const metadata: Metadata = { title: "DeFi Hub" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
