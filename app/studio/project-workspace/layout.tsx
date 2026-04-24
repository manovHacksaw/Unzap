import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Workspace",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
