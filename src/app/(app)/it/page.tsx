import { ItUsersManager } from "@/components/users/it-users-manager";
import { getAppUser } from "@/lib/actions/auth";
import { getHotelsWithRooms } from "@/lib/actions/events";
import { getUsersForIt } from "@/lib/actions/users";
import { requireItProfile } from "@/lib/permissions-server";

export default async function ItPage() {
  const profile = await requireItProfile();
  const [users, hotels, appUser] = await Promise.all([
    getUsersForIt(),
    getHotelsWithRooms(),
    getAppUser(),
  ]);

  if (!appUser) return null;

  return (
    <ItUsersManager
      users={users}
      hotels={hotels}
      actor={{ ...appUser, id: profile.id, role: profile.role }}
    />
  );
}
