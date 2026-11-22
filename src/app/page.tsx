import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { ToolGrid } from "@/components/tool-grid";

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[1.15fr_.85fr] md:py-24">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            A stronger neighborhood starts with sharing
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 md:text-7xl">
            Borrow what you need. <span className="text-emerald-600">Lend what you don&apos;t.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Find trusted tools nearby, keep useful gear in motion, and save for what matters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/tools" className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
              Browse tools
            </Link>
            {clerkConfigured ? (
              <SignInButton mode="modal"><button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:border-slate-400">Join LendLoop</button></SignInButton>
            ) : (
              <span className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800">Sign-in setup required</span>
            )}
          </div>
        </div>
        <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-emerald-700 p-8 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/30" />
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-100">Community impact</p>
          <p className="mt-16 text-6xl font-bold">One tool.</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-100">Many projects.</p>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="text-sm font-bold text-emerald-700">AVAILABLE NOW</p><h2 className="mt-1 text-3xl font-bold">Tools ready to share</h2></div>
            <Link href="/tools" className="text-sm font-semibold text-slate-700 hover:text-emerald-700">View all →</Link>
          </div>
          <ToolGrid publicOnly limit={6} />
        </div>
      </section>
    </main>
  );
}
