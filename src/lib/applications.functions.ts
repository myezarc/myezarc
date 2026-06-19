import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runArcReview } from "@/lib/arc-review.functions";
import { ensureStaff, getSubmissionHoa } from "@/lib/hoa-scope";

const CreateAppSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  homeownerEmail: z.string().trim().email().max(255).optional().nullable(),
  applicationPdfPath: z.string().min(1).max(1000),
  extractedText: z.string().min(1).max(400_000),
});

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateAppSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hoa = await getSubmissionHoa(supabase, userId);
    const { data: row, error } = await supabase
      .from("applications")
      .insert({
        homeowner_id: userId,
        hoa_id: hoa.id,
        title: data.title,
        description: data.description || null,
        homeowner_email: data.homeownerEmail || null,
        application_pdf_path: data.applicationPdfPath,
        extracted_text: data.extractedText,
        status: "submitted",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("id,title,status,created_at,homeowner_email,hoa_id,hoa:hoas(name,slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase
      .from("applications")
      .select("id,title,status,created_at,homeowner_email,homeowner_id,hoa_id,hoa:hoas(name,slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const getApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: app, error } = await supabase
      .from("applications")
      .select("*,hoa:hoas(name,slug)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Not found");

    const { data: reviews } = await supabase
      .from("arc_reviews")
      .select("*")
      .eq("application_id", data.id)
      .order("created_at", { ascending: false });

    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("application_id", data.id)
      .order("created_at", { ascending: true });

    return { application: app, reviews: reviews ?? [], messages: messages ?? [] };
  });

export const runReviewForApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const { data: app, error: aErr } = await supabase
      .from("applications")
      .select("id,hoa_id,extracted_text")
      .eq("id", data.id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!app?.extracted_text) throw new Error("Application has no extracted text.");

    const { data: guide, error: gErr } = await supabase
      .from("hoa_guidelines")
      .select("extracted_text")
      .eq("hoa_id", app.hoa_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!guide?.extracted_text)
      throw new Error("No active HOA guideline. Ask an admin to upload one.");

    const result = await runArcReview({
      data: {
        guidelineText: guide.extracted_text.slice(0, 120_000),
        applicationText: app.extracted_text.slice(0, 120_000),
      },
    });

    const { data: review, error: rErr } = await supabase
      .from("arc_reviews")
      .insert({
        application_id: app.id,
        reviewer_id: userId,
        decision: result.decision,
        summary: result.summary,
        findings: result.findings,
        homeowner_message: result.homeownerMessage,
        form_section: result.formSection,
        model: "google/gemini-2.5-flash",
        is_final: false,
      })
      .select("*")
      .single();
    if (rErr) throw new Error(rErr.message);

    await supabase.from("applications").update({ status: "in_review" }).eq("id", app.id);

    return review;
  });

const FinalizeSchema = z.object({
  applicationId: z.string().uuid(),
  reviewId: z.string().uuid(),
  decision: z.enum(["approved", "conditional", "rejected"]),
  homeownerMessage: z.string().trim().min(1).max(8000),
});

export const finalizeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FinalizeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const { error } = await supabase.rpc("finalize_arc_review", {
      _application_id: data.applicationId,
      _review_id: data.reviewId,
      _decision: data.decision,
      _homeowner_message: data.homeownerMessage,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

const MessageSchema = z.object({
  applicationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MessageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").insert({
      application_id: data.applicationId,
      sender_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
