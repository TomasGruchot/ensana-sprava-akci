import { UsersManager } from "@/components/users/users-manager";
import { getHotelsWithRooms } from "@/lib/actions/events";
import { getUsersForAdmin } from "@/lib/actions/users";
import { requireAdminProfile } from "@/lib/permissions";

export default async function UzivatelePage() {
  await requireAdminProfile();

  const [users, hotels] = await Promise.all([getUsersForAdmin(), getHotelsWithRooms()]);

  return <UsersManager users={users} hotels={hotels} />;
}
