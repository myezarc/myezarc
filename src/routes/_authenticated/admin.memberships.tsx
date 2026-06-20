import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { setHoaRole } from "@/lib/admin.functions";
import {
  decideHoaRequest,
  decideMembership,
  listHoaRequests,
  listMemberships,
} from "@/lib/membership.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/memberships")({
  head: () => ({ meta: [{ title: "HOA Memberships — Ez-ARC" }] }),
  component: AdminMembershipsPage,
});

type Row = Awaited<ReturnType<typeof listMemberships>>[number];
type HoaRequest = Awaited<ReturnType<typeof listHoaRequests>>[number];

function AdminMembershipsPage() {
  const list = useServerFn(listMemberships);
  const listRequests = useServerFn(listHoaRequests);
  const decide = useServerFn(decideMembership);
  const decideRequest = useServerFn(decideHoaRequest);
  const setRole = useServerFn(setHoaRole);
  const { isGlobalAdmin, actingHoaId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [hoaRequests, setHoaRequests] = useState<HoaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const refresh = async () => {
    setLoading(true);
    try {
      const [data, requests] = await Promise.all([
        list({ data: { hoaId: actingHoaId || null } }),
        isGlobalAdmin ? listRequests() : Promise.resolve([]),
      ]);
      setRows(data);
      setHoaRequests(requests);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewer = async (row: Row) => {
    const hasReviewer = row.hoa_roles?.some((role: any) => role.role === "arc_reviewer");
    setBusy(`r:${row.id}`);
    try {
      await setRole({
        data: {
          userId: row.user_id,
          hoaId: row.hoa_id,
          role: "arc_reviewer",
          action: hasReviewer ? "remove" : "add",
        },
      });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onDecideHoaRequest = async (request: HoaRequest, status: "reviewed" | "rejected") => {
    const note =
      status === "rejected" ? window.prompt("Rejection note (optional)") ?? undefined : undefined;
    setBusy(`h:${request.id}`);
    try {
      await decideRequest({ data: { id: request.id, status, admin_note: note } });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    refresh();
  }, [actingHoaId]);

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

      {hoaRequests.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <p className="font-display font-bold text-brand">New HOA requests</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Homeowners submitted these because their HOA was not listed.
          </p>
          <ul className="mt-4 space-y-3">
            {hoaRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-xl border border-border bg-background p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand">{request.requested_hoa_name}</p>
                    <p className="text-muted-foreground">
                      {[request.community_address, request.city, request.state, request.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {request.contact_name ? `${request.contact_name} · ` : ""}
                      {request.email} · {request.phone}
                    </p>
                    {request.note && (
                      <p className="mt-2 text-muted-foreground">Note: {request.note}</p>
                    )}
                  </div>
                  <StatusPill status={request.status} />
                </div>
                {request.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy === `h:${request.id}`}
                      onClick={() => onDecideHoaRequest(request, "reviewed")}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Approve HOA
                    </button>
                    <button
                      disabled={busy === `h:${request.id}`}
                      onClick={() => onDecideHoaRequest(request, "rejected")}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-bold text-brand">
                      {row.profile?.full_name || row.email}
                    </p>
                    {row.hoa?.name && (
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                        HOA: {row.hoa.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.email} · {row.phone}
                  </p>
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
                <StatusPill status={row.status} hoaName={row.hoa?.name} />
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={busy === `r:${row.id}`}
                    onClick={() => toggleReviewer(row)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-brand hover:bg-surface disabled:opacity-50"
                  >
                    {row.hoa_roles?.some((role: any) => role.role === "arc_reviewer")
                      ? "Remove ARC reviewer"
                      : "Make ARC reviewer"}
                  </button>
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

function StatusPill({ status, hoaName }: { status: string; hoaName?: string | null }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-900", icon: Clock, label: "Pending" },
    approved: { cls: "bg-green-100 text-green-900", icon: CheckCircle2, label: "Approved" },
    reviewed: { cls: "bg-green-100 text-green-900", icon: CheckCircle2, label: "Reviewed" },
    rejected: { cls: "bg-red-100 text-red-900", icon: XCircle, label: "Rejected" },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.icon;
  const label = hoaName ? `${m.label} for ${hoaName}` : m.label;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${m.cls}`}
    >
      <Icon className="size-3.5" /> {label}
    </span>
  );
}
