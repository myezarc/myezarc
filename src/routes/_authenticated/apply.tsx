import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UploadCloud, FileText, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { extractTextFromFile } from "@/lib/extract-text";
import { ocrImages } from "@/lib/ocr.functions";
import { createApplication } from "@/lib/applications.functions";

export const Route = createFileRoute("/_authenticated/apply")({
  head: () => ({ meta: [{ title: "New ARC application — Ez-ARC" }] }),
  component: ApplyPage,
});

function ApplyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ocr = useServerFn(ocrImages);
  const submit = useServerFn(createApplication);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "extracting" | "uploading" | "saving">("idle");
  const [err, setErr] = useState<string | null>(null);

  const busy = stage !== "idle";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!file || !user) return;
    try {
      setStage("extracting");
      const text = await extractTextFromFile(file, ocr, "Homeowner application");
      if (text.trim().length < 20) throw new Error("Couldn't read the PDF. Try a clearer document.");

      setStage("uploading");
      const ext = file.name.split(".").pop() || "pdf";
      const path = `applications/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("arc-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      setStage("saving");
      const { id } = await submit({
        data: {
          title: title.trim(),
          description: description.trim(),
          homeownerEmail: email.trim() || null,
          applicationPdfPath: path,
          extractedText: text,
        },
      });
      navigate({ to: "/applications/$id", params: { id } });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
      setStage("idle");
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">New application</h1>
      <p className="mt-2 text-muted-foreground">
        Upload your completed application PDF. We'll extract the text and pass it to the review committee.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-background p-6">
        <Field label="Project title" hint="e.g. Backyard fence replacement">
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="Short description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={3}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </Field>

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Application PDF
          </span>
          <FileDrop file={file} onFile={setFile} />
        </div>

        {err && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{err}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !file || !title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {stage === "extracting"
            ? "Reading PDF…"
            : stage === "uploading"
              ? "Uploading…"
              : stage === "saving"
                ? "Saving…"
                : "Submit application"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function FileDrop({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const handle = (f?: File) => {
    if (!f) return;
    const ok = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!ok) return alert("Upload a PDF.");
    if (f.size > 20 * 1024 * 1024) return alert("Max 20MB.");
    onFile(f);
  };
  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-brand"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
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
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        drag ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/60"
      }`}
    >
      <div className="grid size-12 place-items-center rounded-xl bg-background text-accent ring-1 ring-border">
        <UploadCloud className="size-5" />
      </div>
      <p className="text-sm font-semibold text-brand">Drop a PDF here, or click to browse</p>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? undefined)}
      />
    </label>
  );
}
