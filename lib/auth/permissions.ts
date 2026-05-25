import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { getCurrentSession } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/roles";

export type AuthorizedContext = {
  authUserId: string;
  profileId: string;
  tenantId: string;
  branchId: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
};

export async function getAuthorizedContext(): Promise<AuthorizedContext> {
  const session = await getCurrentSession();

  if (!session.profile?.tenant?.id) {
    redirect("/login");
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.profile.id,
      OR: [{ tenantId: session.profile.tenant.id }, { tenantId: null }]
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  const roles = userRoles.map((userRole) => userRole.role.key);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const permissions = Array.from(
    new Set(
      userRoles.flatMap((userRole) =>
        userRole.role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.key
        )
      )
    )
  );

  return {
    authUserId: session.authUserId,
    profileId: session.profile.id,
    tenantId: session.profile.tenant.id,
    branchId: session.profile.branch?.id ?? null,
    roles,
    permissions,
    isSuperAdmin
  };
}

export async function requirePermission(permission: PermissionKey) {
  const context = await getAuthorizedContext();

  if (!context.isSuperAdmin && !context.permissions.includes(permission)) {
    redirect("/acesso-negado");
  }

  return context;
}
