export const roleKeys = [
  "SUPER_ADMIN",
  "ENTITY_ADMIN",
  "TREASURER",
  "SECRETARY",
  "STOCK_MANAGER",
  "VIEWER"
] as const;

export type RoleKey = (typeof roleKeys)[number];

export const permissionKeys = [
  "members.read",
  "members.create",
  "members.update",
  "members.delete",
  "finance.read",
  "finance.create",
  "finance.update",
  "finance.delete",
  "finance.approve",
  "inventory.read",
  "inventory.create",
  "inventory.update",
  "inventory.transfer",
  "documents.read",
  "documents.upload",
  "documents.delete",
  "users.read",
  "users.invite",
  "users.update_roles",
  "reports.read",
  "settings.update",
  "audit.read"
] as const;

export type PermissionKey = (typeof permissionKeys)[number];
