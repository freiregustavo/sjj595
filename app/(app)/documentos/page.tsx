import { AppShell } from "@/components/layout/app-shell";

export default function DocumentsPage() {
  return (
    <AppShell title="Documentos">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Documentos privados</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para upload, categorizacao, permissoes e trilha de
          auditoria de documentos.
        </p>
      </section>
    </AppShell>
  );
}
