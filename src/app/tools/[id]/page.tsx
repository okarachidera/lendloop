"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

export default function ToolDetailPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const params = useParams<{ id: string }>();
  const tool = useQuery(api.tools.getPublic, { id: params.id as never });
  const ensureUser = useMutation(api.auth.ensureUser);
  const requestTool = useMutation(api.loans.request);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { void ensureUser({}).catch(() => undefined); }, [ensureUser]);

  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    const data = new FormData(event.currentTarget);
    try {
      await requestTool({
        toolId: params.id as never,
        startDate: String(data.get("start")),
        endDate: String(data.get("end")),
      });
      setSuccess("Request sent to the lender.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  if (tool === undefined) return <main className="p-10 text-center text-slate-500">Loading…</main>;
  if (!tool) return <main className="p-10 text-center">This tool is no longer available.</main>;
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_360px]">
      <div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{tool.category}</span>
        <h1 className="mt-5 text-4xl font-bold">{tool.name}</h1>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Category</p><p className="mt-1 font-semibold">{tool.category}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Listing</p><p className="mt-1 font-semibold text-emerald-700">Available</p></div>
        </div>
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Request this tool</h2>
        {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
        {!clerkConfigured ? (
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Clerk sign-in must be configured before requests are enabled.</p>
        ) : (
          <>
            <SignedOut><SignInButton mode="modal"><button className="mt-5 w-full rounded-lg bg-slate-950 py-3 font-semibold text-white">Sign in to request</button></SignInButton></SignedOut>
            <SignedIn><form onSubmit={request} className="mt-4 space-y-4"><label className="block text-sm font-semibold">Start date<input required name="start" type="date" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="block text-sm font-semibold">End date<input required name="end" type="date" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><button className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white">Send request</button></form></SignedIn>
          </>
        )}
      </aside>
    </main>
  );
}
