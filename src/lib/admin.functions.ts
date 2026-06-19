import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureCanManageHoa, ensureGlobalAdmin } from "@/lib/hoa-scope";

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authUsers = [];
    for (let page = 1; page < 100; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(error.message);
      authUsers.push(...(data.users ?? []));
      if (!data.users || data.users.length < 1000) break;
    }

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id,full_name,email,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const { data: hoaRoles } = await supabaseAdmin
      .from("hoa_roles")
      .select("user_id,hoa_id,role,hoa:hoas(id,name)");
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    const hoaRolesByUser = new Map<string, any[]>();
    (hoaRoles ?? []).forEach((role: any) => {
      const arr = hoaRolesByUser.get(role.user_id) ?? [];
      arr.push(role);
      hoaRolesByUser.set(role.user_id, arr);
    });
    const { data: memberships } = await supabaseAdmin
      .from("hoa_memberships")
      .select(
        "id,user_id,hoa_id,status,street_address,unit,city,state,zip,phone,email,updated_at,hoa:hoas(id,name)",
      )
      .order("updated_at", { ascending: false });
    const membershipsByUser = new Map<string, any[]>();
    (memberships ?? []).forEach((m: any) => {
      const arr = membershipsByUser.get(m.user_id) ?? [];
      arr.push(m);
      membershipsByUser.set(m.user_id, arr);
    });
    const profilesByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const userIds = new Set<string>([
      ...authUsers.map((user) => user.id),
      ...(profiles ?? []).map((profile) => profile.user_id),
      ...(roles ?? []).map((role) => role.user_id),
      ...(memberships ?? []).map((membership) => membership.user_id),
      ...(hoaRoles ?? []).map((role) => role.user_id),
    ]);

    return Array.from(userIds)
      .map((userId) => {
        const authUser = authUsers.find((user) => user.id === userId) ?? null;
        const p = profilesByUser.get(userId);
        const userMemberships = membershipsByUser.get(userId) ?? [];
        const primaryMembership =
          userMemberships.find((membership) => membership.status === "approved") ??
          userMemberships[0] ??
          null;
        const email = p?.email ?? authUser?.email ?? primaryMembership?.email ?? null;
        const createdAt = authUser?.created_at ?? p?.created_at ?? null;
        const bannedUntil = authUser?.banned_until ?? null;
        const isSuspended =
          Boolean(bannedUntil) && new Date(bannedUntil).getTime() > new Date().getTime();
        return {
          user_id: userId,
          full_name: p?.full_name ?? authUser?.user_metadata?.full_name ?? null,
          email,
          created_at: createdAt,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
          email_confirmed_at: authUser?.email_confirmed_at ?? null,
          banned_until: bannedUntil,
          is_suspended: isSuspended,
          roles: byUser.get(userId) ?? [],
          hoa_roles: hoaRolesByUser.get(userId) ?? [],
          memberships: userMemberships,
          membership_id: primaryMembership?.id ?? null,
          membership_status: primaryMembership?.status ?? null,
          phone: primaryMembership?.phone ?? null,
          address: primaryMembership
            ? [
                [primaryMembership.street_address, primaryMembership.unit]
                  .filter(Boolean)
                  .join(" "),
                primaryMembership.city,
                [primaryMembership.state, primaryMembership.zip].filter(Boolean).join(" "),
              ]
                .filter((s) => s && s.trim())
                .join(", ")
            : null,
        };
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
  });

const SuspendUserSchema = z.object({
  userId: z.string().uuid(),
  suspended: z.boolean(),
});

export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuspendUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureGlobalAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.suspended) {
      throw new Error("You cannot suspend your own Global Admin account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspended ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["homeowner", "reviewer", "admin", "global_admin"]),
  action: z.enum(["add", "remove"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
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

const HoaRoleSchema = z.object({
  userId: z.string().uuid(),
  hoaId: z.string().uuid(),
  role: z.enum(["hoa_admin", "arc_reviewer"]),
  action: z.enum(["add", "remove"]),
});

export const setHoaRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HoaRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureCanManageHoa(context.supabase, context.userId, data.hoaId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.role === "hoa_admin") {
      await ensureGlobalAdmin(context.supabase, context.userId);
    }
    if (data.action === "add") {
      if (data.role === "arc_reviewer") {
        const { data: membership, error: membershipError } = await supabaseAdmin
          .from("hoa_memberships")
          .select("id")
          .eq("user_id", data.userId)
          .eq("hoa_id", data.hoaId)
          .eq("status", "approved")
          .maybeSingle();
        if (membershipError) throw new Error(membershipError.message);
        if (!membership) {
          throw new Error("ARC reviewers must first be approved HOA members.");
        }
      }
      const { error } = await supabaseAdmin.from("hoa_roles").insert({
        user_id: data.userId,
        hoa_id: data.hoaId,
        role: data.role,
        assigned_by: context.userId,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("hoa_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("hoa_id", data.hoaId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .in("role", ["admin", "global_admin"]);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });
