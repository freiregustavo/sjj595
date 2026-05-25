import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";

export default async function DocumentsPage() {
  await requirePermission("documents.read");

  return (
    <AppShell title="Documentos">
      <section
        id="arquivos"
        className="rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">Documentos privados</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para upload, categorizacao, permissoes e trilha de
          auditoria de documentos.
        </p>
      </section>
      <section
        id="categorias"
        className="mt-5 rounded-md border border-border bg-surface p-5"
      >
        <h2 className="text-base font-semibold text-foreground">Categorias</h2>
        <p className="mt-2 text-sm text-muted">
          Categorias de documentos e regras de classificacao serao mantidas aqui.
        </p>
      </section>
    </AppShell>
  );
}
