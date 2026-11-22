"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function OutgoingRequestsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const loans = useQuery(api.loans.outgoing);
  if (loans === undefined) return <main className="p-10 text-center text-slate-500">Loading…</main>;
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold">My requests</h1>
      {!loans.length ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">You have no borrowing requests.</div> :
        <div className="mt-8 space-y-3">{loans.map((loan: any) => <article key={loan._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-bold">{loan.tool?.name ?? "Tool"}</p><p className="mt-1 text-sm text-slate-500">{loan.startDate} → {loan.endDate}</p></div><Status status={loan.status} /></article>)}</div>}
    </main>
  );
}

function Status({ status }: { status: string }) {
  const style = status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "declined" || status === "cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${style}`}>{status}</span>;
}
