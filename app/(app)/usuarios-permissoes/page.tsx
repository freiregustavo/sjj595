import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import {
  createTenantUser,
  resetTenantUserPassword,
  updateTenantUserRole,
  updateTenantUserStatus
} from "./actions";

export default async function UsersPermissionsPage() {
  const context = await requirePermission("users.read");
  const canInvite =
    context.isSuperAdmin || context.permissions.includes("users.invite");
  const canUpdateRoles =
    context.isSuperAdmin || context.permissions.includes("users.update_roles");

  const [profiles, roles, branches] = await Promise.all([
    prisma.profile.findMany({
      where: { tenantId: context.tenantId },
      include: {
        branch: true,
        userRoles: {
          include: { role: true },
          where: {
            OR: [{ tenantId: context.tenantId }, { tenantId: null }]
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.branch.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" }
    })
  ]);
  const availableRoles = context.isSuperAdmin
    ? roles
    : roles.filter((role) => role.key !== "SUPER_ADMIN");

  return (
    <AppShell title="Usuarios e Permissoes">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <section
          id="usuarios"
          className="rounded-md border border-border bg-surface p-5"
        >
          <h2 className="text-base font-semibold text-foreground">
            Usuarios do tenant
          </h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Filial</th>
                  <th className="px-3 py-2">Papeis</th>
                  <th className="px-3 py-2">Status</th>
                  {canUpdateRoles ? <th className="px-3 py-2">Acoes</th> : null}
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {profile.name}
                    </td>
                    <td className="px-3 py-2 text-muted">{profile.email}</td>
                    <td className="px-3 py-2 text-muted">
                      {profile.branch?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {profile.userRoles.length > 0
                        ? profile.userRoles
                            .map((userRole) => userRole.role.name)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">{profile.status}</td>
                    {canUpdateRoles ? (
                      <td className="px-3 py-2">
                        <div className="grid min-w-72 gap-3">
                          <form
                            action={updateTenantUserRole}
                            className="grid gap-2"
                          >
                            <input
                              type="hidden"
                              name="profileId"
                              value={profile.id}
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                name="roleId"
                                required
                                defaultValue={profile.userRoles[0]?.roleId ?? ""}
                                className="h-8 rounded-md border border-border px-2 text-xs"
                              >
                                <option value="">Papel</option>
                                {availableRoles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="branchId"
                                defaultValue={profile.branchId ?? ""}
                                className="h-8 rounded-md border border-border px-2 text-xs"
                              >
                                <option value="">Filial atual</option>
                                {branches.map((branch) => (
                                  <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-background">
                              Atualizar papel
                            </button>
                          </form>

                          <form
                            action={updateTenantUserStatus}
                            className="grid gap-2 sm:grid-cols-[1fr_auto]"
                          >
                            <input
                              type="hidden"
                              name="profileId"
                              value={profile.id}
                            />
                            <select
                              name="status"
                              defaultValue={profile.status}
                              className="h-8 rounded-md border border-border px-2 text-xs"
                            >
                              <option value="ACTIVE">Ativo</option>
                              <option value="INACTIVE">Inativo</option>
                              <option value="SUSPENDED">Suspenso</option>
                            </select>
                            <button className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-background">
                              Status
                            </button>
                          </form>

                          <form
                            action={resetTenantUserPassword}
                            className="grid gap-2 sm:grid-cols-[1fr_auto]"
                          >
                            <input
                              type="hidden"
                              name="profileId"
                              value={profile.id}
                            />
                            <input
                              name="password"
                              required
                              type="password"
                              minLength={8}
                              placeholder="Nova senha"
                              className="h-8 rounded-md border border-border px-2 text-xs"
                            />
                            <button className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-background">
                              Resetar
                            </button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {profiles.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-muted"
                      colSpan={canUpdateRoles ? 6 : 5}
                    >
                      Nenhum usuario cadastrado neste tenant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section
          id="novo"
          className="rounded-md border border-border bg-surface p-5"
        >
          <h2 className="text-base font-semibold text-foreground">
            Novo usuario
          </h2>
          {canInvite ? (
            <form action={createTenantUser} className="mt-4 grid gap-3">
              <input
                name="name"
                required
                placeholder="Nome"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="email"
                required
                type="email"
                placeholder="E-mail"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="password"
                required
                type="password"
                minLength={8}
                placeholder="Senha inicial"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <select
                name="roleId"
                required
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Papel</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                name="branchId"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Filial do usuario atual</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                Criar usuario
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Seu perfil permite visualizar usuarios, mas nao criar novos
              acessos.
            </p>
          )}
        </section>
      </div>

      <section
        id="permissoes"
        className="mt-5 rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">
          Papeis disponiveis
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {availableRoles.map((role) => (
            <div key={role.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">
                {role.name}
              </p>
              <p className="mt-1 text-xs text-muted">{role.key}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
