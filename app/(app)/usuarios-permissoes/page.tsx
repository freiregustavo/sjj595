import { AppShell } from "@/components/layout/app-shell";

export default function UsersPermissionsPage() {
  return (
    <AppShell title="Usuarios e Permissoes">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Acessos e permissoes</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para usuarios, perfis, permissoes por modulo e
          escopo por filial.
        </p>
      </section>
    </AppShell>
  );
}
