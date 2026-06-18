import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyMembership } from "@/lib/membership.functions";
import { useAuth } from "@/hooks/use-auth";

export type MembershipStatus = "pending" | "approved" | "rejected" | "none";

export function useMembership() {
  const { user, isStaff, loading: authLoading } = useAuth();
  const fetchMembership = useServerFn(getMyMembership);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || isStaff) {
      setStatus(isStaff ? "approved" : null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchMembership();
        if (cancelled) return;
        setStatus(res.membership ? (res.membership.status as MembershipStatus) : "none");
      } catch {
        if (!cancelled) setStatus("none");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isStaff, authLoading, fetchMembership]);

  return { status, loading, isStaff };
}
