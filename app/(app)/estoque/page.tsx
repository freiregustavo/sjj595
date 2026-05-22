import { AppShell } from "@/components/layout/app-shell";

export default function InventoryPage() {
  return (
    <AppShell title="Estoque">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Estoque por filial</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para itens, entradas, saidas, transferencias e saldo
          por filial.
        </p>
      </section>
    </AppShell>
  );
}
