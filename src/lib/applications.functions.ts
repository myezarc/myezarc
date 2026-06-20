import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runArcReview } from "@/lib/arc-review.functions";
import {
  ensureCanReviewHoa,
  getHoaOrDefault,
  getSubmissionHoa,
  getUserRoles,
  listReviewableHoas,
  isGlobalAdminRole,
} from "@/lib/hoa-scope";

const CreateAppSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  homeownerEmail: z.string().trim().email().max(255).optional().nullable(),
  applicationPdfPath: z.string().min(1).max(1000),
  extractedText: z.string().min(1).max(400_000),
  actingAs: z.enum(["global_admin", "hoa_admin", "arc_reviewer", "homeowner"]).optional(),
  actingHoaId: z.string().uuid().optional().nullable(),
});
const ActingAsSchema = z
  .object({
    actingAs: z.enum(["global_admin", "hoa_admin", "arc_reviewer", "homeowner"]).optional(),
    actingHoaId: z.string().uuid().optional().nullable(),
  })
  .optional()
  .default({});

const IdSchema = z.object({
  id: z.string().uuid(),
  actingAs: z.enum(["global_admin", "hoa_admin", "arc_reviewer", "homeowner"]).optional(),
  actingHoaId: z.string().uuid().optional().nullable(),
});

const FinalizeSchema = z.object({
  applicationId: z.string().uuid(),
  reviewId: z.string().uuid(),
  decision: z.enum(["approved", "conditional", "rejected"]),
  homeownerMessage: z.string().trim().min(1).max(8000),
  actingAs: z.enum(["global_admin", "hoa_admin", "arc_reviewer", "homeowner"]).optional(),
  actingHoaId: z.string().uuid().optional().nullable(),
});

type ActingAs = z.infer<typeof ActingAsSchema>["actingAs"];

async function isGlobalAdmin(
  supabase: Parameters<typeof getUserRoles>[0],
  userId: string,
) {
  const roles = await getUserRoles(supabase, userId);
  return isGlobalAdminRole(roles);
}

async function isGlobalAdminActingAsReviewer(
  supabase: Parameters<typeof getUserRoles>[0],
  userId: string,
  actingAs: ActingAs,
) {
  if (actingAs !== "arc_reviewer" && actingAs !== "hoa_admin") return false;
  return isGlobalAdmin(supabase, userId);
}

async function getReviewDataClient(
  supabase: Parameters<typeof getUserRoles>[0],
  userId: string,
  _actingAs: ActingAs,
) {
  if (!(await isGlobalAdmin(supabase, userId))) return supabase;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureReviewAccess(
  supabase: Parameters<typeof getUserRoles>[0],
  userId: string,
  hoaId: string,
  actingAs: ActingAs,
) {
  if (await isGlobalAdmin(supabase, userId)) return;
  await ensureCanReviewHoa(supabase, userId, hoaId);
}

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateAppSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await getUserRoles(supabase, userId);
    const hoa =
      data.actingAs === "homeowner" && data.actingHoaId && isGlobalAdminRole(roles)
        ? await getHoaOrDefault(supabase, data.actingHoaId)
        : await getSubmissionHoa(supabase, userId);
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
      .eq("homeowner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActingAsSchema.parse(input))
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const actingAs = input?.actingAs;
    const actingHoaId = input?.actingHoaId;
    const hasGlobalAdminAccess = await isGlobalAdmin(supabase, userId);
    const reviewableHoas = hasGlobalAdminAccess ? [] : await listReviewableHoas(supabase, userId);
    if (!hasGlobalAdminAccess && reviewableHoas.length === 0)
      throw new Error("ARC reviewer access required");
    const client = await getReviewDataClient(supabase, userId, actingAs);
    let query = client
      .from("applications")
      .select("id,title,status,created_at,homeowner_email,homeowner_id,hoa_id,hoa:hoas(name,slug)")
      .order("created_at", { ascending: false });
    if (!hasGlobalAdminAccess) {
      query = query.in(
        "hoa_id",
        reviewableHoas.map((hoa) => hoa.id),
      );
    }
    if (actingHoaId) query = query.eq("hoa_id", actingHoaId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const client = await getReviewDataClient(supabase, userId, data.actingAs);
    const { data: app, error } = await client
      .from("applications")
      .select("*,hoa:hoas(name,slug)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Not found");
    if (app.homeowner_id !== userId) {
      await ensureReviewAccess(supabase, userId, app.hoa_id, data.actingAs);
    }

    const { data: reviews } = await client
      .from("arc_reviews")
      .select("*")
      .eq("application_id", data.id)
      .order("created_at", { ascending: false });

    const { data: messages } = await client
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

    const client = await getReviewDataClient(supabase, userId, data.actingAs);
    const { data: app, error: aErr } = await client
      .from("applications")
      .select("id,hoa_id,extracted_text")
      .eq("id", data.id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!app?.extracted_text) throw new Error("Application has no extracted text.");
    await ensureReviewAccess(supabase, userId, app.hoa_id, data.actingAs);

    const { data: guide, error: gErr } = await client
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

    const { data: review, error: rErr } = await client
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

    await client.from("applications").update({ status: "in_review" }).eq("id", app.id);

    return review;
  });

export const finalizeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FinalizeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const client = await getReviewDataClient(supabase, userId, data.actingAs);
    const { data: app, error: appError } = await client
      .from("applications")
      .select("hoa_id")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!app) throw new Error("Application not found");
    await ensureReviewAccess(supabase, userId, app.hoa_id, data.actingAs);

    const { error } = await client.rpc("finalize_arc_review", {
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
    const { data: app, error: appError } = await context.supabase
      .from("applications")
      .select("homeowner_id,hoa_id")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!app) throw new Error("Application not found");
    if (app.homeowner_id !== context.userId) {
      await ensureCanReviewHoa(context.supabase, context.userId, app.hoa_id);
    }
    const roles = await getUserRoles(context.supabase, context.userId);
    if (roles.includes("global_admin") && app.homeowner_id !== context.userId) {
      throw new Error("Global Admin cannot access ARC application messages.");
    }
    const { error } = await context.supabase.from("messages").insert({
      application_id: data.applicationId,
      sender_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
