import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import {
  getApplication,
  runReviewForApplication,
  finalizeReview,
} from "@/lib/applications.functions";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/review/$id")({
  head: () => ({ meta: [{ title: "Review application — Ez-ARC" }] }),
  component: ReviewOne,
});

function ReviewOne() {
  const { id } = Route.useParams();
  const { isGlobalAdmin, roleViewMode } = useAuth();
  const navigate = useNavigate();
  const get = useServerFn(getApplication);
  const runFn = useServerFn(runReviewForApplication);
  const finalize = useServerFn(finalizeReview);

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [decision, setDecision] = useState<"approved" | "conditional" | "rejected">("approved");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = () =>
    get({ data: { id, actingAs: roleViewMode } })
      .then((d: any) => {
        setData(d);
        const draft = d.reviews.find((r: any) => !r.is_final) ?? d.reviews[0];
        if (draft) {
          setDecision(draft.decision);
          setMessage(draft.homeowner_message ?? "");
        }
      })
      .catch((e: any) => setErr(e?.message ?? "Failed."));

  useEffect(() => {
    if (isGlobalAdmin) return;
    reload();
  }, [id, isGlobalAdmin, roleViewMode]);

  useEffect(() => {
    const path = data?.application?.application_pdf_path;
    if (!path) return;
    supabase.storage
      .from("arc-documents")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setPdfUrl(data.signedUrl);
      });
  }, [data?.application?.application_pdf_path]);

  const runReview = async () => {
    setErr(null);
    setRunning(true);
    try {
      await runFn({ data: { id, actingAs: roleViewMode } });
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "AI review failed.");
    } finally {
      setRunning(false);
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const draft = data.reviews.find((r: any) => !r.is_final) ?? data.reviews[0];
    if (!draft) return;
    setSubmitting(true);
    try {
      await finalize({
        data: {
          applicationId: id,
          reviewId: draft.id,
          decision,
          homeownerMessage: message.trim(),
          actingAs: roleViewMode,
        },
      });
      navigate({ to: "/applications/$id", params: { id } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isGlobalAdmin) {
    return (
      <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold text-brand">Platform oversight only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Global Admins do not access ARC application details. Use HOA accounts and Users for
          high-level HOA membership, board, and reviewer information.
        </p>
      </div>
    );
  }

  if (err && !data) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const app = data.application;
  const draftReview = data.reviews.find((r: any) => !r.is_final);
  const finalReview = data.reviews.find((r: any) => r.is_final);
  const review = finalReview ?? draftReview;

  return (
    <div>
      <Link
        to="/review"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="size-4" /> Back to queue
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand">{app.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {app.homeowner_email ?? "no email"} · {new Date(app.submitted_at).toLocaleString()}
          </p>
          {app.hoa?.name && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-accent">
              {app.hoa.name}
            </p>
          )}
        </div>
        <StatusBadge status={app.status} />
      </div>

      {err && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{err}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-5">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-accent hover:underline"
            >
              Open application PDF →
            </a>
          )}

          {!review && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 font-display text-lg font-bold text-brand">No AI review yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Run the AI to compare this application against the active HOA guideline.
              </p>
              <button
                onClick={runReview}
                disabled={running}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:opacity-90 disabled:opacity-50"
              >
                {running && <Loader2 className="size-4 animate-spin" />}
                {running ? "Reviewing…" : "Run AI review"}
              </button>
            </div>
          )}

          {review && (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border bg-surface p-5">
                <p className="font-display font-bold text-brand">AI-generated review</p>
                {!finalReview && (
                  <button
                    onClick={runReview}
                    disabled={running}
                    className="text-sm font-semibold text-accent hover:underline disabled:opacity-50"
                  >
                    {running ? "Running…" : "Re-run"}
                  </button>
                )}
              </div>
              <div className="space-y-5 p-5">
                <p className="text-sm leading-relaxed">{review.summary}</p>
                {Array.isArray(review.findings) && review.findings.length > 0 && (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {review.findings.map((f: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 p-3">
                        <FindIcon status={f.status} />
                        <div>
                          <p className="text-sm font-semibold text-brand">{f.rule}</p>
                          <p className="text-sm text-muted-foreground">{f.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="font-display font-bold text-brand">Final decision</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {finalReview ? "Already sent." : "Edit the AI's draft and send to the homeowner."}
          </p>

          <div className="mt-4 flex gap-2">
            {(["approved", "conditional", "rejected"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDecision(d)}
                disabled={!!finalReview}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed ${
                  decision === d
                    ? d === "approved"
                      ? "bg-emerald-600 text-white"
                      : d === "conditional"
                        ? "bg-amber-500 text-white"
                        : "bg-red-600 text-white"
                    : "border border-border bg-surface text-muted-foreground hover:bg-background"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!!finalReview}
            rows={12}
            maxLength={8000}
            placeholder="Message to homeowner…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-70"
          />

          {!finalReview && (
            <button
              onClick={send}
              disabled={submitting || !message.trim() || !review}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Send decision to homeowner
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FindIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <div className="grid size-7 place-items-center rounded-md bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-4" />
      </div>
    );
  if (status === "warn")
    return (
      <div className="grid size-7 place-items-center rounded-md bg-amber-100 text-amber-700">
        <AlertTriangle className="size-4" />
      </div>
    );
  return (
    <div className="grid size-7 place-items-center rounded-md bg-red-100 text-red-700">
      <X className="size-4" />
    </div>
  );
}
