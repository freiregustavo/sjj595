"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: {
    href: string;
    label: string;
  }[];
};

type SidebarNavProps = {
  items: SidebarNavItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenItems((current) => ({
      ...Object.fromEntries(
        items.map((item) => [item.href, current[item.href] ?? false])
      ),
      ...Object.fromEntries(
        items
          .filter((item) => pathname.startsWith(item.href))
          .map((item) => [item.href, true])
      )
    }));
  }, [items, pathname]);

  function toggleItem(href: string) {
    setOpenItems((current) => ({
      ...current,
      [href]: !current[href]
    }));
  }

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isOpen = openItems[item.href] ?? isActive;

        return (
          <div key={item.href} className="rounded-md">
            <div
              className={`flex h-10 items-center rounded-md text-sm font-medium ${
                isActive
                  ? "bg-primary/10 text-foreground shadow-sm"
                  : "text-foreground hover:bg-background"
              }`}
            >
              <Link
                href={item.href}
                className="flex min-w-0 flex-1 items-center gap-3 px-3"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
              {item.children ? (
                <button
                  type="button"
                  onClick={() => toggleItem(item.href)}
                  aria-expanded={isOpen}
                  className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                  title={isOpen ? "Recolher menu" : "Abrir menu"}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    {isOpen ? "Recolher menu" : "Abrir menu"}
                  </span>
                </button>
              ) : null}
            </div>
            {item.children && isOpen ? (
              <div className="ml-7 mt-1 grid gap-1 border-l border-border pl-3">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
