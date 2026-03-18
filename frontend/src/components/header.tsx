"use client";

import { User, BarChart3, MessageCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../public/manasCore.png";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10 absolute top-0 left-0 right-0 z-50">
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="relative h-10 w-10">
          <Image
            src={logo}
            alt="manasCore Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-xl font-serif tracking-tight text-foreground/90">manasCore</span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/entries"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Journal Entries"
        >
          <BookOpen className="h-4 w-4" />
        </Link>
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


