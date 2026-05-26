import type { ReactNode } from "react";
import "../globals.css";
import "@/styles/print.css";

export const dynamic = "force-dynamic";

export default function PrintGroupLayout({ children }: { children: ReactNode }) {
  return <div className="print-root bg-white text-zinc-900">{children}</div>;
}
