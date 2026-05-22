"use client";

import { useState, useCallback, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/layout/app-logo";

interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Zavři sidebar při změně route na mobilu
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Zavři sidebar při Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Overlay backdrop pro mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — na mobile se sliduje zleva jako drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 lg:static lg:z-auto lg:block",
          "transition-transform duration-250 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {sidebar}
      </div>

      {/* Main oblast */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar s hamburger tlačítkem */}
        <div className="flex items-center h-12 px-3 gap-3 border-b border-zinc-200 bg-white lg:hidden shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Zavřít menu" : "Otevřít menu"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <AppLogo size="sm" className="max-h-7 max-w-7 shrink-0" />
            <span className="text-sm font-semibold text-primary truncate">Správa akcí</span>
          </div>
        </div>

        <main className="flex-1 min-w-0 overflow-auto p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
