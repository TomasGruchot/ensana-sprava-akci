"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ActionState, HotelWithRooms, ProfileWithManagers } from "@/types";
import { Role } from "@/generated/prisma/enums";

interface UsersManagerProps {
  users: ProfileWithManagers[];
  hotels: HotelWithRooms[];
}

const initialState: ActionState = {};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  MANAGER: "bg-violet-50 text-violet-700",
  VIEWER: "bg-zinc-100 text-zinc-600",
};

function accessSummary(user: ProfileWithManagers): string {
  if (user.role === Role.ADMIN) return "Všechny hotely a místnosti";
  if (user.role === Role.VIEWER) return "Čtení bez úprav";
  const count = user.managers.length;
  if (count === 0) return "Žádné místnosti";
  if (count <= 2) {
    return user.managers
      .map((m) => `${m.room.hotel.name} · ${m.room.name}`)
      .join(", ");
  }
  return `${count} místností`;
}

export function UsersManager({ users, hotels }: UsersManagerProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithManagers | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(user: ProfileWithManagers) {
    setEditing(user);
    setSheetOpen(true);
  }

  function handleDelete() {
    if (!deleteId) return;
    startDelete(async () => {
      const result = await deleteUser(deleteId);
      if (result.success) {
        toast.success("Uživatel byl odstraněn");
        router.refresh();
      } else {
        toast.error(result.error ?? "Chyba při mazání");
      }
      setDeleteId(null);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Správa uživatelů</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Přidávání účtů, rolí a přístupů k místnostem
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Přidat uživatele
        </Button>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Uživatel
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">
                Role
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Přístupy
              </TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center text-sm text-zinc-500">
                  Zatím žádní uživatelé. Přidejte prvního účet tlačítkem výše.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-zinc-50/80">
                  <TableCell>
                    <p className="text-sm font-medium text-zinc-900">
                      {user.name || "—"}
                    </p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn("border-0 font-medium", ROLE_BADGE[user.role])}
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 max-w-md truncate">
                    {accessSummary(user)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(user)}
                        aria-label="Upravit uživatele"
                      >
                        <Pencil className="w-4 h-4 text-zinc-500" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(user.id)}
                        aria-label="Smazat uživatele"
                        className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={editing}
        hotels={hotels}
        onSuccess={() => {
          setSheetOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Účet bude odstraněn ze systému včetně přístupů k místnostem. Tuto akci nelze
              vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileWithManagers | null;
  hotels: HotelWithRooms[];
  onSuccess: () => void;
}

function UserFormSheet({
  open,
  onOpenChange,
  user,
  hotels,
  onSuccess,
}: UserFormSheetProps) {
  const isEdit = !!user;
  const action = isEdit ? updateUser : createUser;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [roomIds, setRoomIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRole(user?.role ?? Role.VIEWER);
    setRoomIds(user?.managers.map((m) => m.roomId) ?? []);
  }, [open, user]);

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? "Uživatel byl upraven" : "Uživatel byl vytvořen");
      onSuccess();
    }
    if (state.error) toast.error(state.error);
  }, [state, isEdit, onSuccess]);

  function toggleRoom(roomId: string) {
    setRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId],
    );
  }

  const roleItems = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-zinc-500" />
            {isEdit ? "Upravit uživatele" : "Nový uživatel"}
          </SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-5 px-1">
          {isEdit ? (
            <input type="hidden" name="profileId" value={user.id} />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="user-email">E-mail</Label>
            {isEdit ? (
              <p className="text-sm text-zinc-600 py-2">{user.email}</p>
            ) : (
              <Input
                id="user-email"
                name="email"
                type="email"
                required
                placeholder="jan.novak@ensana.cz"
                aria-invalid={!!state.fieldErrors?.email}
              />
            )}
            {state.fieldErrors?.email ? (
              <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-name">Jméno</Label>
            <Input
              id="user-name"
              name="name"
              required
              defaultValue={user?.name ?? ""}
              placeholder="Jan Novák"
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="space-y-1.5">
              <Label htmlFor="user-password">Heslo</Label>
              <Input
                id="user-password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 znaků"
                aria-invalid={!!state.fieldErrors?.password}
              />
              {state.fieldErrors?.password ? (
                <p className="text-xs text-red-600">{state.fieldErrors.password[0]}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Role</Label>
            <input type="hidden" name="role" value={role} />
            <Select
              value={role}
              onValueChange={(v) => v && setRole(v as Role)}
              items={roleItems}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === Role.MANAGER ? (
            <div className="space-y-2">
              <Label>Přístup k místnostem</Label>
              <p className="text-xs text-zinc-500">
                Správce vidí a spravuje akce jen ve vybraných místnostech.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="p-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: hotel.color }}
                      />
                      {hotel.name}
                    </p>
                    <div className="space-y-1.5">
                      {hotel.rooms.map((room) => {
                        const checked = roomIds.includes(room.id);
                        return (
                          <label
                            key={room.id}
                            className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer hover:text-zinc-900"
                          >
                            <input
                              type="checkbox"
                              name="roomIds"
                              value={room.id}
                              checked={checked}
                              onChange={() => toggleRoom(room.id)}
                              className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                            />
                            {room.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
              {role === Role.ADMIN
                ? "Administrátor má plný přístup ke všem hotelům a místnostem."
                : "Uživatel s rolí Pouze čtení může prohlížet data bez úprav."}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Uložit"
              ) : (
                "Vytvořit"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
