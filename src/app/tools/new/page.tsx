"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function NewToolPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="p-10 text-center text-slate-600">Convex configuration is required.</main>;
  const ensureUser = useMutation(api.auth.ensureUser);
  const create = useMutation(api.tools.create);
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void ensureUser({}); }, [ensureUser]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await ensureUser({});
      await create({
        name: String(data.get("name")),
        category: String(data.get("category")),
        condition: String(data.get("condition")),
        description: String(data.get("description")),
      });
      router.push("/dashboard/listings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-3xl font-bold">Create a tool listing</h1>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Field label="Tool name" name="name" required maxLength={80} />
        <label className="block text-sm font-semibold">Category
          <select name="category" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5">
            <option>Power tools</option><option>Garden</option><option>Home repair</option><option>Outdoor</option><option>Kitchen</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Condition
          <select name="condition" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5">
            <option>Excellent</option><option>Good</option><option>Fair</option><option>Needs repair</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Short description
          <textarea name="description" required maxLength={500} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Creating…" : "Create listing"}
        </button>
      </form>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="block text-sm font-semibold">{label}<input {...rest} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>;
}
