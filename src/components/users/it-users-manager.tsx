"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
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
import { UserAvatar } from "@/components/shared/user-avatar";
import { Role } from "@/generated/prisma/enums";
import {
  createUser,
  deleteUser,
  regenerateActivationCode,
  updateUser,
} from "@/lib/actions/users";
import type { GrantInput } from "@/lib/permission-grants";
import { grantScopeKey, summarizeGrants } from "@/lib/permission-grants";
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
  IT: "bg-sky-600 text-white",
  ADMIN: "bg-violet-100 text-violet-800",
  USER: "bg-zinc-100 text-zinc-600",
  MANAGER: "bg-zinc-100 text-zinc-600",
  VIEWER: "bg-zinc-100 text-zinc-600",
};

function parseGrantScopeValue(value: string): { hotelId: string; roomId: string | null } | null {
  const [hotelId, roomId = ""] = value.split("::");
  if (!hotelId) return null;
  return { hotelId, roomId: roomId || null };
}

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
  if (user.role === Role.IT) return "IT správa · plný přístup ke všemu";
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
  const [codeInfo, setCodeInfo] = useState<{ code: string; email: string } | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(user: ProfileWithAccess) {
    setEditing(user);
    setDialogOpen(true);
  }

  function handleRegenerateCode(profileId: string) {
    setResettingId(profileId);
    startReset(async () => {
      const result = await regenerateActivationCode(profileId);
      if (result.success && result.activationCode && result.activationEmail) {
        setCodeInfo({ code: result.activationCode, email: result.activationEmail });
      } else {
        toast.error(result.error ?? "Nepodařilo se vygenerovat kód");
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
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
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          Nový účet
        </Button>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto bg-white">
        <Table className="min-w-[600px]">
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
                const locked = user.id === actor.id;
                return (
                  <TableRow key={user.id} className="hover:bg-zinc-50/80">
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          avatarUrl={user.avatarUrl}
                          size="default"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </div>
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
                          onClick={() => handleRegenerateCode(user.id)}
                          aria-label="Vygenerovat nový aktivační kód"
                          title="Vygenerovat nový aktivační kód (reset hesla)"
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
                          disabled={locked}
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
        onSuccess={(payload) => {
          setDialogOpen(false);
          setEditing(null);
          if (payload?.activationCode && payload.activationEmail) {
            setCodeInfo({ code: payload.activationCode, email: payload.activationEmail });
          }
          router.refresh();
        }}
      />

      <ActivationCodeDialog info={codeInfo} onClose={() => setCodeInfo(null)} />

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
  onSuccess: (payload?: { activationCode?: string; activationEmail?: string }) => void;
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
    const roles: Role[] = [Role.ADMIN, Role.IT];
    return roles.filter((r) => canAssignRole(actorRole, r));
  }, [actorRole]);

  const [role, setRole] = useState<Role>(Role.ADMIN);
  const [grants, setGrants] = useState<GrantInput[]>([]);
  const [addHotelId, setAddHotelId] = useState("");
  const [addRoomScopeValue, setAddRoomScopeValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const r = user ? normalizeRole(user.role) : Role.ADMIN;
    setRole(r);
    setGrants(user ? profileToGrantInputs(user) : []);
    setAddHotelId("");
    setAddRoomScopeValue("");
  }, [open, user]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? (isEdit ? "Účet byl upraven" : "Účet byl vytvořen"));
      onSuccess(
        isEdit
          ? undefined
          : { activationCode: state.activationCode, activationEmail: state.activationEmail },
      );
    }
    if (state.error) toast.error(state.error);
  }, [state, isEdit, onSuccess]);

  const showGrants = role === Role.ADMIN;
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

  function addRoomScope() {
    if (!addRoomScopeValue) return;
    const scope = parseGrantScopeValue(addRoomScopeValue);
    if (!scope?.roomId) return;
    if (getGrant(scope.hotelId, scope.roomId)) {
      toast.message("Přístup k této místnosti už existuje");
      return;
    }
    upsertGrant(scope.hotelId, scope.roomId, { ...EMPTY_PERMISSIONS });
    setAddRoomScopeValue("");
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
  const hotelsWithAnyScope = new Set(grants.map((g) => g.hotelId));
  const hotelsWithHotelScope = new Set(hotelScopes.map((g) => g.hotelId));
  const roomScopeKeys = new Set(
    grants
      .filter((g) => g.roomId !== null)
      .map((g) => grantScopeKey(g.hotelId, g.roomId)),
  );
  const addHotelItems = hotels
    .filter((hotel) => !hotelsWithHotelScope.has(hotel.id))
    .map((hotel) => ({
      value: hotel.id,
      label: hotel.name,
    }));
  const addRoomItems = hotels.flatMap((hotel) =>
    hotel.rooms
      .filter((room) => !roomScopeKeys.has(grantScopeKey(hotel.id, room.id)))
      .map((room) => ({
        value: grantScopeKey(hotel.id, room.id),
        label: `${hotel.name} · ${room.name}`,
      })),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit účet" : "Nový účet"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Změny rolí a oprávnění se projeví ihned po uložení."
              : "Po vytvoření se zobrazí aktivační kód, který předáte uživateli pro nastavení hesla."}
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
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
              Po vytvoření se zobrazí aktivační kód. Uživatel s ním na stránce „Aktivovat účet“
              zadá e-mail a zvolí si heslo.
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
                IT správa má plný přístup ke všemu — přidávání hotelů, správa všech účtů
                a úpravy libovolné místnosti bez omezení.
              </p>
            ) : null}
            {role === Role.ADMIN ? (
              <p className="text-xs text-zinc-500">
                Admin vidí vše jako čtenář a má pouze ta oprávnění, která mu explicitně přiřadíte
                níže — buď pro celý hotel, nebo jen pro konkrétní místnosti.
              </p>
            ) : null}
          </div>

          {showGrants ? (
            <div className="space-y-3">
              <div>
                <Label>Oprávnění po hotelech / místnostech</Label>
                <p className="text-xs text-zinc-500 mt-1">
                  Přiřaďte přístup pro celý hotel nebo jen konkrétní místnosti. Bez přiřazeného
                  oprávnění má admin všechny hotely pouze ke čtení.
                </p>
              </div>

              <div className="flex gap-2">
                <Select
                  value={addHotelId}
                  onValueChange={(v) => v && setAddHotelId(v)}
                  items={addHotelItems}
                >
                  <SelectTrigger className="flex-1 bg-white">
                    <SelectValue placeholder="Přidat hotel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {addHotelItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addHotelScope}>
                  Přidat hotel
                </Button>
              </div>

              <div className="flex gap-2">
                <Select
                  value={addRoomScopeValue}
                  onValueChange={(v) => v && setAddRoomScopeValue(v)}
                  items={addRoomItems}
                >
                  <SelectTrigger className="flex-1 bg-white">
                    <SelectValue placeholder="Přidat konkrétní místnost…" />
                  </SelectTrigger>
                  <SelectContent>
                    {addRoomItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addRoomScope}>
                  Přidat místnost
                </Button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {hotelScopes.length === 0 && grants.filter((g) => g.roomId).length === 0 ? (
                  <p className="text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg px-3 py-4 text-center">
                    Žádná rozšířená oprávnění — pouze čtení všech hotelů.
                  </p>
                ) : null}

                {hotels
                  .filter((h) => hotelsWithAnyScope.has(h.id))
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
                "Vytvořit účet"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActivationCodeDialog({
  info,
  onClose,
}: {
  info: { code: string; email: string } | null;
  onClose: () => void;
}) {
  async function copyCode() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.code);
      toast.success("Kód zkopírován do schránky");
    } catch {
      toast.error("Kopírování se nezdařilo");
    }
  }

  return (
    <Dialog open={!!info} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-sky-600" />
            Aktivační kód
          </DialogTitle>
          <DialogDescription>
            Předejte tento kód uživateli{" "}
            <span className="font-medium text-zinc-700">{info?.email}</span>. Na stránce
            „Aktivovat účet“ s ním zadá e-mail a zvolí si heslo. Kód platí 14 dní.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <code className="flex-1 text-center text-lg font-mono font-semibold tracking-widest bg-zinc-50 border border-zinc-200 rounded-lg py-3">
            {info?.code}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copyCode} aria-label="Kopírovat kód">
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-zinc-500">
          Kód se zobrazí jen teď — pokud ho ztratíte, vygenerujte nový tlačítkem s klíčem u
          uživatele.
        </p>

        <Button type="button" onClick={onClose} className="w-full">
          Hotovo
        </Button>
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
        {hotelGrant ? (
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
        ) : roomGrants.length > 0 ? (
          <span className="text-[11px] font-medium text-zinc-500">Jen místnosti</span>
        ) : null}
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
              const active = !!rg;
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
