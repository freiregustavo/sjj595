import Link from "next/link";
import {
  Boxes,
  FileText,
  Gauge,
  Landmark,
  LogOut,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { getCurrentSession } from "@/lib/auth/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/membros", label: "Membros", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Landmark },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
  { href: "/usuarios-permissoes", label: "Usuarios", icon: ShieldCheck }
];

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

export async function AppShell({ children, title }: AppShellProps) {
  const session = await getCurrentSession();
  const profile = session.profile;
  const tenantName = profile?.tenant?.name ?? "Perfil sem loja";
  const branchName = profile?.branch?.name ?? "Sem filial";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface md:block">
        <div className="border-b border-border px-5 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            SJJ595
          </p>
          <p className="mt-1 text-sm text-muted">{tenantName}</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground hover:bg-background"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">
                  {profile?.name ?? session.email}
                </span>
                <span className="text-muted">
                  {tenantName} / {branchName}
                </span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-background"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="p-5">
          {!profile ? (
            <section className="rounded-md border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
              Seu usuario esta autenticado, mas ainda nao possui profile ativo
              vinculado a uma loja.
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
