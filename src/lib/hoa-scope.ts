import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RoleName = "homeowner" | "reviewer" | "admin" | "global_admin";
export type HoaRoleName = "hoa_admin" | "arc_reviewer";
type AppSupabaseClient = SupabaseClient<Database>;
type Hoa = Database["public"]["Tables"]["hoas"]["Row"];
type HoaRole = Database["public"]["Tables"]["hoa_roles"]["Row"] & {
  hoa: Pick<Hoa, "id" | "name" | "slug" | "description"> | null;
};
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

export async function getUserHoaRoles(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<HoaRole[]> {
  const { data, error } = await supabase
    .from("hoa_roles")
    .select("*,hoa:hoas(id,name,slug,description)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as HoaRole[];
}

export function isStaffRole(roles: RoleName[]) {
  return roles.includes("global_admin") || roles.includes("admin") || roles.includes("reviewer");
}

export function isGlobalAdminRole(roles: RoleName[]) {
  return roles.includes("global_admin") || roles.includes("admin");
}

export async function ensureGlobalAdmin(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!isGlobalAdminRole(roles)) throw new Error("Global admin access required");
  return roles;
}

export const ensureAdmin = ensureGlobalAdmin;

export async function ensureStaff(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  const hoaRoles = await getUserHoaRoles(supabase, userId);
  if (!isStaffRole(roles) && hoaRoles.length === 0) throw new Error("Forbidden");
  return roles;
}

export async function canManageHoa(supabase: AppSupabaseClient, userId: string, hoaId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (isGlobalAdminRole(roles)) return true;
  const hoaRoles = await getUserHoaRoles(supabase, userId);
  return hoaRoles.some((role) => role.hoa_id === hoaId && role.role === "hoa_admin");
}

export async function canReviewHoa(supabase: AppSupabaseClient, userId: string, hoaId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (isGlobalAdminRole(roles) || roles.includes("reviewer")) return true;
  const hoaRoles = await getUserHoaRoles(supabase, userId);
  return hoaRoles.some(
    (role) => role.hoa_id === hoaId && (role.role === "hoa_admin" || role.role === "arc_reviewer"),
  );
}

export async function ensureCanManageHoa(
  supabase: AppSupabaseClient,
  userId: string,
  hoaId: string,
) {
  if (!(await canManageHoa(supabase, userId, hoaId))) {
    throw new Error("HOA admin access required");
  }
}

export async function ensureCanReviewHoa(
  supabase: AppSupabaseClient,
  userId: string,
  hoaId: string,
) {
  if (!(await canReviewHoa(supabase, userId, hoaId))) {
    throw new Error("ARC reviewer access required");
  }
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

export async function listManageableHoas(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (isGlobalAdminRole(roles)) {
    const { data, error } = await supabase
      .from("hoas")
      .select("id,name,slug,description")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const hoaRoles = await getUserHoaRoles(supabase, userId);
  return hoaRoles.filter((role) => role.role === "hoa_admin" && role.hoa).map((role) => role.hoa!);
}

export async function listReviewableHoas(supabase: AppSupabaseClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (isGlobalAdminRole(roles) || roles.includes("reviewer")) {
    const { data, error } = await supabase
      .from("hoas")
      .select("id,name,slug,description")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const hoaRoles = await getUserHoaRoles(supabase, userId);
  return hoaRoles
    .filter((role) => (role.role === "hoa_admin" || role.role === "arc_reviewer") && role.hoa)
    .map((role) => role.hoa!);
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
  if (hoaId && (await canReviewHoa(supabase, userId, hoaId)))
    return getHoaOrDefault(supabase, hoaId);

  const memberships = await getApprovedMemberships(supabase, userId);
  if (hoaId) {
    const membership = memberships.find((m) => m.hoa_id === hoaId);
    if (membership?.hoa) return membership.hoa;
    throw new Error("Approved membership is required for this HOA.");
  }

  const membership = memberships[0];
  if (membership?.hoa) return membership.hoa;
  const reviewable = await listReviewableHoas(supabase, userId);
  if (reviewable[0]) return reviewable[0];
  throw new Error("Approved HOA members only");
}
