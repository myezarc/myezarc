import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureMember(supabase: any, userId: string) {
  const [{ data: roles }, { data: m }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("hoa_memberships")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
  ]);
  const isStaff = (roles ?? []).some((r: { role: string }) =>
    ["admin", "reviewer"].includes(r.role),
  );
  if (!isStaff && !m) throw new Error("Approved HOA members only");
}

export const getMemberResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureMember(context.supabase, context.userId);
    const [{ data: g }, { data: f }] = await Promise.all([
      context.supabase
        .from("hoa_guidelines")
        .select("id,title,storage_path,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("hoa_forms")
        .select("id,title,storage_path,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const sign = async (path: string | null | undefined) => {
      if (!path) return null;
      const { data, error } = await context.supabase.storage
        .from("arc-documents")
        .createSignedUrl(path, 60 * 10);
      if (error) return null;
      return data?.signedUrl ?? null;
    };
    return {
      guideline: g
        ? { id: g.id, title: g.title, created_at: g.created_at, url: await sign(g.storage_path) }
        : null,
      arcForm: f
        ? { id: f.id, title: f.title, created_at: f.created_at, url: await sign(f.storage_path) }
        : null,
    };
  });

const UploadFormSchema = z.object({
  title: z.string().trim().min(2).max(200),
  storagePath: z.string().min(1).max(1000),
});

export const uploadArcForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadFormSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin"))
      throw new Error("Admins only");

    await supabase.from("hoa_forms").update({ is_active: false }).eq("is_active", true);
    const { data: row, error } = await supabase
      .from("hoa_forms")
      .insert({
        title: data.title,
        storage_path: data.storagePath,
        is_active: true,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getActiveArcForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("hoa_forms")
      .select("id,title,storage_path,is_active,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });
