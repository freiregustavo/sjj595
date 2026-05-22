import Link from "next/link";
import {
  Boxes,
  FileText,
  Gauge,
  Landmark,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

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

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface md:block">
        <div className="border-b border-border px-5 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            SJJ595
          </p>
          <p className="mt-1 text-sm text-muted">Administracao SaaS</p>
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
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <div className="text-sm text-muted">Tenant nao selecionado</div>
          </div>
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
