"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { auditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/permissions";

function normalizeCode(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

const entitySchema = z.object({
  name: z.string().min(2, "Informe o nome da entidade."),
  code: z.string().optional(),
  kind: z.enum(["LODGE", "APPENDANT_BODY", "OTHER"]),
  description: z.string().optional()
});

const accountSchema = z.object({
  name: z.string().min(2, "Informe o nome do caixa."),
  code: z.string().optional(),
  kind: z.enum(["GENERAL", "ENTITY", "BRANCH"]),
  entityId: z.string().uuid().optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal(""))
});

const tenantSchema = z.object({
  name: z.string().min(2, "Informe o tenant."),
  slug: z.string().optional(),
  branchName: z.string().min(2, "Informe a filial matriz."),
  primaryEntityName: z.string().min(2, "Informe a entidade principal."),
  primaryEntityCode: z.string().optional()
});

const defaultCategories = [
  { name: "Mensalidades", type: "INCOME" as const },
  { name: "Doacoes", type: "INCOME" as const },
  { name: "Eventos", type: "INCOME" as const },
  { name: "Administrativo", type: "EXPENSE" as const },
  { name: "Manutencao", type: "EXPENSE" as const },
  { name: "Fornecedores", type: "EXPENSE" as const }
];

function normalizeSlug(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function assertUniqueEntityCode(tenantId: string, code: string) {
  const existingEntity = await prisma.masonicEntity.findFirst({
    where: { tenantId, code },
    select: { id: true }
  });

  if (existingEntity) {
    throw new Error("Ja existe uma entidade com este codigo neste tenant.");
  }
}

async function assertUniqueAccountCode(tenantId: string, code: string) {
  const existingAccount = await prisma.financialAccount.findFirst({
    where: { tenantId, code },
    select: { id: true }
  });

  if (existingAccount) {
    throw new Error("Ja existe um caixa com este codigo neste tenant.");
  }
}

async function assertEntityBelongsToTenant(entityId: string, tenantId: string) {
  const entity = await prisma.masonicEntity.findFirst({
    where: {
      id: entityId,
      tenantId,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (!entity) {
    throw new Error("Entidade invalida para este tenant.");
  }
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

function validateAccountScope(parsed: z.infer<typeof accountSchema>) {
  if (parsed.kind === "GENERAL" && (parsed.entityId || parsed.branchId)) {
    throw new Error("Caixa geral nao deve ser vinculado a entidade ou filial.");
  }

  if (parsed.kind === "ENTITY" && (!parsed.entityId || parsed.branchId)) {
    throw new Error("Caixa de entidade precisa apenas de uma entidade vinculada.");
  }

  if (parsed.kind === "BRANCH" && (!parsed.branchId || parsed.entityId)) {
    throw new Error("Caixa de filial precisa apenas de uma filial vinculada.");
  }
}

export async function createTenant(formData: FormData) {
  const context = await requirePermission("settings.update");

  if (!context.isSuperAdmin) {
    throw new Error("Apenas Super Admin pode criar tenants.");
  }

  const parsed = tenantSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    branchName: formData.get("branchName"),
    primaryEntityName: formData.get("primaryEntityName"),
    primaryEntityCode: formData.get("primaryEntityCode") || undefined
  });
  const slug = normalizeSlug(parsed.slug || parsed.name);
  const primaryEntityCode = normalizeCode(
    parsed.primaryEntityCode || parsed.primaryEntityName
  );

  if (!slug) {
    throw new Error("Informe um slug valido para o tenant.");
  }

  if (!primaryEntityCode) {
    throw new Error("Informe um codigo valido para a entidade principal.");
  }

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true }
  });

  if (existingTenant) {
    throw new Error("Ja existe um tenant com este slug.");
  }

  const currentTenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: { organizationId: true }
  });

  if (!currentTenant) {
    throw new Error("Tenant atual nao encontrado.");
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        organizationId: currentTenant.organizationId,
        name: parsed.name.trim(),
        slug
      }
    });
    const branch = await tx.branch.create({
      data: {
        tenantId: createdTenant.id,
        name: parsed.branchName.trim(),
        code: "MATRIZ",
        status: "ACTIVE"
      }
    });
    const entity = await tx.masonicEntity.create({
      data: {
        tenantId: createdTenant.id,
        name: parsed.primaryEntityName.trim(),
        code: primaryEntityCode,
        kind: "LODGE",
        isRequired: true,
        status: "ACTIVE"
      }
    });

    await tx.financialAccount.createMany({
      data: [
        {
          tenantId: createdTenant.id,
          name: "Caixa Geral",
          code: "CAIXA_GERAL",
          kind: "GENERAL",
          status: "ACTIVE"
        },
        {
          tenantId: createdTenant.id,
          entityId: entity.id,
          name: `Caixa da ${entity.name}`,
          code: `CAIXA_${primaryEntityCode}`,
          kind: "ENTITY",
          status: "ACTIVE"
        }
      ]
    });

    await tx.financialCategory.createMany({
      data: defaultCategories.map((category) => ({
        tenantId: createdTenant.id,
        name: category.name,
        type: category.type,
        status: "ACTIVE"
      }))
    });

    return { branch, entity, tenant: createdTenant };
  });

  await auditLog({
    tenantId: tenant.tenant.id,
    userId: context.profileId,
    action: "settings.tenant.create",
    entityType: "tenants",
    entityId: tenant.tenant.id,
    payload: {
      name: tenant.tenant.name,
      slug: tenant.tenant.slug,
      branchId: tenant.branch.id,
      primaryEntityId: tenant.entity.id
    }
  });

  revalidatePath("/configuracoes");
}

