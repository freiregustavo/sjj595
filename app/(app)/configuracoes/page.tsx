import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { createEntity, createFinancialAccount } from "./actions";

export default async function SettingsPage() {
  const context = await requirePermission("settings.update");

  const [tenant, branches, entities, accounts] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: context.tenantId },
      include: { organization: true }
    }),
    prisma.branch.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { name: "asc" }
    }),
    prisma.masonicEntity.findMany({
      where: { tenantId: context.tenantId },
      orderBy: [{ isRequired: "desc" }, { name: "asc" }]
    }),
    prisma.financialAccount.findMany({
      where: { tenantId: context.tenantId },
      include: { entity: true, branch: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    })
  ]);

  return (
    <AppShell title="Configuracoes">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Loja principal
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">
                Organizacao
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {tenant?.organization.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">
                Loja / tenant
              </dt>
              <dd className="mt-1 text-sm text-foreground">{tenant?.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Slug</dt>
              <dd className="mt-1 text-sm text-foreground">{tenant?.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">
                Filiais
              </dt>
              <dd className="mt-1 text-sm text-foreground">{branches.length}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Nova entidade
          </h2>
          <form action={createEntity} className="mt-4 grid gap-3">
            <input
              name="name"
              required
              placeholder="Nome da entidade"
              className="h-10 rounded-md border border-border px-3 text-sm"
            />
            <input
              name="code"
              placeholder="Codigo opcional"
              className="h-10 rounded-md border border-border px-3 text-sm"
            />
            <select
              name="kind"
              defaultValue="APPENDANT_BODY"
              className="h-10 rounded-md border border-border px-3 text-sm"
            >
              <option value="LODGE">Loja</option>
              <option value="APPENDANT_BODY">Entidade vinculada</option>
              <option value="OTHER">Outra</option>
            </select>
            <textarea
              name="description"
              placeholder="Descricao"
              className="min-h-20 rounded-md border border-border px-3 py-2 text-sm"
            />
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
              Criar entidade
            </button>
          </form>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Entidades vinculadas
          </h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Codigo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {entity.name}
                      {entity.isRequired ? (
                        <span className="ml-2 text-xs text-accent">
                          obrigatoria
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted">{entity.code}</td>
                    <td className="px-3 py-2 text-muted">{entity.kind}</td>
                    <td className="px-3 py-2 text-muted">{entity.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Novo caixa
          </h2>
          <form action={createFinancialAccount} className="mt-4 grid gap-3">
            <input
              name="name"
              required
              placeholder="Nome do caixa"
              className="h-10 rounded-md border border-border px-3 text-sm"
            />
            <input
              name="code"
              placeholder="Codigo opcional"
              className="h-10 rounded-md border border-border px-3 text-sm"
            />
            <select
              name="kind"
              defaultValue="ENTITY"
              className="h-10 rounded-md border border-border px-3 text-sm"
            >
              <option value="GENERAL">Caixa geral</option>
              <option value="ENTITY">Caixa de entidade</option>
              <option value="BRANCH">Caixa de filial</option>
            </select>
            <select
              name="entityId"
              className="h-10 rounded-md border border-border px-3 text-sm"
            >
              <option value="">Sem entidade</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
            <select
              name="branchId"
              className="h-10 rounded-md border border-border px-3 text-sm"
            >
              <option value="">Sem filial</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
              Criar caixa
            </button>
          </form>
        </section>
      </div>

      <section className="mt-5 rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Caixas</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Codigo</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Entidade</th>
                <th className="px-3 py-2">Filial</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {account.name}
                  </td>
                  <td className="px-3 py-2 text-muted">{account.code}</td>
                  <td className="px-3 py-2 text-muted">{account.kind}</td>
                  <td className="px-3 py-2 text-muted">
                    {account.entity?.name ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {account.branch?.name ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
