import {
  Boxes,
  FileText,
  Gauge,
  Landmark,
  LogOut,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { switchTenant } from "@/components/layout/actions";
import { getAuthorizedContext } from "@/lib/auth/permissions";
import { getCurrentSession } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/roles";
import { prisma } from "@/lib/prisma/client";
import { SidebarNav, type SidebarNavItem } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Gauge,
    permission: "reports.read"
  },
  {
    href: "/membros",
    label: "Membros",
    icon: Users,
    permission: "members.read",
    children: [
      { href: "/membros#cadastro", label: "Cadastro" },
      { href: "/membros#novo", label: "Novo membro" }
    ]
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Landmark,
    permission: "finance.read",
    children: [
      { href: "/financeiro#contas-a-receber", label: "Contas a Receber" },
      { href: "/financeiro#contas-a-pagar", label: "Contas a Pagar" },
      { href: "/financeiro#relatorios", label: "Relatorios" }
    ]
  },
  {
    href: "/estoque",
    label: "Estoque",
    icon: Boxes,
    permission: "inventory.read",
    children: [
      { href: "/estoque#itens", label: "Itens" },
      { href: "/estoque#movimentos", label: "Movimentos" },
      { href: "/estoque#saldos", label: "Saldos" }
    ]
  },
  {
    href: "/documentos",
    label: "Documentos",
    icon: FileText,
    permission: "documents.read",
    children: [
      { href: "/documentos#arquivos", label: "Arquivos" },
      { href: "/documentos#categorias", label: "Categorias" }
    ]
  },
  {
    href: "/configuracoes",
    label: "Configuracoes",
    icon: Settings,
    permission: "settings.update",
    children: [
      { href: "/configuracoes#loja", label: "Loja" },
      { href: "/configuracoes#tenants", label: "Tenants" },
      { href: "/configuracoes#entidades", label: "Entidades" },
      { href: "/configuracoes#caixas", label: "Caixas" }
    ]
  },
  {
    href: "/usuarios-permissoes",
    label: "Usuarios",
    icon: ShieldCheck,
    permission: "users.read",
    children: [
      { href: "/usuarios-permissoes#usuarios", label: "Usuarios" },
      { href: "/usuarios-permissoes#novo", label: "Novo acesso" },
      { href: "/usuarios-permissoes#permissoes", label: "Permissoes" }
    ]
  }
] satisfies {
  href: string;
  label: string;
  icon: SidebarNavItem["icon"];
  permission: PermissionKey;
  children?: {
    href: string;
    label: string;
  }[];
}[];

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

export async function AppShell({ children, title }: AppShellProps) {
  const [session, context] = await Promise.all([
    getCurrentSession(),
    getAuthorizedContext()
  ]);
  const profile = session.profile;
  const [activeTenant, activeBranch, tenants] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: context.tenantId },
      select: { id: true, name: true }
    }),
    context.branchId
      ? prisma.branch.findUnique({
          where: { id: context.branchId },
          select: { name: true }
        })
      : Promise.resolve(null),
    context.isSuperAdmin
      ? prisma.tenant.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true }
        })
      : Promise.resolve([])
  ]);
  const tenantName = activeTenant?.name ?? "Perfil sem loja";
  const branchName = activeBranch?.name ?? "Sem filial";
  const userRoles = profile?.tenant?.id
    ? await prisma.userRole.findMany({
        where: {
          userId: profile.id,
          OR: [{ tenantId: profile.tenant.id }, { tenantId: null }]
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
      })
    : [];
  const isSuperAdmin = userRoles.some(
    (userRole) => userRole.role.key === "SUPER_ADMIN"
  );
  const permissions = new Set(
    userRoles.flatMap((userRole) =>
      userRole.role.rolePermissions.map(
        (rolePermission) => rolePermission.permission.key
      )
    )
  );
  const visibleNavItems = navItems.filter(
    (item) => isSuperAdmin || permissions.has(item.permission)
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-surface/95 shadow-[var(--shadow-soft)] backdrop-blur md:block">
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              S
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-foreground">
                SJJ595
              </p>
              <p className="mt-1 truncate text-sm text-muted">{tenantName}</p>
            </div>
          </div>
        </div>
        <SidebarNav items={visibleNavItems} />
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="mt-1 text-xs text-muted">
                {tenantName} / {branchName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {context.isSuperAdmin ? (
                <form action={switchTenant} className="flex items-center gap-2">
                  <select
                    name="tenantId"
                    defaultValue={context.tenantId}
                    className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  <button className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-background">
                    Trocar
                  </button>
                </form>
              ) : null}
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">
                  {profile?.name ?? session.email}
                </span>
                <span className="text-muted">
                  {tenantName} / {branchName}
                </span>
              </div>
              <ThemeToggle />
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm hover:bg-background"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="border-b border-border bg-surface/95 md:hidden">
          <SidebarNav items={visibleNavItems} />
        </div>
        <main className="p-5 lg:p-6">
          {!profile ? (
            <section className="rounded-md border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
              Seu usuario esta autenticado, mas ainda nao possui profile ativo
              vinculado a uma loja.
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
