"use client";

import { User, BarChart3, MessageCircle } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10 absolute top-0 left-0 right-0 z-50">
      <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
        <div className="h-2 w-2 rounded-full bg-foreground/60" />
        <span className="text-lg tracking-wide text-foreground/80">manasCore</span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Dashboard"
        >
          <BarChart3 className="h-4 w-4" />
        </Link>
        <Link
          href="/chat"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Chat"
        >
          <MessageCircle className="h-4 w-4" />
        </Link>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}


