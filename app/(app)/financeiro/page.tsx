import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  ReceiptText
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import {
  createCashMovement,
  createFinancialCategory,
  createPayable,
  createReceivable,
  payPayable,
  receiveReceivable
} from "./actions";

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value ?? 0));
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC"
  }).format(value);
}

function dateInputValue(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function FinancePage() {
  const context = await requirePermission("finance.read");
  const canCreate =
    context.isSuperAdmin || context.permissions.includes("finance.create");
  const canApprove =
    context.isSuperAdmin || context.permissions.includes("finance.approve");

  const [
    accounts,
    entities,
    branches,
    members,
    incomeCategories,
    expenseCategories,
    receivables,
    payables,
    movements,
    incomeAggregate,
    expenseAggregate,
    openReceivablesAggregate,
    openPayablesAggregate
  ] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      include: { entity: true, branch: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    }),
    prisma.masonicEntity.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: [{ isRequired: "desc" }, { name: "asc" }]
    }),
    prisma.branch.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.member.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      take: 200
    }),
    prisma.financialCategory.findMany({
      where: { tenantId: context.tenantId, type: "INCOME", status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.financialCategory.findMany({
      where: { tenantId: context.tenantId, type: "EXPENSE", status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.receivable.findMany({
      where: { tenantId: context.tenantId },
      include: { account: true, category: true, member: true, entity: true },
      orderBy: { dueDate: "asc" },
      take: 20
    }),
    prisma.payable.findMany({
      where: { tenantId: context.tenantId },
      include: { account: true, category: true, entity: true },
      orderBy: { dueDate: "asc" },
      take: 20
    }),
    prisma.cashMovement.findMany({
      where: { tenantId: context.tenantId },
      include: { account: true, entity: true },
      orderBy: { movementDate: "desc" },
      take: 20
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId: context.tenantId, type: "INCOME" },
      _sum: { amount: true }
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId: context.tenantId, type: "EXPENSE" },
      _sum: { amount: true }
    }),
    prisma.receivable.aggregate({
      where: { tenantId: context.tenantId, status: "OPEN" },
      _sum: { amount: true }
    }),
    prisma.payable.aggregate({
      where: { tenantId: context.tenantId, status: "OPEN" },
      _sum: { amount: true }
    })
  ]);

  const balance =
    Number(incomeAggregate._sum.amount ?? 0) -
    Number(expenseAggregate._sum.amount ?? 0);

  const cards = [
    {
      label: "Saldo de caixa",
      value: formatCurrency(balance),
      icon: CircleDollarSign
    },
    {
      label: "A receber em aberto",
      value: formatCurrency(openReceivablesAggregate._sum.amount),
      icon: ArrowUpCircle
    },
    {
      label: "A pagar em aberto",
      value: formatCurrency(openPayablesAggregate._sum.amount),
      icon: ArrowDownCircle
    },
    {
      label: "Movimentos recentes",
      value: String(movements.length),
      icon: ReceiptText
    }
  ];

  return (
    <AppShell title="Financeiro">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <section
              key={card.label}
              className="rounded-md border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted">{card.label}</p>
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <strong className="mt-5 block text-2xl font-semibold text-foreground">
                {card.value}
              </strong>
            </section>
          );
        })}
      </div>

      {canCreate ? (
        <section
          id="categorias"
          className="mt-5 rounded-md border border-border bg-surface p-5"
        >
          <h2 className="text-base font-semibold text-foreground">
            Categorias financeiras
          </h2>
          <form
            action={createFinancialCategory}
            className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_160px]"
          >
            <input
              name="name"
              required
              placeholder="Nome da categoria"
              className="h-10 rounded-md border border-border px-3 text-sm"
            />
            <select
              name="type"
              defaultValue="INCOME"
              className="h-10 rounded-md border border-border px-3 text-sm"
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
              Criar categoria
            </button>
          </form>
          <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
            <p>
              Receitas: {incomeCategories.map((item) => item.name).join(", ") || "-"}
            </p>
            <p>
              Despesas:{" "}
              {expenseCategories.map((item) => item.name).join(", ") || "-"}
            </p>
          </div>
        </section>
      ) : null}

      {canCreate ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <section
            id="nova-conta-a-receber"
            className="rounded-md border border-border bg-surface p-5"
          >
            <h2 className="text-base font-semibold text-foreground">
              Conta a receber
            </h2>
            <form action={createReceivable} className="mt-4 grid gap-3">
              <input
                name="description"
                required
                placeholder="Descricao"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="Valor"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
                <input
                  name="dueDate"
                  required
                  type="date"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
              <select
                name="memberId"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Sem membro</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
              <select
                name="categoryId"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Sem categoria</option>
                {incomeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FinanceScopeFields
                accounts={accounts}
                branches={branches}
                entities={entities}
              />
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                Lancar recebivel
              </button>
            </form>
          </section>

          <section
            id="nova-conta-a-pagar"
            className="rounded-md border border-border bg-surface p-5"
          >
            <h2 className="text-base font-semibold text-foreground">
              Conta a pagar
            </h2>
            <form action={createPayable} className="mt-4 grid gap-3">
              <input
                name="description"
                required
                placeholder="Descricao"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <input
                name="supplierName"
                placeholder="Fornecedor"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="Valor"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
                <input
                  name="dueDate"
                  required
                  type="date"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
              <select
                name="categoryId"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="">Sem categoria</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FinanceScopeFields
                accounts={accounts}
                branches={branches}
                entities={entities}
              />
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                Lancar pagavel
              </button>
            </form>
          </section>

          <section
            id="movimento-caixa"
            className="rounded-md border border-border bg-surface p-5"
          >
            <h2 className="text-base font-semibold text-foreground">
              Movimento de caixa
            </h2>
            <form action={createCashMovement} className="mt-4 grid gap-3">
              <select
                name="type"
                defaultValue="INCOME"
                className="h-10 rounded-md border border-border px-3 text-sm"
              >
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saida</option>
              </select>
              <input
                name="description"
                placeholder="Descricao"
                className="h-10 rounded-md border border-border px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="Valor"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
                <input
                  name="movementDate"
                  required
                  type="date"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
              <FinanceScopeFields
                accounts={accounts}
                branches={branches}
                entities={entities}
              />
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                Registrar movimento
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <FinanceTable
          id="contas-a-receber"
          emptyText="Nenhuma conta a receber cadastrada."
          rows={receivables.map((receivable) => ({
            id: receivable.id,
            accountId: receivable.accountId,
            title: receivable.description,
            detail:
              receivable.member?.fullName ??
              receivable.entity?.name ??
              receivable.category?.name ??
              "-",
            account: receivable.account?.name ?? "-",
            date: formatDate(receivable.dueDate),
            amount: formatCurrency(receivable.amount),
            status: receivable.status
          }))}
          action={canApprove ? receiveReceivable : undefined}
          actionAccounts={accounts}
          actionLabel="Receber"
          title="Contas a receber"
        />
        <FinanceTable
          id="contas-a-pagar"
          emptyText="Nenhuma conta a pagar cadastrada."
          rows={payables.map((payable) => ({
            id: payable.id,
            accountId: payable.accountId,
            title: payable.description,
            detail:
              payable.supplierName ??
              payable.entity?.name ??
              payable.category?.name ??
              "-",
            account: payable.account?.name ?? "-",
            date: formatDate(payable.dueDate),
            amount: formatCurrency(payable.amount),
            status: payable.status
          }))}
          action={canApprove ? payPayable : undefined}
          actionAccounts={accounts}
          actionLabel="Pagar"
          title="Contas a pagar"
        />
      </div>

      <FinanceTable
        id="relatorios"
        className="mt-5"
        emptyText="Nenhum movimento de caixa registrado."
        rows={movements.map((movement) => ({
          id: movement.id,
          accountId: movement.accountId,
          title: movement.description ?? "Movimento manual",
          detail: movement.entity?.name ?? "-",
          account: movement.account?.name ?? "-",
          date: formatDate(movement.movementDate),
          amount: formatCurrency(movement.amount),
          status: movement.type === "INCOME" ? "Entrada" : "Saida"
        }))}
        title="Fluxo de caixa"
      />
    </AppShell>
  );
}

