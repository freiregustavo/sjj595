import { AppShell } from "@/components/layout/app-shell";

export default function FinancePage() {
  return (
    <AppShell title="Financeiro">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Controle financeiro</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para mensalidades, contas a receber, contas a pagar,
          fluxo de caixa e categorias financeiras.
        </p>
      </section>
    </AppShell>
  );
}
