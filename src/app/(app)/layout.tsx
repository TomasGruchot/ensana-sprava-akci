import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShell } from "@/components/layout/app-shell";

/** Aplikace vyžaduje DB a session — neprerenderovat při buildu bez DATABASE_URL. */
export const dynamic = "force-dynamic";
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
  const hotels = await getHotelsWithRooms();

  if (!appUser) {
    return (
      <AppShell sidebar={<AppSidebar hotels={hotels} user={null} />}>
        {children}
      </AppShell>
    );
  }

  const profile = await getSessionProfileWithGrants();
  if (!profile) redirect("/prihlasit");

  const capabilities = buildUserCapabilities(profile);

  return (
    <PermissionsProvider
      role={profile.role}
      grants={profile.grants}
      capabilities={capabilities}
    >
      <AppShell sidebar={<AppSidebar hotels={hotels} user={appUser} />}>
        {children}
        <EventForm hotels={hotels} />
      </AppShell>
    </PermissionsProvider>
  );
}
