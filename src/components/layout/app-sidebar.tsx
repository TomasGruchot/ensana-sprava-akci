"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  Hotel,
  Plus,
  Users,
} from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLogo } from "@/components/layout/app-logo";
import { SidebarUser } from "@/components/layout/sidebar-user";
import { cn } from "@/lib/utils";
import { useEventFormStore } from "@/stores/event-form-store";
import type { AppUser } from "@/lib/actions/auth";
import type { HotelWithRooms } from "@/types";

interface AppSidebarProps {
  hotels: HotelWithRooms[];
  user: AppUser;
}

const NAV_ITEMS = [
  { href: "/", label: "Přehled", icon: LayoutDashboard },
  { href: "/hotely", label: "Přehled hotelů", icon: Hotel },
  { href: "/akce", label: "Všechny akce", icon: CalendarDays },
];

export function AppSidebar({ hotels, user }: AppSidebarProps) {
  const pathname = usePathname();
  const openCreate = useEventFormStore((s) => s.openCreate);
  const [hotelsOpen, setHotelsOpen] = useState(true);

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-4 h-14 border-b border-zinc-200 shrink-0">
        <div className="flex size-8 shrink-0 items-center justify-center">
          <AppLogo size="sm" className="max-h-8 max-w-8" />
        </div>
        <h1 className="text-sm font-semibold truncate leading-none text-primary">
          Správa akcí
        </h1>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main nav */}
        <nav className="space-y-0.5 mb-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/hotely"
                  ? pathname === "/hotely"
                  : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Hotels */}
        <div>
          <button
            type="button"
            onClick={() => setHotelsOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 px-3 mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors"
          >
            <span className="flex-1 text-left">Hotely</span>
            {hotelsOpen ? (
              <ChevronDown className="size-3 shrink-0" />
            ) : (
              <ChevronRight className="size-3 shrink-0" />
            )}
          </button>
          {hotelsOpen && (
            <div className="space-y-0.5">
              {hotels.map((hotel) => (
                <HotelNavItem key={hotel.id} hotel={hotel} pathname={pathname} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-3 shrink-0 space-y-2">
        <Button
          size="lg"
          onClick={() => openCreate()}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Nová akce
        </Button>
        {user.role === Role.ADMIN ? (
          <Link
            href="/uzivatele"
            className={cn(
              "flex w-full h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium transition-colors",
              pathname === "/uzivatele"
                ? "bg-zinc-100 text-zinc-900 border-zinc-300"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            Správa uživatelů
          </Link>
        ) : null}
      </div>

      <SidebarUser user={user} />
    </aside>
  );
}

function HotelNavItem({
  hotel,
  pathname,
}: {
  hotel: HotelWithRooms;
  pathname: string;
}) {
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const activeHotelId = searchParams?.get("hotel");
  const activeRoomId = searchParams?.get("room");

  const isHotelActive = activeHotelId === hotel.id && !activeRoomId;
  const hasActiveRoom = hotel.rooms.some((r) => r.id === activeRoomId);

  const [open, setOpen] = useState(hasActiveRoom);

  return (
    <div>
      {/* Hotel row */}
      <div className="flex items-center gap-0.5">
        <Link
          href={`/akce?hotel=${hotel.id}`}
          className={cn(
            "flex flex-1 items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group min-w-0",
            isHotelActive
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
          )}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: hotel.color }}
          />
          <span className="flex-1 truncate">{hotel.name}</span>
          <span className="text-xs text-zinc-400 font-normal shrink-0">{hotel.code}</span>
        </Link>
        {hotel.rooms.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Sbalit místnosti" : "Rozbalit místnosti"}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            {open ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        )}
      </div>

      {/* Rooms */}
      {open && hotel.rooms.length > 0 && (
        <div className="ml-4 mt-0.5 mb-0.5 border-l border-zinc-100 pl-2 space-y-0.5">
          {hotel.rooms.map((room) => {
            const isRoomActive = activeRoomId === room.id;
            return (
              <Link
                key={room.id}
                href={`/akce?hotel=${hotel.id}&room=${room.id}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                  isRoomActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
                )}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60"
                  style={{ backgroundColor: hotel.color }}
                />
                <span className="truncate">{room.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
