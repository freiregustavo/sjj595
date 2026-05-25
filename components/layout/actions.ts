"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";

const tenantSchema = z.object({
  tenantId: z.string().uuid()
});

export async function switchTenant(formData: FormData) {
  const context = await requirePermission("settings.update");

  if (!context.isSuperAdmin) {
    throw new Error("Apenas Super Admin pode trocar o tenant ativo.");
  }

  const parsed = tenantSchema.parse({
    tenantId: formData.get("tenantId")
  });
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: parsed.tenantId,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (!tenant) {
    throw new Error("Tenant invalido.");
  }

  const cookieStore = await cookies();
  cookieStore.set("active_tenant_id", tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  revalidatePath("/", "layout");
}
