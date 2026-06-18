import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, BookOpen, Loader2, UploadCloud, FileText, X } from "lucide-react";
import { extractTextFromFile } from "@/lib/extract-text";
import { ocrImages } from "@/lib/ocr.functions";
import { uploadGuideline, getActiveGuideline } from "@/lib/guidelines.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/guidelines")({
  head: () => ({ meta: [{ title: "HOA Guidelines — Ez-ARC" }] }),
  component: GuidelinesAdmin,
});

function GuidelinesAdmin() {
  const ocr = useServerFn(ocrImages);
  const upload = useServerFn(uploadGuideline);
  const get = useServerFn(getActiveGuideline);

  const [active, setActive] = useState<any>(null);
  const [title, setTitle] = useState("HOA Architectural Guidelines");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "extracting" | "uploading" | "saving">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reload = () => get().then(setActive).catch(() => {});
  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    setErr(null);
    setInfo(null);
    if (!file) return;
    try {
      setStage("extracting");
      const text = await extractTextFromFile(file, ocr, "HOA guideline");
      if (text.trim().length < 50) throw new Error("Couldn't read enough text from the PDF.");
      setStage("uploading");
      const path = `guidelines/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from("arc-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      setStage("saving");
      await upload({ data: { title: title.trim(), storagePath: path, extractedText: text } });
      setInfo("Guideline activated.");
      setFile(null);
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Failed.");
    } finally {
      setStage("idle");
    }
  };

  const busy = stage !== "idle";

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">HOA Guideline</h1>
      <p className="mt-2 text-muted-foreground">
        Upload your community's architectural guideline. The AI uses the active guideline for every review.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="font-display font-bold text-brand">
              {active ? `Active: ${active.title}` : "No active guideline"}
            </p>
            <p className="text-sm text-muted-foreground">
              {active
                ? `Uploaded ${new Date(active.created_at).toLocaleString()}`
                : "Upload your first guideline below."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-background p-6">
        <p className="font-display font-bold text-brand">Upload new guideline</p>
        <p className="text-xs text-muted-foreground">Replacing the active guideline immediately deactivates the old one.</p>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </label>

        <Drop file={file} onFile={setFile} />

        {err && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{err}</p>
          </div>
        )}
        {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{info}</p>}

        <button
          onClick={submit}
          disabled={busy || !file || !title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {stage === "extracting"
            ? "Reading PDF…"
            : stage === "uploading"
              ? "Uploading…"
              : stage === "saving"
                ? "Saving…"
                : "Upload & activate"}
        </button>
      </div>
    </div>
  );
}

function Drop({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const handle = (f?: File) => {
    if (!f) return;
    if (!(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")))
      return alert("PDF only.");
    if (f.size > 20 * 1024 * 1024) return alert("Max 20MB.");
    onFile(f);
  };
  if (file)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
            <FileText className="size-5" />
          </div>
          <p className="truncate text-sm font-semibold">{file.name}</p>
        </div>
        <button onClick={() => onFile(null)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background">
          <X className="size-4" />
        </button>
      </div>
    );
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
        drag ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/60"
      }`}
    >
      <UploadCloud className="size-6 text-accent" />
      <p className="text-sm font-semibold text-brand">Drop guideline PDF here</p>
      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0] ?? undefined)} />
    </label>
  );
}
