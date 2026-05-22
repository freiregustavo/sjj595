import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  return (
    <AppShell title="Configuracoes">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Configuracoes da entidade</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para entidade, filiais, parametros operacionais,
          categorias e templates.
        </p>
      </section>
    </AppShell>
  );
}
