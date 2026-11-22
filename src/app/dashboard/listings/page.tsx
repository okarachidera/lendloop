"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

export default function ListingsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const listings = useQuery(api.tools.myListings);
  const remove = useMutation(api.tools.remove);
  const [error, setError] = useState("");

  async function deleteListing(id: never) {
    if (!confirm("Delete this listing?")) return;
    setError("");
    try { await remove({ id }); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete listing"); }
  }

  if (listings === undefined) return <main className="p-10 text-center text-slate-500">Loading…</main>;
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">My listings</h1><Link href="/tools/new" className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white">Add tool</Link></div>
      {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      {!listings.length ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">You haven&apos;t listed any tools yet.</div> :
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((tool: any) => (
          <article key={tool._id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between"><span className="text-xs font-bold text-emerald-700">{tool.category}</span><span className="text-xs text-slate-500">{tool.status}</span></div>
            <h2 className="mt-5 font-bold">{tool.name}</h2><p className="mt-1 text-sm text-slate-500">{tool.condition}</p>
            <div className="mt-5 flex justify-between"><Link href={`/tools/${tool._id}/edit`} className="text-sm font-semibold text-slate-700">Edit</Link><button onClick={() => deleteListing(tool._id as never)} className="text-sm font-semibold text-red-600">Delete listing</button></div>
          </article>
        ))}</div>}
    </main>
  );
}
