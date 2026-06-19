import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, setUserRole, setUserSuspended } from "@/lib/admin.functions";
import { decideMembership } from "@/lib/membership.functions";
import { Loader2, Search, ShieldOff, ShieldCheck } from "lucide-react";

const ROLES = ["homeowner", "reviewer", "admin", "global_admin"] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Ez-ARC" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const list = useServerFn(listUsersWithRoles);
  const setRole = useServerFn(setUserRole);
  const setSuspended = useServerFn(setUserSuspended);
  const decide = useServerFn(decideMembership);
  const [users, setUsers] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  const reload = () =>
    list()
      .then(setUsers)
      .catch((e: any) => setErr(e?.message ?? "Failed"));
  useEffect(() => {
    reload();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      if (statusFilter === "active" && user.is_suspended) return false;
      if (statusFilter === "suspended" && !user.is_suspended) return false;
      if (!q) return true;
      const haystack = [
        user.full_name,
        user.email,
        user.user_id,
        user.phone,
        user.address,
        ...(user.roles ?? []),
        ...(user.memberships ?? []).map((membership: any) => membership.hoa?.name),
        ...(user.hoa_roles ?? []).map((role: any) => `${role.hoa?.name} ${role.role}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query, statusFilter]);

  const toggle = async (userId: string, role: (typeof ROLES)[number], hasIt: boolean) => {
    setBusy(`${userId}:${role}`);
    try {
      await setRole({ data: { userId, role, action: hasIt ? "remove" : "add" } });
      await reload();
    } catch (e: any) {
      alert(e?.message);
    } finally {
      setBusy(null);
    }
  };

  const decideMember = async (membershipId: string, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") {
      reason = window.prompt("Rejection reason (optional)") ?? undefined;
    }
    setBusy(`m:${membershipId}`);
    try {
      await decide({ data: { id: membershipId, status, rejection_reason: reason } });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleSuspended = async (user: any) => {
    const nextSuspended = !user.is_suspended;
    if (
      nextSuspended &&
      !window.confirm(`Suspend ${user.email ?? user.user_id}? They will not be able to sign in.`)
    ) {
      return;
    }
    setBusy(`s:${user.user_id}`);
    try {
      await setSuspended({ data: { userId: user.user_id, suspended: nextSuspended } });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">Users & roles</h1>
      <p className="mt-2 text-muted-foreground">
        Global Admins can see every account, HOA membership, scoped HOA role, and suspended account
        status across the platform.
      </p>

      {err && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users, HOA, role, email, phone"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <div className="flex rounded-xl border border-border bg-background p-1">
          {(["all", "active", "suspended"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-8 rounded-lg px-3 text-xs font-bold uppercase tracking-wider ${
                statusFilter === status
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-surface"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background">
        {users === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No users match this view.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredUsers.map((u) => (
              <li key={u.user_id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-brand">
                        {u.full_name || u.email || u.user_id}
                      </p>
                      <AccountPill suspended={u.is_suspended} />
                    </div>
                    {u.email && <p className="mt-0.5 text-xs text-muted-foreground">{u.email}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{u.user_id}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Joined {formatDate(u.created_at)}</span>
                      <span>Last sign-in {formatDate(u.last_sign_in_at)}</span>
                      <span>
                        {u.email_confirmed_at ? "Email confirmed" : "Email not confirmed"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSuspended(u)}
                    disabled={busy === `s:${u.user_id}`}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold disabled:opacity-50 ${
                      u.is_suspended
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {busy === `s:${u.user_id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : u.is_suspended ? (
                      <ShieldCheck className="size-4" />
                    ) : (
                      <ShieldOff className="size-4" />
                    )}
                    {u.is_suspended ? "Restore" : "Suspend"}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <section>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      HOA memberships
                    </p>
                    <div className="mt-2 space-y-2">
                      {u.memberships?.length ? (
                        u.memberships.map((membership: any) => (
                          <div
                            key={membership.id}
                            className="rounded-xl border border-border bg-surface p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-brand">
                                  {membership.hoa?.name ?? "HOA"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {[membership.street_address, membership.unit]
                                    .filter(Boolean)
                                    .join(" ")}
                                  {membership.city ? `, ${membership.city}` : ""}
                                  {membership.state ? `, ${membership.state}` : ""}
                                  {membership.zip ? ` ${membership.zip}` : ""}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {membership.email}{" "}
                                  {membership.phone ? `| ${membership.phone}` : ""}
                                </p>
                              </div>
                              <MembershipPill status={membership.status} />
                            </div>
                            {membership.status !== "approved" && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => decideMember(membership.id, "approved")}
                                  disabled={busy === `m:${membership.id}`}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {busy === `m:${membership.id}` && (
                                    <Loader2 className="size-3 animate-spin" />
                                  )}
                                  Approve
                                </button>
                                {membership.status === "pending" && (
                                  <button
                                    onClick={() => decideMember(membership.id, "rejected")}
                                    disabled={busy === `m:${membership.id}`}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-surface disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                          No HOA membership.
                        </p>
                      )}
                    </div>
                  </section>

                  <section>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Roles
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        const k = `${u.user_id}:${r}`;
                        return (
                          <button
                            key={r}
                            onClick={() => toggle(u.user_id, r, has)}
                            disabled={busy === k}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                              has
                                ? "bg-brand text-brand-foreground"
                                : "border border-border bg-surface text-muted-foreground hover:bg-background"
                            }`}
                          >
                            {busy === k && <Loader2 className="size-3 animate-spin" />}
                            {r}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        HOA scoped roles
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {u.hoa_roles?.length ? (
                          u.hoa_roles.map((role: any) => (
                            <span
                              key={`${role.hoa_id}:${role.role}`}
                              className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
                            >
                              {role.hoa?.name ?? "HOA"}: {role.role}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No scoped HOA role.</span>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleDateString();
}

function AccountPill({ suspended }: { suspended: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function MembershipPill({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}
