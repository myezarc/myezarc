import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!(roles ?? []).some((r: { role: string }) => r.role === "admin"))
    throw new Error("Admins only");
}

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id,full_name,email,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role");
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    const { data: memberships } = await supabaseAdmin
      .from("hoa_memberships")
      .select("id,user_id,status,street_address,unit,city,state,zip,phone,email,updated_at")
      .order("updated_at", { ascending: false });
    const memByUser = new Map<string, any>();
    (memberships ?? []).forEach((m: any) => {
      const existing = memByUser.get(m.user_id);
      if (!existing || (m.status === "approved" && existing.status !== "approved")) {
        memByUser.set(m.user_id, m);
      }
    });
    return (profiles ?? []).map((p) => {
      const m = memByUser.get(p.user_id);
      return {
        ...p,
        roles: byUser.get(p.user_id) ?? [],
        membership_status: m?.status ?? null,
        phone: m?.phone ?? null,
        address: m
          ? [
              [m.street_address, m.unit].filter(Boolean).join(" "),
              m.city,
              [m.state, m.zip].filter(Boolean).join(" "),
            ]
              .filter((s) => s && s.trim())
              .join(", ")
          : null,
      };
    });
  });

const RoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["homeowner", "reviewer", "admin"]),
  action: z.enum(["add", "remove"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate"))
        throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new Error("An admin already exists.");
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });
