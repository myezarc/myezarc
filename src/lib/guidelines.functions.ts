import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UploadSchema = z.object({
  title: z.string().trim().min(2).max(200),
  storagePath: z.string().min(1).max(1000),
  extractedText: z.string().min(20).max(400_000),
});

export const uploadGuideline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin"))
      throw new Error("Admins only");

    await supabase
      .from("hoa_guidelines")
      .update({ is_active: false })
      .eq("is_active", true);

    const { data: row, error } = await supabase
      .from("hoa_guidelines")
      .insert({
        title: data.title,
        storage_path: data.storagePath,
        extracted_text: data.extractedText,
        is_active: true,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getActiveGuideline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("hoa_guidelines")
      .select("id,title,storage_path,is_active,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });
