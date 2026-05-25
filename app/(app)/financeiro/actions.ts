"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));

const receivableSchema = z.object({
  description: z.string().min(2, "Informe a descricao."),
  amount: z.string().min(1, "Informe o valor."),
  dueDate: z.string().min(1, "Informe o vencimento."),
  memberId: optionalUuid,
  categoryId: optionalUuid,
  accountId: optionalUuid,
  entityId: optionalUuid,
  branchId: optionalUuid
});

const payableSchema = z.object({
  description: z.string().min(2, "Informe a descricao."),
  supplierName: z.string().optional(),
  amount: z.string().min(1, "Informe o valor."),
  dueDate: z.string().min(1, "Informe o vencimento."),
  categoryId: optionalUuid,
  accountId: optionalUuid,
  entityId: optionalUuid,
  branchId: optionalUuid
});

const cashMovementSchema = z.object({
  description: z.string().optional(),
  amount: z.string().min(1, "Informe o valor."),
  movementDate: z.string().min(1, "Informe a data."),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: optionalUuid,
  entityId: optionalUuid,
  branchId: optionalUuid
});

const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  type: z.enum(["INCOME", "EXPENSE"])
});

const idSchema = z.object({
  id: z.string().uuid(),
  accountId: optionalUuid,
  paidAt: z.string().min(1, "Informe a data da baixa.")
});

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseAmount(value: string) {
  const rawValue = value.trim();
  const normalized = rawValue.includes(",")
    ? rawValue.replace(/\./g, "").replace(",", ".")
    : rawValue;
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  return normalized;
}

async function resolveSettlementAccount(input: {
  tenantId: string;
  currentAccountId: string | null;
  submittedAccountId?: string;
  currentBranchId: string | null;
  currentEntityId: string | null;
}) {
  const accountId = input.submittedAccountId || input.currentAccountId;

  if (!accountId) {
    throw new Error("Informe o caixa para baixar esta conta.");
  }

  if (
    input.currentAccountId &&
    input.submittedAccountId &&
    input.currentAccountId !== input.submittedAccountId
  ) {
    throw new Error("A conta ja possui outro caixa vinculado.");
  }

  const account = await prisma.financialAccount.findFirst({
    where: {
      id: accountId,
      tenantId: input.tenantId,
      status: "ACTIVE"
    },
    select: {
      id: true,
      branchId: true,
      entityId: true
    }
  });

  if (!account) {
    throw new Error("Caixa invalido para este tenant.");
  }

  if (
    account.branchId &&
    input.currentBranchId &&
    account.branchId !== input.currentBranchId
  ) {
    throw new Error("O caixa selecionado pertence a outra filial.");
  }

  if (
    account.entityId &&
    input.currentEntityId &&
    account.entityId !== input.currentEntityId
  ) {
    throw new Error("O caixa selecionado pertence a outra entidade.");
  }

  return {
    accountId: account.id,
    branchId: input.currentBranchId || account.branchId,
    entityId: input.currentEntityId || account.entityId
  };
}

