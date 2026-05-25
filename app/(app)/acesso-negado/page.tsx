import { AppShell } from "@/components/layout/app-shell";

export default function AccessDeniedPage() {
  return (
    <AppShell title="Acesso negado">
      <section className="rounded-md border border-danger/30 bg-danger/10 p-5">
        <h2 className="text-base font-semibold text-danger">
          Voce nao possui permissao para acessar este modulo.
        </h2>
        <p className="mt-2 text-sm text-danger">
          Solicite ao administrador da entidade a revisao do seu perfil de
          acesso.
        </p>
      </section>
    </AppShell>
  );
}
