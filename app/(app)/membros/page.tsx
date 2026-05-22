import { AppShell } from "@/components/layout/app-shell";

export default function MembersPage() {
  return (
    <AppShell title="Membros">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Cadastro de membros</h2>
        <p className="mt-2 text-sm text-muted">
          Modulo reservado para dados pessoais, contatos, situacao, historico e
          vinculo com entidade ou filial.
        </p>
      </section>
    </AppShell>
  );
}
