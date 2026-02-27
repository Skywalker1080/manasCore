"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "../../public/manasCore.png";
import { BookOpen, BarChart3, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Journal", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="relative h-8 w-8">
          <Image
            src={logo}
            alt="manasCore Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <Link
          href="/"
          className="text-xl font-serif tracking-tight text-sidebar-foreground/90 transition-opacity hover:opacity-80"
        >
          manasCore
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/80"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Theme toggle */}
      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/40">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
