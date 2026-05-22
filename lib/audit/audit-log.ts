import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";

type AuditLogInput = {
  tenantId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: unknown;
};

export async function auditLog(input: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      payload: input.payload as Prisma.InputJsonValue | undefined
    }
  });
}
