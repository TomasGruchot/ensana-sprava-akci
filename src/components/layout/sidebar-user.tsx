"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import type { AppUser } from "@/lib/actions/auth";

function getInitials(name: string, email: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface SidebarUserProps {
  user: AppUser;
}

export function SidebarUser({ user }: SidebarUserProps) {
  const initials = getInitials(user.name, user.email);

  return (
    <div className="px-4 py-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar size="lg" className="size-11 shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="bg-zinc-100 text-zinc-700 text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">
            {user.name}
          </p>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{user.email}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => signOut()}
          title="Odhlásit se"
          aria-label="Odhlásit se"
          className="shrink-0 size-7 text-zinc-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
