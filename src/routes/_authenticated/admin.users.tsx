import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, setUserRole } from "@/lib/admin.functions";
import { decideMembership } from "@/lib/membership.functions";
import { Loader2 } from "lucide-react";

const ROLES = ["homeowner", "reviewer", "admin", "global_admin"] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Ez-ARC" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const list = useServerFn(listUsersWithRoles);
  const setRole = useServerFn(setUserRole);
  const decide = useServerFn(decideMembership);
  const [users, setUsers] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => list().then(setUsers).catch((e: any) => setErr(e?.message ?? "Failed"));
  useEffect(() => {
    reload();
  }, []);

  const toggle = async (userId: string, role: typeof ROLES[number], hasIt: boolean) => {
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


  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">Users & roles</h1>
      <p className="mt-2 text-muted-foreground">
        Global Admins manage platform roles and new HOA requests. HOA Admin and ARC Reviewer
        roles are assigned from the Memberships screen.
      </p>

      {err && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
        {users === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Address</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="p-4 align-top">
                    <p className="font-semibold text-brand">{u.full_name || u.email || u.user_id}</p>
                    {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    {u.membership_status && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            u.membership_status === "approved"
                              ? "text-emerald-700"
                              : u.membership_status === "rejected"
                                ? "text-red-700"
                                : "text-amber-700"
                          }`}
                        >
                          {u.membership_status}
                        </span>
                        {u.membership_id && u.membership_status !== "approved" && (
                          <button
                            onClick={() => decideMember(u.membership_id, "approved")}
                            disabled={busy === `m:${u.membership_id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy === `m:${u.membership_id}` && <Loader2 className="size-3 animate-spin" />}
                            Approve
                          </button>
                        )}
                        {u.membership_id && u.membership_status === "pending" && (
                          <button
                            onClick={() => decideMember(u.membership_id, "rejected")}
                            disabled={busy === `m:${u.membership_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-background disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top text-xs text-muted-foreground">
                    {u.address || <span className="italic">—</span>}
                  </td>
                  <td className="p-4 align-top text-xs text-muted-foreground">
                    {u.phone || <span className="italic">—</span>}
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        const k = `${u.user_id}:${r}`;
                        return (
                          <button
                            key={r}
                            onClick={() => toggle(u.user_id, r, has)}
                            disabled={busy === k}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
