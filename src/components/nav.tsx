"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function Nav() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">LL</span>
          LendLoop
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/tools" className="hover:text-slate-950">Browse tools</Link>
          {clerkConfigured && <SignedIn><Link href="/dashboard" className="hover:text-slate-950">Dashboard</Link></SignedIn>}
        </div>
        {!clerkConfigured ? (
          <span className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Sign-in setup required</span>
        ) : (
          <>
            <SignedOut><SignInButton mode="modal"><button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Sign in</button></SignInButton></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </>
        )}
      </nav>
    </header>
  );
}
