import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { listMemberships, decideMembership } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/admin/memberships")({
  head: () => ({ meta: [{ title: "HOA Memberships — Ez-ARC" }] }),
  component: AdminMembershipsPage,
});

type Row = Awaited<ReturnType<typeof listMemberships>>[number];

function AdminMembershipsPage() {
  const list = useServerFn(listMemberships);
  const decide = useServerFn(decideMembership);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await list();
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onDecide = async (row: Row, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") {
      reason = window.prompt("Rejection reason (optional)") ?? undefined;
    }
    setBusy(row.id);
    try {
      await decide({ data: { id: row.id, status, rejection_reason: reason } });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Admin</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
        HOA Memberships
      </h1>
      <p className="mt-2 text-muted-foreground">
        Approve or reject homeowner requests across your HOA communities.
      </p>

      <div className="mt-6 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-background text-brand hover:bg-surface"
            }`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No requests.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-brand">
                    {row.profile?.full_name || row.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.email} · {row.phone}
                  </p>
                  {row.hoa?.name && (
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-accent">
                      {row.hoa.name}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-brand">
                    {row.street_address}
                    {row.unit ? `, ${row.unit}` : ""}, {row.city}, {row.state} {row.zip}
                  </p>
                  {row.note && (
                    <p className="mt-2 text-sm text-muted-foreground">Note: {row.note}</p>
                  )}
                  {row.rejection_reason && (
                    <p className="mt-2 text-sm text-red-700">
                      Previous rejection: {row.rejection_reason}
                    </p>
                  )}
                </div>
                <StatusPill status={row.status} />
              </div>
              {row.status !== "approved" && (
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={busy === row.id}
                    onClick={() => onDecide(row, "approved")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  {row.status !== "rejected" && (
                    <button
                      disabled={busy === row.id}
                      onClick={() => onDecide(row, "rejected")}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
              {row.status === "approved" && (
                <div className="mt-4">
                  <button
                    disabled={busy === row.id}
                    onClick={() => onDecide(row, "rejected")}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-900", icon: Clock, label: "Pending" },
    approved: { cls: "bg-green-100 text-green-900", icon: CheckCircle2, label: "Approved" },
    rejected: { cls: "bg-red-100 text-red-900", icon: XCircle, label: "Rejected" },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${m.cls}`}
    >
      <Icon className="size-3.5" /> {m.label}
    </span>
  );
}
