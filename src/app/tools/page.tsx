"use client";

import { useState } from "react";
import { ToolGrid } from "@/components/tool-grid";

const categories = ["All", "Power tools", "Garden", "Home repair", "Outdoor", "Kitchen"];

export default function ToolsPage() {
  const [category, setCategory] = useState("All");
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-4xl font-bold text-slate-950">Browse tools</h1>
      <p className="mt-2 text-slate-600">Find the right tool for your next project.</p>
      <div className="my-8 flex flex-wrap gap-2" aria-label="Tool categories">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              category === item ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <ToolGrid category={category === "All" ? undefined : category} />
    </main>
  );
}
