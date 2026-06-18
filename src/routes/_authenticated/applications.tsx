import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyApplications } from "@/lib/applications.functions";
import { StatusBadge } from "@/components/status-badge";
import { FileText } from "lucide-react";

import { MembershipGate } from "@/components/membership-gate";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "My applications — Ez-ARC" }] }),
  component: () => (
    <MembershipGate>
      <ApplicationsList />
    </MembershipGate>
  ),
});

function ApplicationsList() {
  const list = useServerFn(listMyApplications);
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    list()
      .then(setItems)
      .catch((e: any) => setErr(e?.message ?? "Failed to load."));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">My applications</h1>
      <p className="mt-2 text-muted-foreground">
        Every architectural request you've submitted.
      </p>

      <div className="mt-6 flex justify-end">
        <Link
          to="/apply"
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground hover:opacity-90"
        >
          New application
        </Link>
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
        {items === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent">
              <FileText className="size-5" />
            </div>
            <p className="font-display text-lg font-bold text-brand">No applications yet</p>
            <Link to="/apply" className="text-sm font-semibold text-accent hover:underline">
              Submit your first application →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  to="/applications/$id"
                  params={{ id: a.id }}
                  className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
