import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cairo Contract Lab",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
