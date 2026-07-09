import { Navigation } from "@/components/Navigation";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navigation />
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
