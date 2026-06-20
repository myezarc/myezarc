import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ensureCanManageHoa,
  getHoaOrDefault,
  getReadableHoa,
  getUserRoles,
  isGlobalAdminRole,
} from "@/lib/hoa-scope";

const ResourceInputSchema = z
  .object({
    hoaId: z.string().uuid().optional().nullable(),
    actingAs: z.enum(["global_admin", "hoa_admin", "arc_reviewer", "homeowner"]).optional(),
  })
  .optional()
  .default({});

export const getMemberResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResourceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await getUserRoles(context.supabase, context.userId);
    const hoa =
      data?.hoaId && data.actingAs !== "global_admin" && isGlobalAdminRole(roles)
        ? await getHoaOrDefault(context.supabase, data.hoaId)
        : await getReadableHoa(context.supabase, context.userId, data?.hoaId);
    const [{ data: g }, { data: f }] = await Promise.all([
      context.supabase
        .from("hoa_guidelines")
        .select("id,title,storage_path,created_at")
        .eq("hoa_id", hoa.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("hoa_forms")
        .select("id,title,storage_path,created_at")
        .eq("hoa_id", hoa.id)
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
      hoa,
      guideline: g
        ? { id: g.id, title: g.title, created_at: g.created_at, url: await sign(g.storage_path) }
        : null,
      arcForm: f
        ? { id: f.id, title: f.title, created_at: f.created_at, url: await sign(f.storage_path) }
        : null,
    };
  });

const UploadFormSchema = z.object({
  hoaId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  storagePath: z.string().min(1).max(1000),
});

const HoaInputSchema = z
  .object({ hoaId: z.string().uuid().optional().nullable() })
  .optional()
  .default({});

export const uploadArcForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadFormSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hoa = await getHoaOrDefault(supabase, data.hoaId);
    await ensureCanManageHoa(supabase, userId, hoa.id);

    const { data: id, error } = await supabase.rpc("activate_hoa_form", {
      _hoa_id: hoa.id,
      _title: data.title,
      _storage_path: data.storagePath,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const getActiveArcForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HoaInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const hoa = await getReadableHoa(context.supabase, context.userId, data?.hoaId);
    const { data: form } = await context.supabase
      .from("hoa_forms")
      .select("id,title,storage_path,is_active,created_at,hoa_id")
      .eq("hoa_id", hoa.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return form ? { ...form, hoa } : null;
  });
