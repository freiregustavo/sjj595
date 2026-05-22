import { PrismaClient } from "@prisma/client";
import {
  permissionKeys,
  roleKeys,
  type PermissionKey,
  type RoleKey
} from "../lib/permissions/roles";

const prisma = new PrismaClient();

const roleNames: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ENTITY_ADMIN: "Admin da Entidade",
  TREASURER: "Tesoureiro",
  SECRETARY: "Secretario",
  STOCK_MANAGER: "Estoquista",
  VIEWER: "Visualizador"
};

const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: [...permissionKeys],
  ENTITY_ADMIN: permissionKeys.filter((key) => key !== "audit.read"),
  TREASURER: [
    "finance.read",
    "finance.create",
    "finance.update",
    "finance.approve",
    "documents.read",
    "reports.read"
  ],
  SECRETARY: [
    "members.read",
    "members.create",
    "members.update",
    "documents.read",
    "documents.upload",
    "reports.read"
  ],
  STOCK_MANAGER: [
    "inventory.read",
    "inventory.create",
    "inventory.update",
    "inventory.transfer",
    "reports.read"
  ],
  VIEWER: [
    "members.read",
    "finance.read",
    "inventory.read",
    "documents.read",
    "reports.read"
  ]
};

async function main() {
  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {
          module: key.split(".")[0]
        },
        create: {
          key,
          module: key.split(".")[0]
        }
      })
    )
  );

  const permissionByKey = new Map(
    permissions.map((permission) => [permission.key, permission])
  );

  for (const key of roleKeys) {
    const role = await prisma.role.upsert({
      where: { key },
      update: {
        name: roleNames[key],
        scope: key === "SUPER_ADMIN" ? "global" : "tenant"
      },
      create: {
        key,
        name: roleNames[key],
        scope: key === "SUPER_ADMIN" ? "global" : "tenant"
      }
    });

    for (const permissionKey of rolePermissions[key]) {
      const permission = permissionByKey.get(permissionKey);

      if (!permission) {
        throw new Error(`Permission not found: ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }
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
