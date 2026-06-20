import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllApplications } from "@/lib/applications.functions";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Review queue — Ez-ARC" }] }),
  component: ReviewRoute,
});

function ReviewRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/review") return <Outlet />;
  return <ReviewQueue />;
}

function ReviewQueue() {
  const { loading, isGlobalAdmin, isHoaAdmin, isArcReviewer, roleViewMode, actingHoaId } = useAuth();
  const list = useServerFn(listAllApplications);
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const canReview = isHoaAdmin || isArcReviewer;
  const platformOnly = isGlobalAdmin && roleViewMode === "global_admin";

  useEffect(() => {
    if (loading || platformOnly || !canReview) return;
    list({ data: { actingAs: roleViewMode, actingHoaId: actingHoaId || null } })
      .then(setItems)
      .catch((e: any) => setErr(e?.message ?? "Failed to load."));
  }, [actingHoaId, canReview, list, loading, platformOnly, roleViewMode]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (platformOnly) {
    return (
      <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold text-brand">Platform oversight only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Global Admins can view HOA structure and user roles, but not ARC application queues or
          application details.
        </p>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold text-brand">ARC reviewer access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Switch to Reviewer or HOA Admin to open the ARC review queue.
        </p>
      </div>
    );
  }

  const visible =
    items === null
      ? null
      : filter === "open"
        ? items.filter((a) => a.status === "submitted" || a.status === "in_review")
        : items;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">Review queue</h1>
      <p className="mt-2 text-muted-foreground">All applications submitted to the committee.</p>

      <div className="mt-6 flex gap-2">
        <FilterBtn active={filter === "open"} onClick={() => setFilter("open")}>
          Open
        </FilterBtn>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterBtn>
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
        {visible === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((a) => (
              <li key={a.id}>
                <Link
                  to="/review/$id"
                  params={{ id: a.id }}
                  className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.homeowner_email ?? "no email"} · {new Date(a.created_at).toLocaleString()}
                    </p>
                    {a.hoa?.name && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                        {a.hoa.name}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                  <span className="hidden text-sm font-semibold text-accent sm:inline">
                    Open details
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-brand text-brand-foreground"
          : "border border-border text-muted-foreground hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
