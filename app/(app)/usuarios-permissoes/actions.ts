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

const roleUpdateSchema = z.object({
  profileId: z.string().uuid(),
  roleId: z.string().uuid(),
  branchId: optionalUuid
});

const statusUpdateSchema = z.object({
  profileId: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
});

const passwordResetSchema = z.object({
  profileId: z.string().uuid(),
  password: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres.")
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

async function assertProfileBelongsToTenant(profileId: string, tenantId: string) {
  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      tenantId
    },
    select: {
      authUserId: true,
      email: true,
      id: true,
      name: true,
      status: true
    }
  });

  if (!profile) {
    throw new Error("Usuario invalido para este tenant.");
  }

  return profile;
}

async function assertCanManageProfile(input: {
  actorIsSuperAdmin: boolean;
  profileId: string;
  tenantId: string;
}) {
  const targetSuperAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: input.profileId,
      OR: [{ tenantId: input.tenantId }, { tenantId: null }],
      role: { key: "SUPER_ADMIN" }
    },
    select: { id: true }
  });

  if (targetSuperAdminRole && !input.actorIsSuperAdmin) {
    throw new Error("Apenas Super Admin pode administrar outro Super Admin.");
  }
}

async function assertRoleCanBeGranted(roleId: string, isSuperAdmin: boolean) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, key: true, name: true }
  });

  if (!role) {
    throw new Error("Papel invalido.");
  }

  if (role.key === "SUPER_ADMIN" && !isSuperAdmin) {
    throw new Error("Apenas Super Admin pode conceder papel Super Admin.");
  }

  return role;
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

export async function updateTenantUserRole(formData: FormData) {
  const context = await requirePermission("users.update_roles");
  const parsed = roleUpdateSchema.parse({
    profileId: formData.get("profileId"),
    roleId: formData.get("roleId"),
    branchId: formData.get("branchId") || ""
  });
  const [profile, role] = await Promise.all([
    assertProfileBelongsToTenant(parsed.profileId, context.tenantId),
    assertRoleCanBeGranted(parsed.roleId, context.isSuperAdmin)
  ]);

  if (profile.id === context.profileId) {
    throw new Error("Voce nao pode alterar o proprio papel.");
  }

  await assertCanManageProfile({
    actorIsSuperAdmin: context.isSuperAdmin,
    profileId: profile.id,
    tenantId: context.tenantId
  });

  if (parsed.branchId) {
    await assertBranchBelongsToTenant(parsed.branchId, context.tenantId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({
      where: {
        tenantId: context.tenantId,
        userId: profile.id
      }
    });

    await tx.userRole.create({
      data: {
        tenantId: context.tenantId,
        userId: profile.id,
        roleId: role.id,
        branchId: parsed.branchId || context.branchId
      }
    });

    await tx.profile.update({
      where: { id: profile.id },
      data: {
        branchId: parsed.branchId || context.branchId
      }
    });
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "users.role.update",
    entityType: "profiles",
    entityId: profile.id,
    payload: {
      email: profile.email,
      role: role.key,
      branchId: parsed.branchId || context.branchId
    }
  });

  revalidatePath("/usuarios-permissoes");
}

export async function updateTenantUserStatus(formData: FormData) {
  const context = await requirePermission("users.update_roles");
  const parsed = statusUpdateSchema.parse({
    profileId: formData.get("profileId"),
    status: formData.get("status")
  });
  const profile = await assertProfileBelongsToTenant(
    parsed.profileId,
    context.tenantId
  );

  await assertCanManageProfile({
    actorIsSuperAdmin: context.isSuperAdmin,
    profileId: profile.id,
    tenantId: context.tenantId
  });

  if (profile.id === context.profileId && parsed.status !== "ACTIVE") {
    throw new Error("Voce nao pode inativar o proprio usuario.");
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      status: parsed.status
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "users.status.update",
    entityType: "profiles",
    entityId: profile.id,
    payload: {
      email: profile.email,
      status: updated.status
    }
  });

  revalidatePath("/usuarios-permissoes");
}

export async function resetTenantUserPassword(formData: FormData) {
  const context = await requirePermission("users.update_roles");
  const parsed = passwordResetSchema.parse({
    profileId: formData.get("profileId"),
    password: formData.get("password")
  });
  const profile = await assertProfileBelongsToTenant(
    parsed.profileId,
    context.tenantId
  );

  await assertCanManageProfile({
    actorIsSuperAdmin: context.isSuperAdmin,
    profileId: profile.id,
    tenantId: context.tenantId
  });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(profile.authUserId, {
    password: parsed.password
  });

  if (error) {
    throw error;
  }

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "users.password.reset",
    entityType: "profiles",
    entityId: profile.id,
    payload: {
      email: profile.email
    }
  });

  revalidatePath("/usuarios-permissoes");
}
