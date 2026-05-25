import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const requestedTenantId = cookieStore.get("active_tenant_id")?.value;
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.profile.id
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
  const tenant = isSuperAdmin
    ? await prisma.tenant.findFirst({
        where: {
          id: requestedTenantId ?? session.profile.tenant.id,
          status: "ACTIVE"
        },
        include: {
          branches: {
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            take: 1
          }
        }
      })
    : null;
  const activeTenantId = tenant?.id ?? session.profile.tenant.id;
  const activeBranchId =
    session.profile.branch?.id && session.profile.tenant.id === activeTenantId
      ? session.profile.branch.id
      : tenant?.branches[0]?.id ?? null;
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
    tenantId: activeTenantId,
    branchId: activeBranchId,
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
