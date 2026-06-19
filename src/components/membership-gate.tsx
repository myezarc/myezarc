import { Link } from "@tanstack/react-router";
import { Clock, XCircle, UserPlus } from "lucide-react";
import { useMembership } from "@/hooks/use-membership";

export function MembershipGate({ children }: { children: React.ReactNode }) {
  const { status, loading, isStaff, hoa } = useMembership();
  const hoaName = hoa?.name ?? "your HOA";

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (isStaff || status === "approved") return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{hoaName}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
        Membership required
      </h1>

      {status === "none" && (
        <Card
          icon={UserPlus}
          title={`Join ${hoaName}`}
          body="To file ARC applications, please request membership. Submit your address and contact info — an admin will review."
          to="/membership"
          cta="Request membership"
        />
      )}
      {status === "pending" && (
        <Card
          icon={Clock}
          title="Pending approval"
          body="Your membership request is waiting on an admin. You'll get full access as soon as it's approved."
          to="/membership"
          cta="View request"
          tone="amber"
        />
      )}
      {status === "rejected" && (
        <Card
          icon={XCircle}
          title="Request was rejected"
          body="Update your information and resubmit for review."
          to="/membership"
          cta="Update & resubmit"
          tone="red"
        />
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  to,
  cta,
  tone,
}: {
  icon: any;
  title: string;
  body: string;
  to: string;
  cta: string;
  tone?: "amber" | "red";
}) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "red"
        ? "border-red-200 bg-red-50"
        : "border-border bg-surface";
  return (
    <div className={`mt-6 rounded-2xl border p-6 ${cls}`}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-brand">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          <Link
            to={to}
            className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:opacity-90"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