type FinanceScopeFieldsProps = {
  accounts: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  entities: { id: string; name: string }[];
};

function FinanceScopeFields({
  accounts,
  branches,
  entities
}: FinanceScopeFieldsProps) {
  return (
    <>
      <select
        name="accountId"
        className="h-10 rounded-md border border-border px-3 text-sm"
      >
        <option value="">Sem caixa</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
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
        <option value="">Filial do usuario</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </>
  );
}

type FinanceTableProps = {
  action?: (formData: FormData) => Promise<void>;
  actionAccounts?: { id: string; name: string }[];
  actionLabel?: string;
  className?: string;
  emptyText: string;
  id?: string;
  rows: {
    id: string;
    accountId: string | null;
    title: string;
    detail: string;
    account: string;
    date: string;
    amount: string;
    status: string;
  }[];
  title: string;
};

function FinanceTable({
  action,
  actionAccounts = [],
  actionLabel = "Baixar",
  className = "",
  emptyText,
  id,
  rows,
  title
}: FinanceTableProps) {
  return (
    <section
      id={id}
      className={`rounded-md border border-border bg-surface p-5 ${className}`}
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-background text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Descricao</th>
              <th className="px-3 py-2">Vinculo</th>
              <th className="px-3 py-2">Caixa</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Status</th>
              {action ? <th className="px-3 py-2">Acao</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground">
                  {row.title}
                </td>
                <td className="px-3 py-2 text-muted">{row.detail}</td>
                <td className="px-3 py-2 text-muted">{row.account}</td>
                <td className="px-3 py-2 text-muted">{row.date}</td>
                <td className="px-3 py-2 text-muted">{row.amount}</td>
                <td className="px-3 py-2 text-muted">{row.status}</td>
                {action ? (
                  <td className="px-3 py-2">
                    {row.status === "OPEN" || row.status === "OVERDUE" ? (
                      <form action={action} className="grid min-w-52 gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          name="paidAt"
                          required
                          type="date"
                          defaultValue={dateInputValue()}
                          className="h-8 rounded-md border border-border px-2 text-xs"
                        />
                        <select
                          name="accountId"
                          required={!row.accountId}
                          defaultValue={row.accountId ?? ""}
                          disabled={Boolean(row.accountId)}
                          className="h-8 rounded-md border border-border px-2 text-xs disabled:bg-background"
                        >
                          <option value="">Selecione o caixa</option>
                          {actionAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <button className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-background">
                          {actionLabel}
                        </button>
                      </form>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-muted"
                  colSpan={action ? 7 : 6}
                >
                  {emptyText}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
