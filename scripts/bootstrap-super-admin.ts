import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requireEnv("SUPER_ADMIN_EMAIL");
  const password = requireEnv("SUPER_ADMIN_PASSWORD");
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const organizationName = requireEnv("BOOTSTRAP_ORGANIZATION_NAME");
  const tenantName = requireEnv("BOOTSTRAP_TENANT_NAME");
  const tenantSlug = requireEnv("BOOTSTRAP_TENANT_SLUG");
  const branchName = process.env.BOOTSTRAP_BRANCH_NAME ?? "Matriz";
  const primaryEntityName = process.env.BOOTSTRAP_PRIMARY_ENTITY_NAME ?? tenantName;
  const primaryEntityCode = process.env.BOOTSTRAP_PRIMARY_ENTITY_CODE ?? "LOJA";
  const defaultCategories = [
    { name: "Mensalidades", type: "INCOME" as const },
    { name: "Doacoes", type: "INCOME" as const },
    { name: "Eventos", type: "INCOME" as const },
    { name: "Administrativo", type: "EXPENSE" as const },
    { name: "Manutencao", type: "EXPENSE" as const },
    { name: "Fornecedores", type: "EXPENSE" as const }
  ];

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: createdUser, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    throw error;
  }

  let authUserId = createdUser.user?.id;

  if (!authUserId) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    authUserId = users.users.find((user) => user.email === email)?.id;
  }

  if (!authUserId) {
    throw new Error("Could not resolve Supabase auth user id.");
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { key: "SUPER_ADMIN" }
  });

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role not found. Run npm run db:seed first.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingTenant = await tx.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { organization: true }
    });

    const organization =
      existingTenant?.organization ??
      (await tx.organization.create({
        data: {
          name: organizationName
        }
      }));

    const tenant =
      existingTenant ??
      (await tx.tenant.create({
        data: {
          organizationId: organization.id,
          name: tenantName,
          slug: tenantSlug
        },
        include: {
          organization: true
        }
      }));

    const branch = await tx.branch.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "MATRIZ"
        }
      },
      update: {
        name: branchName
      },
      create: {
        tenantId: tenant.id,
        name: branchName,
        code: "MATRIZ"
      }
    });

    const primaryEntity = await tx.masonicEntity.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: primaryEntityCode
        }
      },
      update: {
        name: primaryEntityName,
        kind: "LODGE",
        isRequired: true,
        status: "ACTIVE"
      },
      create: {
        tenantId: tenant.id,
        name: primaryEntityName,
        code: primaryEntityCode,
        kind: "LODGE",
        isRequired: true,
        status: "ACTIVE"
      }
    });

    const generalAccount = await tx.financialAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "CAIXA_GERAL"
        }
      },
      update: {
        name: "Caixa Geral",
        kind: "GENERAL",
        status: "ACTIVE"
      },
      create: {
        tenantId: tenant.id,
        name: "Caixa Geral",
        code: "CAIXA_GERAL",
        kind: "GENERAL",
        status: "ACTIVE"
      }
    });

    const primaryEntityAccount = await tx.financialAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: `CAIXA_${primaryEntityCode}`
        }
      },
      update: {
        entityId: primaryEntity.id,
        name: `Caixa da ${primaryEntityName}`,
        kind: "ENTITY",
        status: "ACTIVE"
      },
      create: {
        tenantId: tenant.id,
        entityId: primaryEntity.id,
        name: `Caixa da ${primaryEntityName}`,
        code: `CAIXA_${primaryEntityCode}`,
        kind: "ENTITY",
        status: "ACTIVE"
      }
    });

    for (const category of defaultCategories) {
      const existingCategory = await tx.financialCategory.findFirst({
        where: {
          tenantId: tenant.id,
          name: category.name,
          type: category.type
        }
      });

      if (existingCategory) {
        await tx.financialCategory.update({
          where: { id: existingCategory.id },
          data: { status: "ACTIVE" }
        });
      } else {
        await tx.financialCategory.create({
          data: {
            tenantId: tenant.id,
            name: category.name,
            type: category.type,
            status: "ACTIVE"
          }
        });
      }
    }

    const profile = await tx.profile.upsert({
      where: {
        authUserId
      },
      update: {
        tenantId: tenant.id,
        branchId: branch.id,
        name,
        email,
        status: "ACTIVE"
      },
      create: {
        authUserId,
        tenantId: tenant.id,
        branchId: branch.id,
        name,
        email,
        status: "ACTIVE"
      }
    });

    const existingUserRole = await tx.userRole.findFirst({
      where: {
        tenantId: tenant.id,
        userId: profile.id,
        roleId: superAdminRole.id,
        branchId: branch.id
      }
    });

    if (existingUserRole) {
      await tx.userRole.update({
        where: {
          id: existingUserRole.id
        },
        data: {
          tenantId: tenant.id,
          branchId: branch.id
        }
      });
    } else {
      await tx.userRole.create({
        data: {
          tenantId: tenant.id,
          userId: profile.id,
          roleId: superAdminRole.id,
          branchId: branch.id
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: profile.id,
        action: "bootstrap.super_admin",
        entityType: "profiles",
        entityId: profile.id,
        payload: {
          email,
          tenantSlug,
          primaryEntityId: primaryEntity.id,
          generalAccountId: generalAccount.id,
          primaryEntityAccountId: primaryEntityAccount.id
        }
      }
    });

    return {
      organization,
      tenant,
      branch,
      profile,
      primaryEntity,
      generalAccount,
      primaryEntityAccount
    };
  });

  console.log("Super admin bootstrapped:");
  console.log({
    organizationId: result.organization.id,
    tenantId: result.tenant.id,
    branchId: result.branch.id,
    primaryEntityId: result.primaryEntity.id,
    generalAccountId: result.generalAccount.id,
    primaryEntityAccountId: result.primaryEntityAccount.id,
    profileId: result.profile.id,
    email
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
