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
const ACTING_HOA_STORAGE_KEY = "ezarc_acting_hoa_id";
const AUTH_CONTEXT_EVENT = "ezarc-auth-context-change";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hoaRoles, setHoaRoles] = useState<HoaRole[]>([]);
  const [roleViewMode, setRoleViewModeState] = useState<RoleViewMode>("global_admin");
  const [actingHoaId, setActingHoaIdState] = useState<string>("");

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
    setActingHoaIdState(window.localStorage.getItem(ACTING_HOA_STORAGE_KEY) ?? "");

    const sync = () => {
      const nextMode = window.localStorage.getItem(ROLE_VIEW_STORAGE_KEY);
      if (
        nextMode === "global_admin" ||
        nextMode === "hoa_admin" ||
        nextMode === "arc_reviewer" ||
        nextMode === "homeowner"
      ) {
        setRoleViewModeState(nextMode);
      }
      setActingHoaIdState(window.localStorage.getItem(ACTING_HOA_STORAGE_KEY) ?? "");
    };
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_CONTEXT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_CONTEXT_EVENT, sync);
    };
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
      window.dispatchEvent(new Event(AUTH_CONTEXT_EVENT));
    }
  };

  const setActingHoaId = (hoaId: string) => {
    setActingHoaIdState(hoaId);
    if (typeof window !== "undefined") {
      if (hoaId) window.localStorage.setItem(ACTING_HOA_STORAGE_KEY, hoaId);
      else window.localStorage.removeItem(ACTING_HOA_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_CONTEXT_EVENT));
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
    actingHoaId,
    setActingHoaId,
    canSwitchRoleView,
  };
}
