import type { Metadata } from "next";
export const metadata: Metadata = { title: "Guided Mode" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
