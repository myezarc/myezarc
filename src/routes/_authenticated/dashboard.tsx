import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Shield,
  Sparkles,
  BookOpen,
  UserCheck,
  Users,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { claimFirstAdmin, getAdminCount } from "@/lib/admin.functions";
import { useMembership } from "@/hooks/use-membership";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ez-ARC" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isStaff, isAdmin, isGlobalAdmin, roles, actingHoaId } = useAuth();
  const navigate = useNavigate();
  const { status: memberStatus, hoa, loading: membershipLoading } = useMembership();
  const hoaName = hoa?.name ?? "HOA";
  const [stats, setStats] = useState<{ mine: number; queue: number; pendingMembers: number }>({
    mine: 0,
    queue: 0,
    pendingMembers: 0,
  });
  const [hasGuideline, setHasGuideline] = useState<boolean | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [actingHoaName, setActingHoaName] = useState<string | null>(null);
  const claim = useServerFn(claimFirstAdmin);
  const fetchAdminCount = useServerFn(getAdminCount);
  const [claiming, setClaiming] = useState(false);
  const roleLabel = isGlobalAdmin
    ? "Global Admin"
    : isAdmin
      ? "HOA Admin"
      : isStaff
        ? "ARC Reviewer"
        : "Home Owner";
  const showHomeownerTools = !isGlobalAdmin && !isStaff;
  const showHomeownerHoa = !isGlobalAdmin && !isStaff && memberStatus === "approved";

  useEffect(() => {
    if (
      !membershipLoading &&
      adminCount !== null &&
      adminCount !== 0 &&
      !isStaff &&
      memberStatus === "none"
    ) {
      navigate({ to: "/membership" });
    }
  }, [membershipLoading, adminCount, isStaff, memberStatus, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count: mine } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("homeowner_id", user.id);
      let queue = 0;
      if (isStaff) {
        let query = supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .in("status", ["submitted", "in_review"]);
        if (actingHoaId) query = query.eq("hoa_id", actingHoaId);
        const { count } = await query;
        queue = count ?? 0;
      }
      let pendingMembers = 0;
      if (isAdmin) {
        let query = supabase
          .from("hoa_memberships")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (actingHoaId) query = query.eq("hoa_id", actingHoaId);
        const { count: pm } = await query;
        pendingMembers = pm ?? 0;
      }
      setStats({ mine: mine ?? 0, queue, pendingMembers });
      let guidelineQuery = supabase
        .from("hoa_guidelines")
        .select("id")
        .eq("is_active", true)
        .limit(1);
      if (actingHoaId) guidelineQuery = guidelineQuery.eq("hoa_id", actingHoaId);
      const { data: g } = await guidelineQuery;
      setHasGuideline((g ?? []).length > 0);
      if (actingHoaId) {
        const { data: selectedHoa } = await supabase
          .from("hoas")
          .select("name")
          .eq("id", actingHoaId)
          .maybeSingle();
        setActingHoaName(selectedHoa?.name ?? null);
      } else {
        setActingHoaName(null);
      }
      const ac = await fetchAdminCount();
      setAdminCount(ac);
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFullName(prof?.full_name ?? null);
    })();
  }, [actingHoaId, user, isStaff, isAdmin]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claim();
      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
      setClaiming(false);
    }
  };

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-border bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {isGlobalAdmin ? "Platform overview" : "Welcome"}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
              {isGlobalAdmin ? "Global Admin Dashboard" : `Hi${fullName ? `, ${fullName}` : ""}`}
            </h1>
            {showHomeownerHoa && (
              <p className="mt-2 inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
                HOA: {hoaName}
              </p>
            )}
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
              {isGlobalAdmin
                ? "Manage HOA accounts, memberships, guidelines, users, and review activity from one umbrella view."
                : showHomeownerHoa
                  ? `You are approved for ${hoaName}. Start a request, check your applications, or continue the ARC review workflow.`
                  : "Start a request, check your applications, or continue the ARC review workflow."}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current view
            </p>
            <p className="mt-0.5 text-sm font-bold text-brand">{roleLabel}</p>
            {actingHoaName && !isGlobalAdmin && (
              <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-accent">
                {actingHoaName}
              </p>
            )}
            {roles.length > 1 && (
              <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
                {roles.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {adminCount === 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div>
            <p className="font-display font-bold text-amber-900">No admin yet</p>
            <p className="text-sm text-amber-800">
              Claim admin to upload the HOA guideline and manage users.
            </p>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-amber-50 hover:opacity-90 disabled:opacity-50"
          >
            {claiming ? "Claiming…" : "Claim admin"}
          </button>
        </div>
      )}

      {!isGlobalAdmin && !isStaff && memberStatus && memberStatus !== "approved" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div>
            <p className="font-display font-bold text-amber-900">
              {memberStatus === "pending"
                ? "Membership pending"
                : memberStatus === "rejected"
                  ? "Membership rejected"
                  : `${hoaName} membership required`}
            </p>
            <p className="text-sm text-amber-800">
              {memberStatus === "pending"
                ? `An admin is reviewing your request to join ${hoaName}.`
                : memberStatus === "rejected"
                  ? "Update your information and resubmit."
                  : "Submit your address and contact info to be approved as a member."}
            </p>
          </div>
          <Link
            to="/membership"
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-amber-50 hover:opacity-90"
          >
            {memberStatus === "none" ? "Request membership" : "View"}
          </Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {showHomeownerTools && (
          <Card
            to="/apply"
            icon={FileText}
            title="Submit a request"
            desc={
              showHomeownerHoa
                ? `Upload your application PDF for ${hoaName} and we'll route it to your ARC committee.`
                : "Upload your application PDF and we'll route it to your ARC committee."
            }
          />
        )}
        {showHomeownerTools && (
          <Card
            to="/applications"
            icon={ClipboardList}
            title={`My applications (${stats.mine})`}
            desc="Track status, read decisions, and message the committee."
          />
        )}
        {!isGlobalAdmin && isStaff && (
          <Card
            to="/review"
            icon={Shield}
            title={`Review queue (${stats.queue})`}
            desc="Pending applications waiting for AI-assisted review."
          />
        )}
        {isGlobalAdmin && (
          <Card
            to="/admin/hoas"
            icon={Building2}
            title="HOA accounts"
            desc="Review new HOA requests and manage HOA accounts across the platform."
          />
        )}
        {!isGlobalAdmin && isAdmin && (
          <Card
            to="/admin/memberships"
            icon={UserCheck}
            title={`HOA memberships (${stats.pendingMembers})`}
            desc={
              stats.pendingMembers
                ? "Pending member requests waiting for review."
                : "Approve or reject homeowner membership requests."
            }
          />
        )}
        {!isGlobalAdmin && isAdmin && (
          <Card
            to="/admin/guidelines"
            icon={BookOpen}
            title="HOA guideline"
            desc={hasGuideline ? "Active guideline uploaded." : "Upload your HOA guideline PDF."}
          />
        )}
        {isGlobalAdmin && (
          <Card
            to="/admin/users"
            icon={Users}
            title="Users"
            desc="Manage platform users and review roles across all HOA accounts."
          />
        )}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-display font-bold text-brand">How it works</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGlobalAdmin
                ? "This umbrella account oversees HOA setup, memberships, guidelines, reviewers, and review queues across the platform."
                : "Upload your application PDF → reviewers run an AI check against the active HOA guideline → committee finalizes a decision and messages you back."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-4 grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="size-5" />
      </div>
      <p className="font-display text-lg font-bold text-brand">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
        Open <ArrowRight className="size-4" />
      </p>
    </Link>
  );
}
