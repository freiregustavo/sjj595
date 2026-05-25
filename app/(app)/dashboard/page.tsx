import {
  AlertTriangle,
  Banknote,
  FileText,
  Users,
  WalletCards
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function toNumber(value: unknown) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

export default async function DashboardPage() {
  const context = await requirePermission("reports.read");
  const today = new Date();

  const [
    activeMembers,
    openReceivables,
    overdueReceivables,
    incomeAggregate,
    expenseAggregate,
    recentDocuments,
    recentMembers
  ] = await Promise.all([
    prisma.member.count({
      where: { tenantId: context.tenantId, status: "ACTIVE" }
    }),
    prisma.receivable.count({
      where: { tenantId: context.tenantId, status: "OPEN" }
    }),
    prisma.receivable.count({
      where: {
        tenantId: context.tenantId,
        status: "OPEN",
        dueDate: { lt: today }
      }
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId: context.tenantId, type: "INCOME" },
      _sum: { amount: true }
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId: context.tenantId, type: "EXPENSE" },
      _sum: { amount: true }
    }),
    prisma.document.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.member.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const balance =
    toNumber(incomeAggregate._sum.amount) - toNumber(expenseAggregate._sum.amount);

  const cards = [
    { title: "Membros ativos", value: String(activeMembers), icon: Users },
    {
      title: "Mensalidades em aberto",
      value: String(openReceivables),
      icon: WalletCards
    },
    {
      title: "Mensalidades vencidas",
      value: String(overdueReceivables),
      icon: AlertTriangle
    },
    { title: "Saldo financeiro", value: formatCurrency(balance), icon: Banknote },
    { title: "Documentos recentes", value: String(recentDocuments.length), icon: FileText }
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <section
              key={card.title}
              className="rounded-md border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted">{card.title}</p>
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <strong className="mt-5 block text-2xl font-semibold text-foreground">
                {card.value}
              </strong>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Membros recentes
          </h2>
          <div className="mt-4 grid gap-3">
            {recentMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {member.fullName}
                </span>
                <span className="text-xs text-muted">{member.status}</span>
              </div>
            ))}
            {recentMembers.length === 0 ? (
              <p className="text-sm text-muted">Nenhum membro cadastrado.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">Alertas</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted">
            {overdueReceivables > 0 ? (
              <p className="text-danger">
                Existem {overdueReceivables} mensalidades vencidas.
              </p>
            ) : (
              <p>Nenhuma mensalidade vencida encontrada.</p>
            )}
            {recentDocuments.length === 0 ? (
              <p>Nenhum documento recente cadastrado.</p>
            ) : (
              <p>{recentDocuments.length} documentos recentes no tenant.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
