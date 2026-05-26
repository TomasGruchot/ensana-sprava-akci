import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const branding = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/Latinotype - Branding-Thin.otf", weight: "100", style: "normal" },
    { path: "./fonts/Latinotype - Branding-ThinItalic.otf", weight: "100", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/Latinotype - Branding-LightItalic.otf", weight: "300", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Semilight.otf", weight: "350", style: "normal" },
    { path: "./fonts/Latinotype - Branding-SemilightItalic.otf", weight: "350", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/Latinotype - Branding-MediumItalic.otf", weight: "500", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Semibold.otf", weight: "600", style: "normal" },
    { path: "./fonts/Latinotype - Branding-SemiboldItalic.otf", weight: "600", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/Latinotype - Branding-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "./fonts/Latinotype - Branding-Black.otf", weight: "900", style: "normal" },
    { path: "./fonts/Latinotype - Branding-BlackItalic.otf", weight: "900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Ensana — Správa akcí",
  description: "Jednotný systém pro evidenci a správu akcí v hotelech Ensana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${branding.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
