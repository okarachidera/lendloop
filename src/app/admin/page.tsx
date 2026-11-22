"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required for the admin dashboard.</main>;
  const loans = useQuery(api.loans.adminAll);
  const users = useQuery(api.auth.adminUsers);
  const setTrusted = useMutation(api.tools.setTrustedLender);
  if (loans === undefined || users === undefined) return <main className="p-10 text-center text-slate-500">Loading…</main>;
  if (loans === null || users === null) return <main className="p-10 text-center text-red-700">Admin privileges required.</main>;
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <section className="mt-8">
        <h2 className="text-xl font-bold">Trusted lenders</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {users.map((user: any) => (
            <article key={user._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-sm text-slate-600">{user.clerkId.slice(0, 12)}…</span>
              {user.trustedLender ? <span className="text-sm font-bold text-emerald-700">Trusted</span> :
                <button onClick={() => setTrusted({ userId: user._id })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Mark trusted</button>}
            </article>
          ))}
        </div>
      </section>
      {!loans ? <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Admin privileges required.</div> :
        !loans.length ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">No loan activity yet.</div> :
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-3">Tool</th><th className="p-3">Dates</th><th className="p-3">Status</th></tr></thead><tbody>{loans.map((loan: any) => <tr key={loan._id} className="border-b last:border-0"><td className="p-3 font-semibold">{loan.tool?.name ?? "Deleted tool"}</td><td className="p-3 text-slate-600">{loan.startDate} → {loan.endDate}</td><td className="p-3 uppercase">{loan.status}</td></tr>)}</tbody></table></div>}
    </main>
  );
}
