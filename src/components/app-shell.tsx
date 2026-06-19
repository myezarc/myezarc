import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  LogOut,
  Home,
  FileText,
  ClipboardList,
  Shield,
  Users,
  BookOpen,
  UserCheck,
  FolderDown,
  Github,
  Building2,
} from "lucide-react";
import { type RoleViewMode, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    isStaff,
    isAdmin,
    isGlobalAdmin,
    isArcReviewer,
    canSwitchRoleView,
    roleViewMode,
    setRoleViewMode,
  } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const showHomeownerTools = !isGlobalAdmin;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-brand">
              <div className="size-3 rotate-45 border-2 border-brand-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-brand">Ez-ARC</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" icon={Home} label="Dashboard" />
            {showHomeownerTools && <NavLink to="/apply" icon={FileText} label="New application" />}
            {showHomeownerTools && (
              <NavLink to="/applications" icon={ClipboardList} label="My applications" />
            )}
            {showHomeownerTools && !isStaff && (
              <NavLink to="/membership" icon={UserCheck} label="Membership" />
            )}
            <NavLink to="/resources" icon={FolderDown} label="Resources" />
            {(isArcReviewer || isAdmin) && (
              <NavLink to="/review" icon={Shield} label="Review queue" />
            )}
            {isGlobalAdmin && <NavLink to="/admin/hoas" icon={Building2} label="HOAs" />}
            {isAdmin && <NavLink to="/admin/memberships" icon={UserCheck} label="Memberships" />}
            {isAdmin && <NavLink to="/admin/guidelines" icon={BookOpen} label="Guidelines" />}
            {isGlobalAdmin && <NavLink to="/admin/users" icon={Users} label="Users" />}
            <NavLink to="/github-setup" icon={Github} label="GitHub" />
          </nav>
          <div className="flex items-center gap-3">
            {canSwitchRoleView && (
              <RoleViewSelect value={roleViewMode} onChange={setRoleViewMode} />
            )}
            <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-surface"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 pb-3 md:hidden">
          <NavLink to="/dashboard" icon={Home} label="Home" />
          {showHomeownerTools && <NavLink to="/apply" icon={FileText} label="New" />}
          {showHomeownerTools && <NavLink to="/applications" icon={ClipboardList} label="Mine" />}
          {showHomeownerTools && !isStaff && (
            <NavLink to="/membership" icon={UserCheck} label="HOA" />
          )}
          <NavLink to="/resources" icon={FolderDown} label="Files" />
          {(isArcReviewer || isAdmin) && <NavLink to="/review" icon={Shield} label="Queue" />}
          {isGlobalAdmin && <NavLink to="/admin/hoas" icon={Building2} label="HOAs" />}
          {isAdmin && <NavLink to="/admin/memberships" icon={UserCheck} label="Members" />}
          {isAdmin && <NavLink to="/admin/guidelines" icon={BookOpen} label="Guide" />}
          {isGlobalAdmin && <NavLink to="/admin/users" icon={Users} label="Users" />}
          <NavLink to="/github-setup" icon={Github} label="GitHub" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-12">{children}</main>
    </div>
  );
}

function RoleViewSelect({
  value,
  onChange,
}: {
  value: RoleViewMode;
  onChange: (value: RoleViewMode) => void;
}) {
  return (
    <label className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground lg:inline-flex">
      Act as
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RoleViewMode)}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-brand outline-none focus:border-accent"
      >
        <option value="global_admin">Global Admin</option>
        <option value="hoa_admin">HOA Admin</option>
        <option value="arc_reviewer">Reviewer</option>
        <option value="homeowner">Home Owner</option>
      </select>
    </label>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-surface text-brand" }}
      activeOptions={{ exact: false }}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-brand"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
