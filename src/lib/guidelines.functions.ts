import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureCanManageHoa, getHoaOrDefault, getReadableHoa } from "@/lib/hoa-scope";

const UploadSchema = z.object({
  hoaId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  storagePath: z.string().min(1).max(1000),
  extractedText: z.string().min(20).max(400_000),
});

const HoaInputSchema = z
  .object({ hoaId: z.string().uuid().optional().nullable() })
  .optional()
  .default({});

export const uploadGuideline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hoa = await getHoaOrDefault(supabase, data.hoaId);
    await ensureCanManageHoa(supabase, userId, hoa.id);

    const { data: id, error } = await supabase.rpc("activate_hoa_guideline", {
      _hoa_id: hoa.id,
      _title: data.title,
      _storage_path: data.storagePath,
      _extracted_text: data.extractedText,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const getActiveGuideline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HoaInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const hoa = await getReadableHoa(context.supabase, context.userId, data?.hoaId);
    const { data: guideline } = await context.supabase
      .from("hoa_guidelines")
      .select("id,title,storage_path,is_active,created_at,hoa_id")
      .eq("hoa_id", hoa.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return guideline ? { ...guideline, hoa } : null;
  });
