"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "🏆 Quiniela" },
    { href: "/grupos", label: "📊 Grupos" },
    { href: "/calendario", label: "📅 Calendario" },
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/70 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-12">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
