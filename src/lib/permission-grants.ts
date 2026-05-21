import type { PermissionGrant } from "@/types";
import {
  EMPTY_PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionFlags,
  type PermissionKey,
} from "@/lib/permissions";

export type GrantInput = {
  hotelId: string;
  roomId: string | null;
} & PermissionFlags;

export function parseGrantsJson(raw: string | null | undefined): GrantInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeGrantInput(item))
      .filter((g): g is GrantInput => g !== null);
  } catch {
    return [];
  }
}

function normalizeGrantInput(item: unknown): GrantInput | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const hotelId = typeof o.hotelId === "string" ? o.hotelId : "";
  if (!hotelId) return null;
  const roomId =
    o.roomId === null || o.roomId === undefined
      ? null
      : typeof o.roomId === "string"
        ? o.roomId
        : null;

  const flags = { ...EMPTY_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    flags[key] = o[key] === true;
  }

  return { hotelId, roomId, ...flags };
}

export function grantScopeKey(hotelId: string, roomId: string | null): string {
  return `${hotelId}::${roomId ?? ""}`;
}

export function dedupeGrants(grants: GrantInput[]): GrantInput[] {
  const map = new Map<string, GrantInput>();
  for (const g of grants) {
    const key = grantScopeKey(g.hotelId, g.roomId);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, g);
      continue;
    }
    const merged = { ...existing };
    for (const pk of PERMISSION_KEYS) {
      merged[pk] = existing[pk] || g[pk];
    }
    map.set(key, merged);
  }
  return [...map.values()];
}

export function hasAnyPermission(flags: PermissionFlags): boolean {
  return PERMISSION_KEYS.some((k) => flags[k]);
}

export function summarizeGrants(grants: PermissionGrant[]): string {
  if (grants.length === 0) return "Výchozí: čtení všech hotelů";
  const hotels = new Set(grants.map((g) => g.hotelId));
  const rooms = grants.filter((g) => g.roomId).length;
  const hotelOnly = grants.filter((g) => !g.roomId).length;
  const parts: string[] = [];
  if (hotelOnly > 0) parts.push(`${hotelOnly} hotel(ů)`);
  if (rooms > 0) parts.push(`${rooms} místností`);
  return `${parts.join(", ")} · ${hotels.size} provozoven`;
}