async function assertUniqueCategory(input: {
  tenantId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}) {
  const existingCategory = await prisma.financialCategory.findFirst({
    where: {
      tenantId: input.tenantId,
      name: {
        equals: input.name,
        mode: "insensitive"
      },
      type: input.type,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  return existingCategory;
}

async function assertRecordBelongsToTenant(
  model:
    | "branch"
    | "masonicEntity"
    | "financialAccount"
    | "member"
    | "financialCategory",
  id: string,
  tenantId: string
) {
  const where = { id, tenantId };
  const select = { id: true };
  let record: { id: string } | null = null;

  switch (model) {
    case "branch":
      record = await prisma.branch.findFirst({ where, select });
      break;
    case "masonicEntity":
      record = await prisma.masonicEntity.findFirst({ where, select });
      break;
    case "financialAccount":
      record = await prisma.financialAccount.findFirst({ where, select });
      break;
    case "member":
      record = await prisma.member.findFirst({ where, select });
      break;
    case "financialCategory":
      record = await prisma.financialCategory.findFirst({ where, select });
      break;
  }

  if (!record) {
    throw new Error("Registro invalido para este tenant.");
  }
}

async function resolveFinancialScope(input: {
  tenantId: string;
  contextBranchId: string | null;
  branchId?: string;
  entityId?: string;
  accountId?: string;
  memberId?: string;
  categoryId?: string;
}) {
  const account = input.accountId
    ? await prisma.financialAccount.findFirst({
        where: {
          id: input.accountId,
          tenantId: input.tenantId,
          status: "ACTIVE"
        },
        select: {
          id: true,
          branchId: true,
          entityId: true
        }
      })
    : null;

  if (input.accountId && !account) {
    throw new Error("Caixa invalido para este tenant.");
  }

  if (account?.entityId && input.entityId && account.entityId !== input.entityId) {
    throw new Error("O caixa selecionado pertence a outra entidade.");
  }

  if (account?.branchId && input.branchId && account.branchId !== input.branchId) {
    throw new Error("O caixa selecionado pertence a outra filial.");
  }

  const entityId = input.entityId || account?.entityId || null;
  const branchId = input.branchId || account?.branchId || input.contextBranchId;

  await Promise.all([
    input.branchId
      ? assertRecordBelongsToTenant("branch", input.branchId, input.tenantId)
      : Promise.resolve(),
    input.entityId
      ? assertRecordBelongsToTenant(
          "masonicEntity",
          input.entityId,
          input.tenantId
        )
      : Promise.resolve(),
    input.accountId
      ? assertRecordBelongsToTenant(
          "financialAccount",
          input.accountId,
          input.tenantId
        )
      : Promise.resolve(),
    input.memberId
      ? assertRecordBelongsToTenant("member", input.memberId, input.tenantId)
      : Promise.resolve(),
    input.categoryId
      ? assertRecordBelongsToTenant(
          "financialCategory",
          input.categoryId,
          input.tenantId
        )
      : Promise.resolve()
  ]);

  return {
    accountId: account?.id ?? null,
    branchId,
    entityId
  };
}

export async function createFinancialCategory(formData: FormData) {
  const context = await requirePermission("finance.create");
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    type: formData.get("type")
  });
  const name = parsed.name.trim();

  const existingCategory = await assertUniqueCategory({
    tenantId: context.tenantId,
    name,
    type: parsed.type
  });

  if (existingCategory) {
    revalidatePath("/financeiro");
    return;
  }

  const category = await prisma.financialCategory.create({
    data: {
      tenantId: context.tenantId,
      name,
      type: parsed.type,
      status: "ACTIVE"
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.category.create",
    entityType: "financial_categories",
    entityId: category.id,
    payload: {
      name: category.name,
      type: category.type
    }
  });

  revalidatePath("/financeiro");
}

export async function createReceivable(formData: FormData) {
  const context = await requirePermission("finance.create");
  const parsed = receivableSchema.parse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    memberId: formData.get("memberId") || "",
    categoryId: formData.get("categoryId") || "",
    accountId: formData.get("accountId") || "",
    entityId: formData.get("entityId") || "",
    branchId: formData.get("branchId") || ""
  });

  const scope = await resolveFinancialScope({
    tenantId: context.tenantId,
    contextBranchId: context.branchId,
    branchId: parsed.branchId || undefined,
    entityId: parsed.entityId || undefined,
    accountId: parsed.accountId || undefined,
    memberId: parsed.memberId || undefined,
    categoryId: parsed.categoryId || undefined
  });

  const receivable = await prisma.receivable.create({
    data: {
      tenantId: context.tenantId,
      branchId: scope.branchId,
      entityId: scope.entityId,
      accountId: scope.accountId,
      memberId: parsed.memberId || null,
      categoryId: parsed.categoryId || null,
      description: parsed.description.trim(),
      amount: parseAmount(parsed.amount),
      dueDate: parseDate(parsed.dueDate),
      status: "OPEN",
      createdBy: context.profileId
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.receivable.create",
    entityType: "receivables",
    entityId: receivable.id,
    payload: {
      description: receivable.description,
      amount: receivable.amount.toString()
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function receiveReceivable(formData: FormData) {
  const context = await requirePermission("finance.approve");
  const parsed = idSchema.parse({
    id: formData.get("id"),
    accountId: formData.get("accountId") || "",
    paidAt: formData.get("paidAt")
  });

  const receivable = await prisma.receivable.findFirst({
    where: {
      id: parsed.id,
      tenantId: context.tenantId
    }
  });

  if (!receivable) {
    throw new Error("Conta a receber nao encontrada neste tenant.");
  }

  if (receivable.status !== "OPEN" && receivable.status !== "OVERDUE") {
    throw new Error("Conta a receber nao esta aberta para baixa.");
  }

  const scope = await resolveSettlementAccount({
    tenantId: context.tenantId,
    currentAccountId: receivable.accountId,
    submittedAccountId: parsed.accountId || undefined,
    currentBranchId: receivable.branchId,
    currentEntityId: receivable.entityId
  });
  const paidAt = parseDate(parsed.paidAt);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.receivable.update({
      where: { id: receivable.id },
      data: {
        accountId: scope.accountId,
        branchId: scope.branchId,
        entityId: scope.entityId,
        status: "PAID",
        paidAt
      }
    });

    const movement = await tx.cashMovement.create({
      data: {
        tenantId: receivable.tenantId,
        branchId: scope.branchId,
        entityId: scope.entityId,
        accountId: scope.accountId,
        type: "INCOME",
        source: "RECEIVABLE",
        referenceId: receivable.id,
        amount: receivable.amount,
        description: receivable.description,
        movementDate: paidAt,
        createdBy: context.profileId
      }
    });

    return { movement, receivable: updated };
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.receivable.receive",
    entityType: "receivables",
    entityId: result.receivable.id,
    payload: {
      movementId: result.movement.id,
      amount: result.receivable.amount.toString()
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function createPayable(formData: FormData) {
  const context = await requirePermission("finance.create");
  const parsed = payableSchema.parse({
    description: formData.get("description"),
    supplierName: formData.get("supplierName") || undefined,
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    categoryId: formData.get("categoryId") || "",
    accountId: formData.get("accountId") || "",
    entityId: formData.get("entityId") || "",
    branchId: formData.get("branchId") || ""
  });

  const scope = await resolveFinancialScope({
    tenantId: context.tenantId,
    contextBranchId: context.branchId,
    branchId: parsed.branchId || undefined,
    entityId: parsed.entityId || undefined,
    accountId: parsed.accountId || undefined,
    categoryId: parsed.categoryId || undefined
  });

  const payable = await prisma.payable.create({
    data: {
      tenantId: context.tenantId,
      branchId: scope.branchId,
      entityId: scope.entityId,
      accountId: scope.accountId,
      categoryId: parsed.categoryId || null,
      supplierName: parsed.supplierName?.trim() || null,
      description: parsed.description.trim(),
      amount: parseAmount(parsed.amount),
      dueDate: parseDate(parsed.dueDate),
      status: "OPEN",
      createdBy: context.profileId
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.payable.create",
    entityType: "payables",
    entityId: payable.id,
    payload: {
      description: payable.description,
      amount: payable.amount.toString()
    }
  });

  revalidatePath("/financeiro");
}

export async function payPayable(formData: FormData) {
  const context = await requirePermission("finance.approve");
  const parsed = idSchema.parse({
    id: formData.get("id"),
    accountId: formData.get("accountId") || "",
    paidAt: formData.get("paidAt")
  });

  const payable = await prisma.payable.findFirst({
    where: {
      id: parsed.id,
      tenantId: context.tenantId
    }
  });

  if (!payable) {
    throw new Error("Conta a pagar nao encontrada neste tenant.");
  }

  if (payable.status !== "OPEN" && payable.status !== "OVERDUE") {
    throw new Error("Conta a pagar nao esta aberta para baixa.");
  }

  const scope = await resolveSettlementAccount({
    tenantId: context.tenantId,
    currentAccountId: payable.accountId,
    submittedAccountId: parsed.accountId || undefined,
    currentBranchId: payable.branchId,
    currentEntityId: payable.entityId
  });
  const paidAt = parseDate(parsed.paidAt);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payable.update({
      where: { id: payable.id },
      data: {
        accountId: scope.accountId,
        branchId: scope.branchId,
        entityId: scope.entityId,
        status: "PAID",
        paidAt
      }
    });

    const movement = await tx.cashMovement.create({
      data: {
        tenantId: payable.tenantId,
        branchId: scope.branchId,
        entityId: scope.entityId,
        accountId: scope.accountId,
        type: "EXPENSE",
        source: "PAYABLE",
        referenceId: payable.id,
        amount: payable.amount,
        description: payable.description,
        movementDate: paidAt,
        createdBy: context.profileId
      }
    });

    return { movement, payable: updated };
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.payable.pay",
    entityType: "payables",
    entityId: result.payable.id,
    payload: {
      movementId: result.movement.id,
      amount: result.payable.amount.toString()
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function createCashMovement(formData: FormData) {
  const context = await requirePermission("finance.create");
  const parsed = cashMovementSchema.parse({
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    movementDate: formData.get("movementDate"),
    type: formData.get("type"),
    accountId: formData.get("accountId") || "",
    entityId: formData.get("entityId") || "",
    branchId: formData.get("branchId") || ""
  });

  const scope = await resolveFinancialScope({
    tenantId: context.tenantId,
    contextBranchId: context.branchId,
    branchId: parsed.branchId || undefined,
    entityId: parsed.entityId || undefined,
    accountId: parsed.accountId || undefined
  });

  const movement = await prisma.cashMovement.create({
    data: {
      tenantId: context.tenantId,
      branchId: scope.branchId,
      entityId: scope.entityId,
      accountId: scope.accountId,
      type: parsed.type,
      source: "MANUAL",
      amount: parseAmount(parsed.amount),
      description: parsed.description?.trim() || null,
      movementDate: parseDate(parsed.movementDate),
      createdBy: context.profileId
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "finance.cash_movement.create",
    entityType: "cash_movements",
    entityId: movement.id,
    payload: {
      type: movement.type,
      amount: movement.amount.toString()
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}
