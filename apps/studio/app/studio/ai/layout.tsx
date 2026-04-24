import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cairo AI Fix" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
