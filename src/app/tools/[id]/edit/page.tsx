"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";

export default function EditToolPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const params = useParams<{ id: string }>();
  const listings = useQuery(api.tools.myListings);
  const update = useMutation(api.tools.update);
  const router = useRouter();
  const [error, setError] = useState("");
  const listing = listings?.find((item: any) => item._id === params.id);

  useEffect(() => {
    if (listings && !listing) setError("Listing not found or not owned by you.");
  }, [listings, listing]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await update({
        id: params.id as never,
        name: String(data.get("name")),
        category: String(data.get("category")),
        condition: String(data.get("condition")),
        description: String(data.get("description")),
      });
      router.push("/dashboard/listings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update listing");
    }
  }

  if (listings === undefined) return <main className="p-10 text-center">Loading…</main>;
  if (!listing) return <main className="p-10 text-center text-red-700">{error || "Listing not found."}</main>;
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-3xl font-bold">Edit listing</h1>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="block text-sm font-semibold">Tool name<input name="name" required defaultValue={listing.name} maxLength={80} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="block text-sm font-semibold">Category<select name="category" defaultValue={listing.category} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option>Power tools</option><option>Garden</option><option>Home repair</option><option>Outdoor</option><option>Kitchen</option></select></label>
        <label className="block text-sm font-semibold">Condition<select name="condition" defaultValue={listing.condition} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs repair</option></select></label>
        <label className="block text-sm font-semibold">Description<textarea name="description" required defaultValue={listing.description} maxLength={500} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <button className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white">Save changes</button>
      </form>
    </main>
  );
}
