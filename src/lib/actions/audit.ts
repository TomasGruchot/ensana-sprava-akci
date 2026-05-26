"use server";

import { prisma } from "@/lib/prisma";
import { requireItProfile } from "@/lib/permissions-server";

const AUDIT_PAGE_SIZE = 50;

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
};

export async function getAuditLogs(cursor?: string): Promise<{
  entries: AuditLogEntry[];
  nextCursor: string | null;
}> {
  await requireItProfile();

  const entries = await prisma.auditLog.findMany({
    take: AUDIT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = entries.length > AUDIT_PAGE_SIZE;
  const page = hasMore ? entries.slice(0, AUDIT_PAGE_SIZE) : entries;
  return {
    entries: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
