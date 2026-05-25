import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";

export default async function ReportsPage() {
  await requirePermission("reports.read");

  return (
    <AppShell title="Relatorios">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Relatorios</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para relatorios de membros, financeiro, estoque,
          documentos e auditoria.
        </p>
      </section>
    </AppShell>
  );
}
