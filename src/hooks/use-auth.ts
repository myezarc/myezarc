import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "homeowner" | "reviewer" | "admin" | "global_admin";
export type HoaRole = {
  hoa_id: string;
  role: "hoa_admin" | "arc_reviewer";
};
export type RoleViewMode = "global_admin" | "hoa_admin" | "arc_reviewer" | "homeowner";

const ROLE_VIEW_EMAIL = "mfuyar+globaladminarc@gmail.com";
const ROLE_VIEW_STORAGE_KEY = "ezarc_role_view_mode";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hoaRoles, setHoaRoles] = useState<HoaRole[]>([]);
  const [roleViewMode, setRoleViewModeState] = useState<RoleViewMode>("global_admin");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setSessionLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setHoaRoles([]);
      setRolesLoading(false);
      return;
    }
    let cancelled = false;
    setRolesLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const { data: scopedRoles } = await supabase
          .from("hoa_roles")
          .select("hoa_id,role")
          .eq("user_id", user.id);
        if (!cancelled) {
          setRoles((data ?? []).map((r) => r.role as AppRole));
          setHoaRoles((scopedRoles ?? []) as HoaRole[]);
        }
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ROLE_VIEW_STORAGE_KEY);
    if (
      saved === "global_admin" ||
      saved === "hoa_admin" ||
      saved === "arc_reviewer" ||
      saved === "homeowner"
    ) {
      setRoleViewModeState(saved);
    }
  }, []);

  const rawIsGlobalAdmin = roles.includes("global_admin") || roles.includes("admin");
  const rawIsHoaAdmin = hoaRoles.some((role) => role.role === "hoa_admin");
  const rawIsArcReviewer =
    roles.includes("reviewer") || hoaRoles.some((role) => role.role === "arc_reviewer");
  const canSwitchRoleView =
    rawIsGlobalAdmin && user?.email?.toLowerCase() === ROLE_VIEW_EMAIL;

  const isGlobalAdmin = canSwitchRoleView ? roleViewMode === "global_admin" : rawIsGlobalAdmin;
  const isHoaAdmin = canSwitchRoleView ? roleViewMode === "hoa_admin" : rawIsHoaAdmin;
  const isArcReviewer = canSwitchRoleView
    ? roleViewMode === "arc_reviewer"
    : rawIsArcReviewer;
  const isStaff = isGlobalAdmin || isHoaAdmin || isArcReviewer;
  const isAdmin = isGlobalAdmin || isHoaAdmin;
  const loading = sessionLoading || (!!user && rolesLoading);

  const setRoleViewMode = (mode: RoleViewMode) => {
    setRoleViewModeState(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROLE_VIEW_STORAGE_KEY, mode);
    }
  };

  return {
    session,
    user,
    loading,
    roles,
    hoaRoles,
    isStaff,
    isAdmin,
    isGlobalAdmin,
    isHoaAdmin,
    isArcReviewer,
    roleViewMode,
    setRoleViewMode,
    canSwitchRoleView,
  };
}
