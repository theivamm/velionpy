"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HiUsers, HiCog, HiLogout } from "react-icons/hi";
import { useLanguage, useAuth, ThemeToggle, LanguageToggle } from "@velion/shared";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { signOut } = useAuth();

  const links = [
    { href: "/clients", label: t.nav.clients, icon: HiUsers },
    { href: "/settings", label: t.nav.settings, icon: HiCog },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-4">
      <div className="glass mx-4 rounded-2xl flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold gradient-text tracking-wider text-xl">
            {t.app.name}
          </Link>
          <div className="hidden md:flex items-center gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-velion-cyan/20 text-velion-cyan shadow-lg shadow-velion-cyan/10"
                      : "text-[var(--text-secondary)] hover:text-velion-cyan hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <HiLogout size={18} />
            <span className="hidden md:inline">{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
