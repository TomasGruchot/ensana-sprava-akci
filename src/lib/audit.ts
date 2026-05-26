import "server-only";

import { prisma } from "@/lib/prisma";
import type { AuditAction, AuditEntityType } from "@/lib/audit-shared";

interface LogAuditParams {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        actorName: params.actorName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityLabel: params.entityLabel ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        before: (params.before ?? undefined) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        after: (params.after ?? undefined) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (params.metadata ?? undefined) as any,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write log:", err);
  }
}

export async function getActorInfo(
  userId: string,
): Promise<{ id: string; email: string | null; name: string | null }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return profile ?? { id: userId, email: null, name: null };
  } catch {
    return { id: userId, email: null, name: null };
  }
}
