"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { ProfileAvatarDialog } from "@/components/layout/profile-avatar-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import type { AppUser } from "@/lib/actions/auth";

interface SidebarUserProps {
  user: AppUser;
}

export function SidebarUser({ user }: SidebarUserProps) {
  const [avatarOpen, setAvatarOpen] = useState(false);

  return (
    <>
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
            aria-label="Změnit profilový obrázek"
            title="Změnit profilový obrázek"
          >
            <UserAvatar
              name={user.name}
              email={user.email}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
          </button>
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

      <ProfileAvatarDialog
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
      />
    </>
  );
}
