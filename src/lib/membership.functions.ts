import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ensureCanManageHoa,
  ensureGlobalAdmin,
  getHoaOrDefault,
  listManageableHoas,
} from "@/lib/hoa-scope";

const MembershipSchema = z.object({
  hoa_id: z.string().uuid().optional().nullable(),
  street_address: z.string().trim().min(2).max(200),
  unit: z.string().trim().max(50).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(50),
  zip: z.string().trim().min(3).max(20),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(255),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

const HoaRequestSchema = z.object({
  requested_hoa_name: z.string().trim().min(2).max(200),
  community_address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(50),
  zip: z.string().trim().min(3).max(20),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(255),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

const HoaInputSchema = z
  .object({ hoaId: z.string().uuid().optional().nullable() })
  .optional()
  .default({});

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HoaInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const hoa = await getHoaOrDefault(context.supabase, data?.hoaId);
    const { data: membership, error } = await context.supabase
      .from("hoa_memberships")
      .select("*")
      .eq("user_id", context.userId)
      .eq("hoa_id", hoa.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { hoa, membership: membership ?? null };
  });

export const listHoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hoas")
      .select("id,name,slug,description")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAdminHoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return listManageableHoas(context.supabase, context.userId);
  });

export const submitMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MembershipSchema.parse(input))
  .handler(async ({ data, context }) => {
    const hoa = await getHoaOrDefault(context.supabase, data.hoa_id);
    const { data: existing } = await context.supabase
      .from("hoa_memberships")
      .select("id,status")
      .eq("user_id", context.userId)
      .eq("hoa_id", hoa.id)
      .maybeSingle();

    const payload = {
      street_address: data.street_address,
      unit: data.unit || null,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      note: data.note || null,
    };

    if (!existing) {
      const { error } = await context.supabase.from("hoa_memberships").insert({
        user_id: context.userId,
        hoa_id: hoa.id,
        status: "pending",
        ...payload,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (existing.status === "approved") {
      throw new Error("Membership already approved");
    }
    if (existing.status === "pending") {
      throw new Error("Membership request already pending review");
    }
    // rejected → resubmit
    const { error } = await context.supabase
      .from("hoa_memberships")
      .update({
        status: "pending",
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        ...payload,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitHoaRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HoaRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing, error: existingError } = await context.supabase
      .from("hoa_requests")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .ilike("requested_hoa_name", data.requested_hoa_name)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) {
      throw new Error("You already have a pending request for this HOA.");
    }

    const { error } = await context.supabase.from("hoa_requests").insert({
      user_id: context.userId,
      requested_hoa_name: data.requested_hoa_name,
      community_address: data.community_address || null,
      city: data.city,
      state: data.state,
      zip: data.zip,
      contact_name: data.contact_name || null,
      phone: data.phone,
      email: data.email,
      note: data.note || null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const manageableHoas = await listManageableHoas(context.supabase, context.userId);
    if (manageableHoas.length === 0) throw new Error("HOA admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("hoa_memberships")
      .select("*,hoa:hoas(id,name,slug)")
      .order("created_at", { ascending: false });
    const hoaIds = manageableHoas.map((hoa) => hoa.id);
    if (hoaIds.length > 0) query = query.in("hoa_id", hoaIds);
    const { data: memberships, error } = await query;
    if (error) throw new Error(error.message);
    const { data: hoaRoles } = await supabaseAdmin
      .from("hoa_roles")
      .select("user_id,hoa_id,role")
      .in("hoa_id", hoaIds.length ? hoaIds : ["00000000-0000-0000-0000-000000000000"]);
    const userIds = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id,full_name,email")
          .in("user_id", userIds)
      : { data: [] as any[] };
    const byUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    return (memberships ?? []).map((m) => ({
      ...m,
      profile: byUser.get(m.user_id) ?? null,
      hoa_roles: (hoaRoles ?? []).filter(
        (role) => role.user_id === m.user_id && role.hoa_id === m.hoa_id,
      ),
    }));
  });

export const listHoaRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: requests, error } = await supabaseAdmin
      .from("hoa_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return requests ?? [];
  });

const DecideHoaRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["reviewed", "rejected"]),
  admin_note: z.string().trim().max(500).optional().or(z.literal("")),
});

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `hoa-${Date.now()}`;
}

export const decideHoaRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DecideHoaRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error: requestError } = await supabaseAdmin
      .from("hoa_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) throw new Error("HOA request not found");

    if (data.status === "reviewed") {
      const baseSlug = slugify(request.requested_hoa_name);
      let slug = baseSlug;
      for (let i = 2; i < 100; i += 1) {
        const { data: existing } = await supabaseAdmin
          .from("hoas")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${i}`;
      }

      const description = [
        request.community_address,
        request.city,
        request.state,
        request.zip,
      ]
        .filter(Boolean)
        .join(", ");
      const { error: hoaError } = await supabaseAdmin.from("hoas").insert({
        name: request.requested_hoa_name,
        slug,
        description: description || null,
      });
      if (hoaError) throw new Error(hoaError.message);
    }

    const { error } = await supabaseAdmin
      .from("hoa_requests")
      .update({
        status: data.status,
        admin_note: data.admin_note || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DecideSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const decideMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DecideSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("hoa_memberships")
      .select("hoa_id")
      .eq("id", data.id)
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership) throw new Error("Membership not found");
    await ensureCanManageHoa(context.supabase, context.userId, membership.hoa_id);
    const { data: updated, error } = await supabaseAdmin
      .from("hoa_memberships")
      .update({
        status: data.status,
        rejection_reason: data.status === "rejected" ? data.rejection_reason || null : null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) throw new Error("Membership not found or update blocked");
    return { ok: true };
  });
