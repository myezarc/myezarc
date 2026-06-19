import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RoleName = "homeowner" | "reviewer" | "admin";
type AppSupabaseClient = SupabaseClient<Database>;
type Hoa = Database["public"]["Tables"]["hoas"]["Row"];
type ApprovedMembership = Database["public"]["Tables"]["hoa_memberships"]["Row"] & {
  hoa: Pick<Hoa, "id" | "name" | "slug" | "description"> | null;
};

export async function getUserRoles(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<RoleName[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: RoleName }) => r.role);
}

export function isStaffRole(roles: RoleName[]) {
  return roles.includes("admin") || roles.includes("reviewer");
}

export function isAdminRole(roles: RoleName[]) {
  return roles.includes("admin");
}

export async function ensureAdmin(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!isAdminRole(roles)) throw new Error("Admins only");
  return roles;
}

export async function ensureStaff(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!isStaffRole(roles)) throw new Error("Forbidden");
  return roles;
}

export async function getDefaultHoa(supabase: AppSupabaseClient) {
  const { data, error } = await supabase
    .from("hoas")
    .select("id,name,slug,description")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No HOA has been configured yet.");
  return data;
}

export async function getHoaOrDefault(supabase: AppSupabaseClient, hoaId?: string | null) {
  if (!hoaId) return getDefaultHoa(supabase);
  const { data, error } = await supabase
    .from("hoas")
    .select("id,name,slug,description")
    .eq("id", hoaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("HOA not found.");
  return data;
}

export async function getApprovedMemberships(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<ApprovedMembership[]> {
  const { data, error } = await supabase
    .from("hoa_memberships")
    .select("*,hoa:hoas(id,name,slug,description)")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApprovedMembership[];
}

export async function getSubmissionHoa(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  const memberships = await getApprovedMemberships(supabase, userId);
  const membership = memberships[0];
  if (membership?.hoa_id) return membership.hoa;
  if (isStaffRole(roles)) return getDefaultHoa(supabase);
  throw new Error("Approved HOA membership is required before submitting applications.");
}

export async function getReadableHoa(
  supabase: AppSupabaseClient,
  userId: string,
  hoaId?: string | null,
) {
  const roles = await getUserRoles(supabase, userId);
  if (hoaId && isStaffRole(roles)) return getHoaOrDefault(supabase, hoaId);

  const memberships = await getApprovedMemberships(supabase, userId);
  if (hoaId) {
    const membership = memberships.find((m) => m.hoa_id === hoaId);
    if (membership?.hoa) return membership.hoa;
    throw new Error("Approved membership is required for this HOA.");
  }

  const membership = memberships[0];
  if (membership?.hoa) return membership.hoa;
  if (isStaffRole(roles)) return getDefaultHoa(supabase);
  throw new Error("Approved HOA members only");
}
