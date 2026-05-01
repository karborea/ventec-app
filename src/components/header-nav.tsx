"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/soumissions", label: "Soumissions" },
  { href: "/profil", label: "Mon profil" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
];

const CLIENT_NAV: NavItem[] = [
  { href: "/mes-soumissions", label: "Mes soumissions" },
  { href: "/profil", label: "Mon profil" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? ADMIN_NAV : CLIENT_NAV;
  return (
    <nav className="flex gap-6">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-semibold py-1.5 border-b-2 ${
              active
                ? "text-[#1a1f2e] border-[#F37021]"
                : "text-[#1a1f2e] border-transparent hover:text-[#F37021]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
