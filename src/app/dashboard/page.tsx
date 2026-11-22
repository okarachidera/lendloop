import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <h1 className="text-4xl font-bold">Your dashboard</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashLink href="/dashboard/listings" title="My listings" text="Create and manage shared tools" />
        <DashLink href="/dashboard/requests" title="My requests" text="Track tools you want to borrow" />
        <DashLink href="/dashboard/incoming" title="Incoming requests" text="Approve or decline lender requests" />
        <DashLink href="/admin" title="Admin" text="Review platform activity" />
      </div>
    </main>
  );
}

function DashLink({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"><p className="font-bold text-slate-950">{title}</p><p className="mt-2 text-sm text-slate-600">{text}</p><p className="mt-5 text-sm font-semibold text-emerald-700">Open →</p></Link>;
}
