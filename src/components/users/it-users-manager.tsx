"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Mail, Pencil, Plus, Shield, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "@/generated/prisma/enums";
import {
  createUser,
  deleteUser,
  sendPasswordResetEmail,
  updateUser,
} from "@/lib/actions/users";
import type { GrantInput } from "@/lib/permission-grants";
import { grantScopeKey, hasAnyPermission, summarizeGrants } from "@/lib/permission-grants";
import {
  EMPTY_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  canAssignRole,
  canGrantCreateHotels,
  grantsFromLegacyManagers,
  isMainAdmin,
  normalizeRole,
  type PermissionKey,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ActionState, HotelWithRooms, ProfileWithAccess } from "@/types";
import type { AppUser } from "@/lib/actions/auth";

interface ItUsersManagerProps {
  users: ProfileWithAccess[];
  hotels: HotelWithRooms[];
  actor: AppUser & { id: string };
}

const initialState: ActionState = {};

const ROLE_BADGE: Partial<Record<Role, string>> = {
  ADMIN: "bg-primary text-primary-foreground",
  IT: "bg-sky-600 text-white",
  USER: "bg-zinc-100 text-zinc-700",
  MANAGER: "bg-violet-50 text-violet-700",
  VIEWER: "bg-zinc-100 text-zinc-600",
};

function profileToGrantInputs(user: ProfileWithAccess): GrantInput[] {
  if (user.grants.length > 0) {
    return user.grants.map((g) => ({
      hotelId: g.hotelId,
      roomId: g.roomId,
      canCreateEvents: g.canCreateEvents,
      canUpdateEvents: g.canUpdateEvents,
      canDeleteEvents: g.canDeleteEvents,
      canCreateHotels: g.canCreateHotels,
      canUpdateHotels: g.canUpdateHotels,
      canDeleteHotels: g.canDeleteHotels,
      canManageUsers: g.canManageUsers,
    }));
  }
  if (user.role === Role.MANAGER && user.managers.length > 0) {
    return grantsFromLegacyManagers(user.managers) as GrantInput[];
  }
  return [];
}

function accessSummary(user: ProfileWithAccess): string {
  if (user.role === Role.ADMIN) return "Plný přístup · přidávání hotelů";
  if (user.role === Role.IT) return "IT · správa všech účtů";
  return summarizeGrants(user.grants);
}

