import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-border pb-8">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">
            SJJ595
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold text-foreground">
            Gestao administrativa, financeira e documental para entidades.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted">
            Base inicial do SaaS multi-tenant. A aplicacao nasce preparada para
            Supabase Auth, PostgreSQL, Storage privado, auditoria e permissoes
            por modulo.
          </p>
          <div>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-white"
            >
              Abrir dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
