"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export function ToolGrid({
  limit,
  category,
}: {
  publicOnly?: boolean;
  limit?: number;
  category?: string;
}) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
        Connect Convex to display available tools.
      </div>
    );
  }
  const tools = useQuery(api.tools.publicList, {
    category: category || undefined,
  });
  if (tools === undefined) {
    return <div className="py-10 text-center text-sm text-slate-500">Loading tools…</div>;
  }
  if (!tools.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
        No tools are available yet.
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.slice(0, limit).map((tool: any) => (
        <Link
          key={tool._id}
          href={`/tools/${tool._id}`}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{tool.category}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Available" />
          </div>
          <h3 className="text-lg font-bold text-slate-950">{tool.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Condition: {tool.condition}</p>
        </Link>
      ))}
    </div>
  );
}
