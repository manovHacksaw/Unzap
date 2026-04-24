import type { Metadata } from "next";

export const metadata: Metadata = {
  // Allow client component to set title dynamically
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
