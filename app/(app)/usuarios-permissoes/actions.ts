"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));

const userSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(8, "A senha inicial deve ter ao menos 8 caracteres."),
  roleId: z.string().uuid("Informe o papel."),
  branchId: optionalUuid
});

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

async function resolveAuthUserId(input: {
  email: string;
  name: string;
  password: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name }
  });

  if (!error && data.user?.id) {
    return data.user.id;
  }

  if (!error || !error.message.toLowerCase().includes("already")) {
    throw error ?? new Error("Nao foi possivel criar o usuario no Supabase.");
  }

  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const authUserId = users.users.find((user) => user.email === input.email)?.id;

  if (!authUserId) {
    throw new Error("Usuario ja existe, mas nao foi localizado no Supabase.");
  }

  return authUserId;
}

export async function createTenantUser(formData: FormData) {
  const context = await requirePermission("users.invite");
  const parsed = userSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
    branchId: formData.get("branchId") || ""
  });
  const role = await prisma.role.findUnique({
    where: { id: parsed.roleId },
    select: { id: true, key: true }
  });

  if (!role) {
    throw new Error("Papel invalido.");
  }

  if (role.key === "SUPER_ADMIN" && !context.isSuperAdmin) {
    throw new Error("Apenas Super Admin pode conceder papel Super Admin.");
  }

  if (parsed.branchId) {
    await assertBranchBelongsToTenant(parsed.branchId, context.tenantId);
  }

  const email = parsed.email.trim().toLowerCase();
  const name = parsed.name.trim();
  const authUserId = await resolveAuthUserId({
    email,
    name,
    password: parsed.password
  });

  const profile = await prisma.$transaction(async (tx) => {
    const upsertedProfile = await tx.profile.upsert({
      where: { authUserId },
      update: {
        tenantId: context.tenantId,
        branchId: parsed.branchId || context.branchId,
        name,
        email,
        status: "ACTIVE"
      },
      create: {
        authUserId,
        tenantId: context.tenantId,
        branchId: parsed.branchId || context.branchId,
        name,
        email,
        status: "ACTIVE"
      }
    });

    const existingUserRole = await tx.userRole.findFirst({
      where: {
        tenantId: context.tenantId,
        userId: upsertedProfile.id,
        roleId: role.id,
        branchId: parsed.branchId || context.branchId
      }
    });

    if (!existingUserRole) {
      await tx.userRole.create({
        data: {
          tenantId: context.tenantId,
          userId: upsertedProfile.id,
          roleId: role.id,
          branchId: parsed.branchId || context.branchId
        }
      });
    }

    return upsertedProfile;
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "users.create",
    entityType: "profiles",
    entityId: profile.id,
    payload: {
      email,
      role: role.key,
      branchId: parsed.branchId || context.branchId
    }
  });

  revalidatePath("/usuarios-permissoes");
}
