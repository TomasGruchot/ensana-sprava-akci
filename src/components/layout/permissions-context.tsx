"use client";

import { createContext, useContext, useMemo } from "react";

import { Role } from "@/generated/prisma/enums";
import {
  canModifyEventInScope,
  hasPermission,
  type UserCapabilities,
} from "@/lib/permissions";
import type { PermissionGrant } from "@/types";

type PermissionsContextValue = {
  role: Role;
  grants: PermissionGrant[];
  capabilities: UserCapabilities;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  role,
  grants,
  capabilities,
  children,
}: {
  role: Role;
  grants: PermissionGrant[];
  capabilities: UserCapabilities;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ role, grants, capabilities }),
    [role, grants, capabilities],
  );
  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

export function usePermissions(): UserCapabilities {
  return usePermissionsContext().capabilities;
}

export function usePermissionsContext(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return {
      role: Role.USER,
      grants: [],
      capabilities: {
        canManageAccounts: false,
        canAddHotels: false,
        canCreateEvents: false,
        canUpdateEvents: false,
        canDeleteEvents: false,
        canUpdateHotels: false,
        canDeleteHotels: false,
      },
    };
  }
  return ctx;
}

export function useCanModifyEvent(
  hotelId: string,
  roomId: string,
  action: "create" | "update" | "delete",
): boolean {
  const { role, grants } = usePermissionsContext();
  return canModifyEventInScope({ role, grants }, hotelId, roomId, action);
}

export function useCanModifyHotel(
  hotelId: string,
  action: "update" | "delete",
): boolean {
  const { role, grants } = usePermissionsContext();
  const key = action === "update" ? "canUpdateHotels" : "canDeleteHotels";
  return hasPermission({ role, grants }, key, { hotelId });
}