export async function createEntity(formData: FormData) {
  const context = await requirePermission("settings.update");
  const parsed = entitySchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    kind: formData.get("kind"),
    description: formData.get("description") || undefined
  });

  const code = normalizeCode(parsed.code || parsed.name);
  if (!code) {
    throw new Error("Informe um codigo valido para a entidade.");
  }

  await assertUniqueEntityCode(context.tenantId, code);

  const entity = await prisma.masonicEntity.create({
    data: {
      tenantId: context.tenantId,
      name: parsed.name.trim(),
      code,
      kind: parsed.kind,
      description: parsed.description?.trim() || null
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "settings.entity.create",
    entityType: "masonic_entities",
    entityId: entity.id,
    payload: { name: entity.name, code: entity.code, kind: entity.kind }
  });

  revalidatePath("/configuracoes");
}

export async function createFinancialAccount(formData: FormData) {
  const context = await requirePermission("settings.update");
  const parsed = accountSchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    kind: formData.get("kind"),
    entityId: formData.get("entityId") || "",
    branchId: formData.get("branchId") || ""
  });
  const code = normalizeCode(parsed.code || parsed.name);
  if (!code) {
    throw new Error("Informe um codigo valido para o caixa.");
  }

  validateAccountScope(parsed);
  await assertUniqueAccountCode(context.tenantId, code);

  if (parsed.entityId) {
    await assertEntityBelongsToTenant(parsed.entityId, context.tenantId);
  }

  if (parsed.branchId) {
    await assertBranchBelongsToTenant(parsed.branchId, context.tenantId);
  }

  const account = await prisma.financialAccount.create({
    data: {
      tenantId: context.tenantId,
      name: parsed.name.trim(),
      code,
      kind: parsed.kind,
      entityId: parsed.entityId || null,
      branchId: parsed.branchId || null
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "settings.financial_account.create",
    entityType: "financial_accounts",
    entityId: account.id,
    payload: {
      name: account.name,
      code: account.code,
      kind: account.kind,
      entityId: account.entityId
    }
  });

  revalidatePath("/configuracoes");
}
