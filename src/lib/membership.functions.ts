import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAdmin, getHoaOrDefault } from "@/lib/hoa-scope";

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

export const listMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: memberships, error } = await supabaseAdmin
      .from("hoa_memberships")
      .select("*,hoa:hoas(id,name,slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
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
    }));
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
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
