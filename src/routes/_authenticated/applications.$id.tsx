import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquareHeart,
  Send,
  X,
} from "lucide-react";
import { getApplication, postMessage } from "@/lib/applications.functions";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  head: () => ({ meta: [{ title: "Application — Ez-ARC" }] }),
  component: ApplicationDetail,
});

function ApplicationDetail() {
  const { id } = Route.useParams();
  const { isStaff } = useAuth();
  const get = useServerFn(getApplication);
  const send = useServerFn(postMessage);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const reload = () =>
    get({ data: { id } })
      .then(setData)
      .catch((e: any) => setErr(e?.message ?? "Failed to load."));

  useEffect(() => {
    reload();
  }, [id]);

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

  if (err) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const app = data.application;
  const finalReview = data.reviews.find((r: any) => r.is_final);
  const draftReview = data.reviews.find((r: any) => !r.is_final);
  const visibleReview = finalReview ?? (isStaff ? draftReview : null);

  const sendMsg = async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      await send({ data: { applicationId: id, body } });
      setDraft("");
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <Link
        to="/applications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="size-4" /> All applications
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand">{app.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {new Date(app.submitted_at).toLocaleString()}
            {app.homeowner_email ? ` · ${app.homeowner_email}` : ""}
          </p>
          {app.hoa?.name && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-accent">
              {app.hoa.name}
            </p>
          )}
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {app.description && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">{app.description}</p>
            </div>
          )}

          {pdfUrl && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Application PDF
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline"
              >
                Open PDF in new tab →
              </a>
            </div>
          )}

          {isStaff && (
            <Link
              to="/review/$id"
              params={{ id }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:opacity-90"
            >
              Open in review queue →
            </Link>
          )}

          {visibleReview && <ReviewPanel review={visibleReview} isFinal={!!finalReview} />}
        </div>

        <div className="rounded-2xl border border-border bg-background">
          <div className="border-b border-border p-4">
            <p className="font-display font-bold text-brand">Messages</p>
          </div>
          <div className="max-h-[500px] space-y-3 overflow-y-auto p-4">
            {data.messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
            {data.messages.map((m: any) => (
              <div
                key={m.id}
                className={`rounded-xl p-3 text-sm ${
                  m.is_system ? "border border-accent/20 bg-accent/5" : "bg-surface"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              maxLength={4000}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={sendMsg}
              disabled={posting || !draft.trim()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-brand-foreground hover:opacity-90 disabled:opacity-50"
            >
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ review, isFinal }: { review: any; isFinal: boolean }) {
  const palette: Record<string, { label: string; cls: string }> = {
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    conditional: { label: "Conditional", cls: "bg-amber-100 text-amber-700" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  };
  const p = palette[review.decision];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isFinal ? "Final committee decision" : "AI draft review (not yet sent)"}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-brand">Review</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${p.cls}`}>
          {p.label}
        </span>
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
        {review.homeowner_message && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="size-4 text-accent" />
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Message to homeowner
              </p>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{review.homeowner_message}</p>
          </div>
        )}
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