export function ItUsersManager({ users, hotels, actor }: ItUsersManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithAccess | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [, startReset] = useTransition();
  const [resettingId, setResettingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(user: ProfileWithAccess) {
    setEditing(user);
    setDialogOpen(true);
  }

  function handlePasswordReset(profileId: string) {
    setResettingId(profileId);
    startReset(async () => {
      const result = await sendPasswordResetEmail(profileId);
      if (result.success) {
        toast.success(result.message ?? "E-mail byl odeslán");
      } else {
        toast.error(result.error ?? "Nepodařilo se odeslat e-mail");
      }
      setResettingId(null);
    });
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
          <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-600" />
            IT správa účtů
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
            Vytváření účtů, přiřazení rolí a granulárních oprávnění po hotelech a místnostech.
            Bez explicitního přístupu má uživatel u všech hotelů výchozí režim pouze pro čtení.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Nový účet
        </Button>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Uživatel
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-44">
                Role
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Oprávnění
              </TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center text-sm text-zinc-500">
                  Zatím žádní uživatelé.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const locked =
                  actor.role === Role.IT && user.role === Role.ADMIN;
                return (
                  <TableRow key={user.id} className="hover:bg-zinc-50/80">
                    <TableCell>
                      <p className="text-sm font-medium text-zinc-900">
                        {user.name || "—"}
                      </p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-0 font-medium",
                          ROLE_BADGE[user.role] ?? ROLE_BADGE.USER,
                        )}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
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
                          disabled={locked || resettingId === user.id}
                          onClick={() => handlePasswordReset(user.id)}
                          aria-label="Odeslat e-mail pro nastavení hesla"
                          title="Odeslat odkaz pro nastavení / reset hesla"
                        >
                          {resettingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                          ) : (
                            <KeyRound className="w-4 h-4 text-zinc-500" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={locked}
                          onClick={() => openEdit(user)}
                          aria-label="Upravit uživatele"
                        >
                          <Pencil className="w-4 h-4 text-zinc-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={locked || user.id === actor.id}
                          onClick={() => setDeleteId(user.id)}
                          aria-label="Smazat uživatele"
                          className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        hotels={hotels}
        actorRole={actor.role}
        onSuccess={() => {
          setDialogOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Účet bude odstraněn včetně všech přiřazených oprávnění. Akci nelze vrátit.
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

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileWithAccess | null;
  hotels: HotelWithRooms[];
  actorRole: Role;
  onSuccess: () => void;
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
  hotels,
  actorRole,
  onSuccess,
}: UserFormDialogProps) {
  const isEdit = !!user;
  const action = isEdit ? updateUser : createUser;
  const [state, formAction, pending] = useActionState(action, initialState);

  const assignableRoles = useMemo(() => {
    const roles: Role[] = [Role.USER, Role.IT];
    if (isMainAdmin(actorRole)) roles.unshift(Role.ADMIN);
    return roles.filter((r) => canAssignRole(actorRole, r));
  }, [actorRole]);

  const [role, setRole] = useState<Role>(Role.USER);
  const [grants, setGrants] = useState<GrantInput[]>([]);
  const [addHotelId, setAddHotelId] = useState("");

  useEffect(() => {
    if (!open) return;
    const r = user ? normalizeRole(user.role) : Role.USER;
    setRole(r);
    setGrants(user ? profileToGrantInputs(user) : []);
    setAddHotelId("");
  }, [open, user]);

  useEffect(() => {
    if (state.success) {
      toast.success(
        state.message ?? (isEdit ? "Účet byl upraven" : "Pozvánka byla odeslána na e-mail"),
      );
      onSuccess();
    }
    if (state.error) toast.error(state.error);
  }, [state, isEdit, onSuccess]);

  const showGrants = role === Role.USER;
  const grantsJson = JSON.stringify(grants);
  const allowCreateHotelsFlag = canGrantCreateHotels(actorRole);

  function upsertGrant(
    hotelId: string,
    roomId: string | null,
    patch: Partial<GrantInput>,
  ) {
    const key = grantScopeKey(hotelId, roomId);
    setGrants((prev) => {
      const idx = prev.findIndex((g) => grantScopeKey(g.hotelId, g.roomId) === key);
      if (idx === -1) {
        return [
          ...prev,
          {
            hotelId,
            roomId,
            ...EMPTY_PERMISSIONS,
            ...patch,
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function togglePermission(
    hotelId: string,
    roomId: string | null,
    key: PermissionKey,
    checked: boolean,
  ) {
    upsertGrant(hotelId, roomId, { [key]: checked });
  }

  function getGrant(hotelId: string, roomId: string | null): GrantInput | undefined {
    return grants.find((g) => grantScopeKey(g.hotelId, g.roomId) === grantScopeKey(hotelId, roomId));
  }

  function addHotelScope() {
    if (!addHotelId) return;
    if (getGrant(addHotelId, null)) {
      toast.message("Přístup k tomuto hotelu už existuje");
      return;
    }
    upsertGrant(addHotelId, null, { ...EMPTY_PERMISSIONS });
    setAddHotelId("");
  }

  function removeScope(hotelId: string, roomId: string | null) {
    const key = grantScopeKey(hotelId, roomId);
    setGrants((prev) => prev.filter((g) => grantScopeKey(g.hotelId, g.roomId) !== key));
  }

  const roleItems = assignableRoles.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
  }));

  const hotelScopes = grants.filter((g) => g.roomId === null);
  const hotelsWithScope = new Set(grants.map((g) => g.hotelId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit účet" : "Nový účet"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Změny rolí a oprávnění se projeví ihned po uložení."
              : "Po vytvoření přijde na e-mail odkaz pro nastavení hesla a první přihlášení."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {isEdit ? <input type="hidden" name="profileId" value={user.id} /> : null}
          <input type="hidden" name="grantsJson" value={grantsJson} />

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
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-name">Jméno</Label>
            <Input
              id="user-name"
              name="name"
              required
              defaultValue={user?.name ?? ""}
              placeholder="Jan Novák"
            />
          </div>

          {!isEdit ? (
            <p className="text-xs text-zinc-500 flex items-start gap-2 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
              <Mail className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
              Heslo si uživatel nastaví sám po kliknutí na odkaz v e-mailu.
            </p>
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
            {role === Role.IT ? (
              <p className="text-xs text-zinc-500">
                IT má přístup na tuto stránku a může spravovat všechny účty. Přidávat nové hotely
                může pouze hlavní administrátor.
              </p>
            ) : null}
            {role === Role.ADMIN ? (
              <p className="text-xs text-zinc-500">
                Hlavní administrátor má plný přístup včetně zakládání hotelů.
              </p>
            ) : null}
          </div>

          {showGrants ? (
            <div className="space-y-3">
              <div>
                <Label>Oprávnění po hotelech / místnostech</Label>
                <p className="text-xs text-zinc-500 mt-1">
                  Bez zaškrtnutého přístupu vidí uživatel všechny hotely jen jako čtenář.
                </p>
              </div>

              <div className="flex gap-2">
                <Select value={addHotelId} onValueChange={(v) => v && setAddHotelId(v)}>
                  <SelectTrigger className="flex-1 bg-white">
                    <SelectValue placeholder="Přidat hotel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels
                      .filter((h) => !hotelsWithScope.has(h.id))
                      .map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addHotelScope}>
                  Přidat
                </Button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {hotelScopes.length === 0 && grants.filter((g) => g.roomId).length === 0 ? (
                  <p className="text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg px-3 py-4 text-center">
                    Žádná rozšířená oprávnění — pouze čtení všech hotelů.
                  </p>
                ) : null}

                {hotels
                  .filter((h) => hotelsWithScope.has(h.id))
                  .map((hotel) => (
                    <PermissionScopeBlock
                      key={hotel.id}
                      hotel={hotel}
                      grants={grants}
                      allowCreateHotelsFlag={allowCreateHotelsFlag}
                      onToggle={togglePermission}
                      onRemoveScope={removeScope}
                      getGrant={getGrant}
                    />
                  ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
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
                "Vytvořit a odeslat pozvánku"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionScopeBlock({
  hotel,
  grants,
  allowCreateHotelsFlag,
  onToggle,
  onRemoveScope,
  getGrant,
}: {
  hotel: HotelWithRooms;
  grants: GrantInput[];
  allowCreateHotelsFlag: boolean;
  onToggle: (
    hotelId: string,
    roomId: string | null,
    key: PermissionKey,
    checked: boolean,
  ) => void;
  onRemoveScope: (hotelId: string, roomId: string | null) => void;
  getGrant: (hotelId: string, roomId: string | null) => GrantInput | undefined;
}) {
  const hotelGrant = getGrant(hotel.id, null);
  const roomGrants = grants.filter((g) => g.hotelId === hotel.id && g.roomId);

  const permissionKeys = PERMISSION_KEYS.filter(
    (k) => allowCreateHotelsFlag || k !== "canCreateHotels",
  );

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-100"
        style={{ borderLeftWidth: 4, borderLeftColor: hotel.color }}
      >
        <span className="text-sm font-semibold text-zinc-800 flex-1">{hotel.name}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-zinc-400 hover:text-red-600"
          onClick={() => onRemoveScope(hotel.id, null)}
          aria-label="Odebrat hotel"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          Celý hotel
        </p>
        <PermissionChecklist
          hotelId={hotel.id}
          roomId={null}
          grant={hotelGrant}
          keys={permissionKeys}
          onToggle={onToggle}
          onEnsure={() => {
            if (!hotelGrant) {
              onToggle(hotel.id, null, "canCreateEvents", false);
            }
          }}
        />

        {hotel.rooms.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Jednotlivé místnosti
            </p>
            {hotel.rooms.map((room) => {
              const rg = getGrant(hotel.id, room.id);
              const active = !!rg && hasAnyPermission(rg);
              return (
                <div
                  key={room.id}
                  className={cn(
                    "rounded-md border px-2.5 py-2",
                    active ? "border-zinc-200 bg-white" : "border-transparent",
                  )}
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onToggle(hotel.id, room.id, "canCreateEvents", true);
                          onToggle(hotel.id, room.id, "canUpdateEvents", true);
                          onToggle(hotel.id, room.id, "canDeleteEvents", true);
                        } else {
                          onRemoveScope(hotel.id, room.id);
                        }
                      }}
                      className="size-4 rounded border-zinc-300"
                    />
                    {room.name}
                  </label>
                  {active && rg ? (
                    <PermissionChecklist
                      hotelId={hotel.id}
                      roomId={room.id}
                      grant={rg}
                      keys={permissionKeys}
                      onToggle={onToggle}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PermissionChecklist({
  hotelId,
  roomId,
  grant,
  keys,
  onToggle,
  onEnsure,
}: {
  hotelId: string;
  roomId: string | null;
  grant?: GrantInput;
  keys: PermissionKey[];
  onToggle: (
    hotelId: string,
    roomId: string | null,
    key: PermissionKey,
    checked: boolean,
  ) => void;
  onEnsure?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {keys.map((key) => (
        <label
          key={key}
          className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-zinc-900"
        >
          <input
            type="checkbox"
            checked={grant?.[key] ?? false}
            onChange={(e) => {
              onEnsure?.();
              onToggle(hotelId, roomId, key, e.target.checked);
            }}
            className="size-3.5 rounded border-zinc-300"
          />
          {PERMISSION_LABELS[key]}
        </label>
      ))}
    </div>
  );
}
