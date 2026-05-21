import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { EventForm } from "@/components/events/event-form";
import { getAppUser } from "@/lib/actions/auth";
import { getHotelsWithRooms } from "@/lib/actions/events";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const [appUser, hotels] = await Promise.all([getAppUser(), getHotelsWithRooms()]);

  if (!appUser) redirect("/prihlasit");

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <AppSidebar hotels={hotels} user={appUser} />
      <main className="flex-1 min-w-0 overflow-auto p-6">{children}</main>
      <EventForm hotels={hotels} />
    </div>
  );
}
