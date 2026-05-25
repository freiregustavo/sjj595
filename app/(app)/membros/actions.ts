"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/prisma/client";

const memberSchema = z.object({
  fullName: z.string().min(2, "Informe o nome completo."),
  document: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  joinedAt: z.string().optional(),
  branchId: z.string().uuid().optional().or(z.literal("")),
  entityIds: z.array(z.string().uuid()).default([])
});

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

async function assertBranchBelongsToTenant(branchId: string, tenantId: string) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      tenantId,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (!branch) {
    throw new Error("Filial invalida para este tenant.");
  }
}

async function assertEntitiesBelongToTenant(entityIds: string[], tenantId: string) {
  if (entityIds.length === 0) {
    return;
  }

  const uniqueEntityIds = Array.from(new Set(entityIds));
  const foundEntities = await prisma.masonicEntity.findMany({
    where: {
      id: { in: uniqueEntityIds },
      tenantId,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (foundEntities.length !== uniqueEntityIds.length) {
    throw new Error("Uma ou mais entidades informadas nao pertencem ao tenant.");
  }
}

export async function createMember(formData: FormData) {
  const context = await requirePermission("members.create");
  const parsed = memberSchema.parse({
    fullName: formData.get("fullName"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    joinedAt: formData.get("joinedAt") || undefined,
    branchId: formData.get("branchId") || "",
    entityIds: formData.getAll("entityIds")
  });
  const entityIds = Array.from(new Set(parsed.entityIds));
  const branchId = parsed.branchId || context.branchId;

  if (branchId) {
    await assertBranchBelongsToTenant(branchId, context.tenantId);
  }

  await assertEntitiesBelongToTenant(entityIds, context.tenantId);

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.member.create({
      data: {
        tenantId: context.tenantId,
        branchId,
        fullName: parsed.fullName.trim(),
        document: parsed.document?.trim() || null,
        email: parsed.email || null,
        phone: parsed.phone?.trim() || null,
        birthDate: parseDate(parsed.birthDate),
        joinedAt: parseDate(parsed.joinedAt),
        status: "ACTIVE"
      }
    });

    if (entityIds.length > 0) {
      await tx.memberEntityMembership.createMany({
        data: entityIds.map((entityId) => ({
          tenantId: context.tenantId,
          memberId: created.id,
          entityId,
          status: "ACTIVE",
          joinedAt: parseDate(parsed.joinedAt)
        })),
        skipDuplicates: true
      });
    }

    await tx.memberHistory.create({
      data: {
        tenantId: context.tenantId,
        memberId: created.id,
        eventType: "member.created",
        description: "Membro cadastrado",
        createdBy: context.profileId
      }
    });

    return created;
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "members.create",
    entityType: "members",
    entityId: member.id,
    payload: {
      fullName: member.fullName,
      entityIds
    }
  });

  revalidatePath("/membros");
  revalidatePath("/dashboard");
}
