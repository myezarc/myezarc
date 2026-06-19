import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { decideHoaRequest, listHoaRequests, listHoas } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/admin/hoas")({
  head: () => ({ meta: [{ title: "HOAs — Ez-ARC" }] }),
  component: HoasAdminPage,
});

type Hoa = Awaited<ReturnType<typeof listHoas>>[number];
type HoaRequest = Awaited<ReturnType<typeof listHoaRequests>>[number];

function HoasAdminPage() {
  const { isGlobalAdmin } = useAuth();
  const fetchHoas = useServerFn(listHoas);
  const fetchRequests = useServerFn(listHoaRequests);
  const decideRequest = useServerFn(decideHoaRequest);
  const [hoas, setHoas] = useState<Hoa[]>([]);
  const [requests, setRequests] = useState<HoaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );
  const handledRequests = useMemo(
    () => requests.filter((request) => request.status !== "pending"),
    [requests],
  );

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hoaRows, requestRows] = await Promise.all([fetchHoas(), fetchRequests()]);
      setHoas(hoaRows);
      setRequests(requestRows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load HOA data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGlobalAdmin) {
      setLoading(false);
      return;
    }
    refresh();
  }, [isGlobalAdmin]);

  const onDecide = async (request: HoaRequest, status: "reviewed" | "rejected") => {
    const note =
      status === "rejected" ? (window.prompt("Rejection note (optional)") ?? undefined) : undefined;
    setBusy(request.id);
    try {
      await decideRequest({ data: { id: request.id, status, admin_note: note } });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (!isGlobalAdmin) {
    return (
      <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold text-brand">Global Admin required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          HOA account management is available only to the platform Global Admin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Global Admin</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">HOA Accounts</h1>
      <p className="mt-2 text-muted-foreground">
        Review new HOA requests and monitor the HOA accounts available on the platform.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="mt-6 text-muted-foreground">Loading...</p>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-brand">New HOA requests</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approving a request creates the HOA account so homeowners can join it.
                </p>
              </div>
              <span className="rounded-lg bg-background px-3 py-1 text-sm font-bold text-brand">
                {pendingRequests.length} pending
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="mt-5 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                No pending HOA requests.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {pendingRequests.map((request) => (
                  <HoaRequestItem
                    key={request.id}
                    request={request}
                    busy={busy === request.id}
                    onApprove={() => onDecide(request, "reviewed")}
                    onReject={() => onDecide(request, "rejected")}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-background">
            <div className="border-b border-border p-5">
              <p className="font-display font-bold text-brand">Existing HOAs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hoas.length} HOA account{hoas.length === 1 ? "" : "s"} currently listed.
              </p>
            </div>
            {hoas.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No HOA accounts yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {hoas.map((hoa) => (
                  <li key={hoa.id} className="flex items-start gap-3 p-5">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand">{hoa.name}</p>
                      <p className="text-xs text-muted-foreground">{hoa.slug}</p>
                      {hoa.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{hoa.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {handledRequests.length > 0 && (
            <section className="mt-6 rounded-2xl border border-border bg-background">
              <div className="border-b border-border p-5">
                <p className="font-display font-bold text-brand">Handled requests</p>
              </div>
              <ul className="divide-y divide-border">
                {handledRequests.map((request) => (
                  <li key={request.id} className="p-5 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand">{request.requested_hoa_name}</p>
                        <p className="text-muted-foreground">{request.email}</p>
                        {request.admin_note && (
                          <p className="mt-1 text-muted-foreground">Note: {request.admin_note}</p>
                        )}
                      </div>
                      <StatusPill status={request.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6">
            <Link
              to="/admin/memberships"
              className="text-sm font-semibold text-accent hover:underline"
            >
              Manage homeowner memberships
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function HoaRequestItem({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: HoaRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li className="rounded-xl border border-border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-brand">{request.requested_hoa_name}</p>
          <p className="text-muted-foreground">
            {[request.community_address, request.city, request.state, request.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {request.contact_name ? `${request.contact_name} | ` : ""}
            {request.email} | {request.phone}
          </p>
          {request.note && <p className="mt-2 text-muted-foreground">Note: {request.note}</p>}
        </div>
        <StatusPill status={request.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={onApprove}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          Approve HOA
        </button>
        <button
          disabled={busy}
          onClick={onReject}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: string }) {
  const config =
    status === "pending"
      ? { icon: Clock, label: "Pending", cls: "bg-amber-50 text-amber-700" }
      : status === "reviewed"
        ? { icon: CheckCircle2, label: "Approved", cls: "bg-green-50 text-green-700" }
        : { icon: XCircle, label: "Rejected", cls: "bg-red-50 text-red-700" };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${config.cls}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}
