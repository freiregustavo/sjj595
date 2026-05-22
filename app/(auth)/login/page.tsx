import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <section className="w-full max-w-sm rounded-md border border-border bg-surface p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          SJJ595
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Acesse com o usuario vinculado a sua entidade.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
