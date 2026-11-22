"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

export default function IncomingRequestsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const loans = useQuery(api.loans.incoming);
  const decide = useMutation(api.loans.decide);
  const returnLoan = useMutation(api.loans.returnLoan);
  const [error, setError] = useState("");

  async function action(loanId: never, decision: "approved" | "declined") {
    setError("");
    try { await decide({ loanId, decision }); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
  }

  if (loans === undefined) return <main className="p-10 text-center text-slate-500">Loading…</main>;
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold">Incoming requests</h1>
      {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      {!loans.length ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">No incoming requests.</div> :
        <div className="mt-8 space-y-3">{loans.map((loan: any) => <article key={loan._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-bold">{loan.tool?.name ?? "Tool"}</p><p className="mt-1 text-sm text-slate-500">{loan.startDate} → {loan.endDate}</p></div>{loan.status === "pending" ? <div className="flex gap-2"><button onClick={() => action(loan._id as never, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => action(loan._id as never, "declined")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Decline</button></div> : loan.status === "approved" ? <button onClick={() => returnLoan({ loanId: loan._id }).catch((e) => setError(e.message))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Mark returned</button> : <span className="text-sm font-semibold uppercase text-slate-500">{loan.status}</span>}</article>)}</div>}
    </main>
  );
}
