import { prisma } from "@/lib/prisma/client";

export type TenantContext = {
  authUserId: string;
  profileId: string;
  tenantId: string;
  branchId: string | null;
  isSuperAdmin: boolean;
};

export async function getTenantContext(authUserId: string): Promise<TenantContext> {
  const profile = await prisma.profile.findUnique({
    where: { authUserId },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  if (!profile || profile.status !== "ACTIVE") {
    throw new Error("User profile is inactive or missing.");
  }

  const isSuperAdmin = profile.userRoles.some(
    (userRole) => userRole.role.key === "SUPER_ADMIN"
  );

  if (!profile.tenantId && !isSuperAdmin) {
    throw new Error("User profile is not associated with a tenant.");
  }

  return {
    authUserId,
    profileId: profile.id,
    tenantId: profile.tenantId ?? "",
    branchId: profile.branchId,
    isSuperAdmin
  };
}

export function requireTenantId(context: TenantContext) {
  if (!context.tenantId && !context.isSuperAdmin) {
    throw new Error("Tenant context is required.");
  }

  return context.tenantId;
}
