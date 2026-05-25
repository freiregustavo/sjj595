import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";

export default async function InventoryPage() {
  await requirePermission("inventory.read");

  return (
    <AppShell title="Estoque">
      <section
        id="itens"
        className="rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">Estoque por filial</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para itens, entradas, saidas, transferencias e saldo
          por filial.
        </p>
      </section>
      <section
        id="movimentos"
        className="mt-5 rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">Movimentos</h2>
        <p className="mt-2 text-sm text-muted">
          Entradas, saidas, transferencias e ajustes serao controlados aqui.
        </p>
      </section>
      <section
        id="saldos"
        className="mt-5 rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">Saldos</h2>
        <p className="mt-2 text-sm text-muted">
          Saldos por filial e item serao consolidados nesta visao.
        </p>
      </section>
    </AppShell>
  );
}
