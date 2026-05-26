import { Suspense } from "react";
import { ItUsersManager } from "@/components/users/it-users-manager";
import { AuditLogTable } from "@/components/it/audit-log-table";
import { getAppUser } from "@/lib/actions/auth";
import { getHotelsWithRooms } from "@/lib/actions/events";
import { getUsersForIt } from "@/lib/actions/users";
import { getAuditLogs } from "@/lib/actions/audit";
import { requireItProfile } from "@/lib/permissions-server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ItPage() {
  const profile = await requireItProfile();
  const [users, hotels, appUser] = await Promise.all([
    getUsersForIt(),
    getHotelsWithRooms(),
    getAppUser(),
  ]);

  if (!appUser) return null;

  return (
    <div className="flex flex-col gap-6">
      <ItUsersManager
        users={users}
        hotels={hotels}
        actor={{ ...appUser, id: profile.id, role: profile.role }}
      />
      <Suspense fallback={<AuditLogSkeleton />}>
        <AuditLogSection />
      </Suspense>
    </div>
  );
}

async function AuditLogSection() {
  const { entries, nextCursor } = await getAuditLogs();
  return (
    <AuditLogTable initialEntries={entries} initialNextCursor={nextCursor} />
  );
}

function AuditLogSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
