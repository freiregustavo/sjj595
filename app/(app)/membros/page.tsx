import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { createMember } from "./actions";

export default async function MembersPage() {
  const context = await requirePermission("members.read");
  const canCreate = context.isSuperAdmin || context.permissions.includes("members.create");

  const [members, entities, branches] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId: context.tenantId },
      include: {
        branch: true,
        entityMemberships: {
          include: { entity: true },
          where: { status: "ACTIVE" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.masonicEntity.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: [{ isRequired: "desc" }, { name: "asc" }]
    }),
    prisma.branch.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AppShell title="Membros">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Membros cadastrados
          </h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Contato</th>
                  <th className="px-3 py-2">Filial</th>
                  <th className="px-3 py-2">Entidades</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {member.fullName}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {member.email || member.phone || "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {member.branch?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {member.entityMemberships.length > 0
                        ? member.entityMemberships
                            .map((membership) => membership.entity.name)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">{member.status}</td>
                  </tr>
                ))}
                {members.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted" colSpan={5}>
                      Nenhum membro cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Novo membro
          </h2>
          {canCreate ? (
            <form action={createMember} className="mt-4 grid gap-3">
              <input
                name="fullName"
                required
                placeholder="Nome completo"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="document"
                placeholder="Documento"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="phone"
                placeholder="Telefone"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-muted">
                  Nascimento
                  <input
                    name="birthDate"
                    type="date"
                    className="h-10 rounded-md border border-border px-3 text-sm text-foreground"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted">
                  Ingresso
                  <input
                    name="joinedAt"
                    type="date"
                    className="h-10 rounded-md border border-border px-3 text-sm text-foreground"
                  />
                </label>
              </div>
              <select
                name="branchId"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Filial padrao</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold uppercase text-muted">
                  Entidades
                </p>
                <div className="mt-2 grid gap-2">
                  {entities.map((entity) => (
                    <label
                      key={entity.id}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        name="entityIds"
                        value={entity.id}
                        defaultChecked={entity.isRequired}
                      />
                      {entity.name}
                    </label>
                  ))}
                </div>
              </div>
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                Cadastrar membro
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Seu perfil permite visualizar membros, mas nao cadastrar novos.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
