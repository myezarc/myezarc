import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Loader2,
  MessageSquareHeart,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { extractPdfText, fileToDataUrl, renderPdfToImages } from "@/lib/pdf-extract";
import { runArcReview, type ReviewResult } from "@/lib/arc-review.functions";
import { ocrImages } from "@/lib/ocr.functions";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

type OcrFn = (args: {
  data: { images: string[]; label?: string };
}) => Promise<{ text: string }>;

async function extractTextFromFile(
  file: File,
  ocr: OcrFn,
  label: string,
): Promise<string> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const text = await extractPdfText(file);
    if (text.length >= 200) return text;
    // Likely scanned — fall back to OCR via vision model.
    const images = await renderPdfToImages(file);
    if (images.length === 0) return text;
    const { text: ocrText } = await ocr({ data: { images, label } });
    return ocrText;
  }

  // Image upload — OCR directly.
  const dataUrl = await fileToDataUrl(file);
  const { text: ocrText } = await ocr({ data: { images: [dataUrl], label } });
  return ocrText;
}

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Run an ARC Review — Ez-ARC Review" },
      {
        name: "description",
        content:
          "Upload your HOA architectural guideline PDF and a homeowner's application PDF to generate an instant AI-assisted review.",
      },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [guideline, setGuideline] = useState<File | null>(null);
  const [application, setApplication] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "extracting" | "reviewing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const reviewFn = useServerFn(runArcReview);
  const ocrFn = useServerFn(ocrImages);
  const running = stage !== "idle";
  const canRun = !!guideline && !!application && !running;

  const runReview = async () => {
    if (!canRun || !guideline || !application) return;
    setError(null);
    setResult(null);
    try {
      setStage("extracting");
      const [guidelineText, applicationText] = await Promise.all([
        extractTextFromFile(guideline, ocrFn, "HOA guideline"),
        extractTextFromFile(application, ocrFn, "Homeowner application"),
      ]);

      if (guidelineText.length < 50) {
        throw new Error(
          "Couldn't read the guideline document. Try a clearer scan or a text-based PDF.",
        );
      }
      if (applicationText.length < 20) {
        throw new Error(
          "Couldn't read the application document. Try a clearer scan or a text-based PDF.",
        );
      }

      setStage("reviewing");
      const r = await reviewFn({
        data: {
          guidelineText: guidelineText.slice(0, 380_000),
          applicationText: applicationText.slice(0, 380_000),
        },
      });
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setStage("idle");
    }
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
            hint="The HOA's CC&Rs or architectural standards (PDF or photo)."
            file={guideline}
            onFile={setGuideline}
          />
          <UploadCard
            label="Homeowner application"
            hint="The change request submitted by the homeowner (PDF or photo)."
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
                {stage === "extracting"
                  ? "Reading your PDFs…"
                  : stage === "reviewing"
                    ? "AI is reviewing the application against the guideline…"
                    : "Ready when both PDFs are attached"}
              </p>
              <p className="text-sm text-muted-foreground">
                We extract text from each PDF, find the application form section in your
                guideline, and check the application against it.
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
                <Loader2 className="size-4 animate-spin" />{" "}
                {stage === "extracting" ? "Reading PDFs…" : "Reviewing…"}
              </>
            ) : (
              <>Run review</>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

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
      const isPdf =
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const isImage =
        IMAGE_TYPES.includes(f.type) ||
        /\.(png|jpe?g|webp)$/i.test(f.name);
      if (!isPdf && !isImage) {
        alert("Please upload a PDF or an image (PNG, JPG, WEBP).");
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
        <span className="text-xs font-medium text-muted-foreground">PDF or image · max 20MB</span>
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
              Drop a PDF or photo here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
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

        <FormSectionPanel form={result.formSection} />

        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Findings
          </h3>
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

        <HomeownerMessage message={result.homeownerMessage} />
      </div>
    </section>
  );
}

function FormSectionPanel({ form }: { form: ReviewResult["formSection"] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/5 text-brand">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Application form found in the guideline
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-brand">
            {form.found ? form.sectionTitle || "Application Form" : "No form section detected"}
          </h3>
          {form.locationHint && (
            <p className="mt-1 text-xs text-muted-foreground">Location: {form.locationHint}</p>
          )}
        </div>
      </div>

      {form.found && form.requiredFields.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {form.requiredFields.map((f, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-background p-3 text-sm"
            >
              <p className="font-semibold text-brand">{f.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          The guideline didn't include an explicit application-form section, so the
          review below is based on substantive rules only.
        </p>
      )}
    </div>
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

function HomeownerMessage({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <MessageSquareHeart className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Message to homeowner
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-brand">
              Neighbor-friendly next steps
            </h3>
          </div>
        </div>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-surface"
        >
          {copied ? (
            <>
              <Check className="size-4 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
        {message}
      </p>
    </div>
  );
}
