import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentSession = {
  authUserId: string;
  email: string;
  profile: {
    id: string;
    name: string;
    email: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
    branch: {
      id: string;
      name: string;
      code: string | null;
    } | null;
    roles: string[];
  } | null;
};

export async function getCurrentSession(): Promise<CurrentSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: {
      authUserId: user.id
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      userRoles: {
        include: {
          role: {
            select: {
              key: true
            }
          }
        }
      }
    }
  });

  return {
    authUserId: user.id,
    email: user.email ?? "",
    profile: profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          tenant: profile.tenant,
          branch: profile.branch,
          roles: profile.userRoles.map((userRole) => userRole.role.key)
        }
      : null
  };
}
