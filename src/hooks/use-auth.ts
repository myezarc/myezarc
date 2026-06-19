import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "homeowner" | "reviewer" | "admin" | "global_admin";
export type HoaRole = {
  hoa_id: string;
  role: "hoa_admin" | "arc_reviewer";
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hoaRoles, setHoaRoles] = useState<HoaRole[]>([]);

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

  const isGlobalAdmin = roles.includes("global_admin") || roles.includes("admin");
  const isHoaAdmin = hoaRoles.some((role) => role.role === "hoa_admin");
  const isArcReviewer =
    roles.includes("reviewer") || hoaRoles.some((role) => role.role === "arc_reviewer");
  const isStaff = isGlobalAdmin || isHoaAdmin || isArcReviewer;
  const isAdmin = isGlobalAdmin || isHoaAdmin;
  const loading = sessionLoading || (!!user && rolesLoading);

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
  };
}
