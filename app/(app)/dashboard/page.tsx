import {
  AlertTriangle,
  Banknote,
  FileText,
  Users,
  WalletCards
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

const cards = [
  { title: "Membros ativos", value: "-", icon: Users },
  { title: "Mensalidades em aberto", value: "-", icon: WalletCards },
  { title: "Mensalidades vencidas", value: "-", icon: AlertTriangle },
  { title: "Saldo financeiro", value: "-", icon: Banknote },
  { title: "Documentos recentes", value: "-", icon: FileText }
];

export default function DashboardPage() {
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

      <section className="mt-6 rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Alertas</h2>
        <p className="mt-2 text-sm text-muted">
          Os indicadores serao conectados aos dados reais apos a fundacao de
          autenticacao, tenant e banco estar ativa.
        </p>
      </section>
    </AppShell>
  );
}
