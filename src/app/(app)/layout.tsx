import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";

/** Aplikace vyžaduje DB a session — neprerenderovat při buildu bez DATABASE_URL. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { PermissionsProvider } from "@/components/layout/permissions-context";
import { EventForm } from "@/components/events/event-form";
import { getAppUser } from "@/lib/actions/auth";
import { getHotelsWithRooms } from "@/lib/actions/events";
import { buildUserCapabilities } from "@/lib/permissions";
import { getSessionProfileWithGrants } from "@/lib/permissions-server";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/prihlasit");

  const [hotels, profile] = await Promise.all([
    getHotelsWithRooms(),
    getSessionProfileWithGrants(),
  ]);

  if (!profile) redirect("/prihlasit");

  const capabilities = buildUserCapabilities(profile);

  return (
    <PermissionsProvider
      role={profile.role}
      grants={profile.grants}
      capabilities={capabilities}
    >
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        <AppSidebar hotels={hotels} user={appUser} />
        <main className="flex-1 min-w-0 overflow-auto p-6">{children}</main>
        <EventForm hotels={hotels} />
      </div>
    </PermissionsProvider>
  );
}
