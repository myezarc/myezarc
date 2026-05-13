import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Run an ARC Review — Ez-ARC Review" },
      {
        name: "description",
        content:
          "Upload your HOA architectural guideline PDF and a homeowner's application PDF to generate an instant review.",
      },
    ],
  }),
  component: ReviewPage,
});

type ReviewResult = {
  decision: "approved" | "conditional" | "rejected";
  summary: string;
  findings: { rule: string; status: "pass" | "warn" | "fail"; note: string }[];
  homeownerMessage: string;
};

function ReviewPage() {
  const [guideline, setGuideline] = useState<File | null>(null);
  const [application, setApplication] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const canRun = guideline && application && !running;

  const runReview = () => {
    if (!canRun) return;
    setRunning(true);
    setResult(null);
    // Mock review — UI only
    window.setTimeout(() => {
      setResult({
        decision: "conditional",
        summary:
          "The application largely conforms to the community guidelines. Two items require committee clarification before final approval.",
        findings: [
          {
            rule: "Exterior paint color palette",
            status: "pass",
            note: "Selected color matches the approved earth-tone palette in section 4.2.",
          },
          {
            rule: "Fence height & material",
            status: "warn",
            note: "Proposed 6'2\" exceeds the 6' maximum by 2 inches — confirm with surveyor.",
          },
          {
            rule: "Setback from rear property line",
            status: "pass",
            note: "10 ft setback meets the minimum requirement of 8 ft.",
          },
          {
            rule: "Required documentation",
            status: "fail",
            note: "Missing signed neighbor acknowledgement form referenced in section 7.1.",
          },
        ],
        homeownerMessage:
          "Hi neighbor — thanks so much for sending in your application! You're really close to a full approval. To get this across the finish line, we'd ask for two small updates: (1) please trim the proposed fence height down by 2 inches so it lands at the 6' maximum allowed in section 4.5, or share an updated surveyor sketch confirming the actual height; and (2) please attach the signed Neighbor Acknowledgement Form (one signature from each adjoining property) referenced in section 7.1 — there's a blank copy on the community portal. Once we have those, the committee can finalize your approval at the next meeting. Please reach out any time if you'd like a hand with the form, and thanks again for keeping the neighborhood looking great!",
      });
      setRunning(false);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-brand">
              <div className="size-3 rotate-45 border-2 border-brand-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-brand">
              Ez-ARC
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            New Review
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-brand md:text-5xl">
            Run an architectural review.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Upload your community's architectural guideline and the homeowner's
            application. We'll compare them and generate a structured review for the
            committee.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <UploadCard
            label="Architectural guideline"
            hint="The HOA's CC&Rs or architectural standards (PDF)."
            file={guideline}
            onFile={setGuideline}
          />
          <UploadCard
            label="Homeowner application"
            hint="The change request submitted by the homeowner (PDF)."
            file={application}
            onFile={setApplication}
          />
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-brand">
                Ready when both PDFs are attached
              </p>
              <p className="text-sm text-muted-foreground">
                Files stay in your browser — nothing is uploaded in this preview.
              </p>
            </div>
          </div>
          <button
            onClick={runReview}
            disabled={!canRun}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-lg transition-all enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reviewing…
              </>
            ) : (
              <>Run review</>
            )}
          </button>
        </div>

        {result && <ResultPanel result={result} />}
      </main>
    </div>
  );
}

function UploadCard({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        alert("Please upload a PDF file.");
        return;
      }
      if (f.size > 20 * 1024 * 1024) {
        alert("File is larger than 20MB.");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-brand">{label}</h3>
        <span className="text-xs font-medium text-muted-foreground">PDF · max 20MB</span>
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => onFile(null)}
            aria-label="Remove file"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-brand"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border bg-surface hover:border-accent/60 hover:bg-accent/5"
          }`}
        >
          <div className="grid size-12 place-items-center rounded-xl bg-background text-accent ring-1 ring-border">
            <UploadCloud className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">
              Drop your PDF here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

function ResultPanel({ result }: { result: ReviewResult }) {
  const palette = {
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    conditional: { label: "Conditional approval", cls: "bg-amber-100 text-amber-700" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  }[result.decision];

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Review result
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-brand">
            Committee summary
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${palette.cls}`}
        >
          {palette.label}
        </span>
      </div>

      <div className="space-y-6 p-6">
        <p className="text-base leading-relaxed text-foreground">{result.summary}</p>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {result.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-4 p-4">
              <FindingIcon status={f.status} />
              <div className="min-w-0">
                <p className="font-semibold text-brand">{f.rule}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FindingIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="size-5" />
      </div>
    );
  if (status === "warn")
    return (
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
        <AlertTriangle className="size-5" />
      </div>
    );
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600">
      <X className="size-5" />
    </div>
  );
}
