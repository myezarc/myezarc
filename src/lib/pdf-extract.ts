// Browser-only PDF text extraction + page-to-image rendering using pdfjs-dist.
import * as pdfjs from "pdfjs-dist";
// Vite bundles the worker as a URL.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const parts: string[] = [];

  // Try to read AcroForm / fillable form field values across the whole doc.
  let formValues: Array<{ name: string; value: string }> = [];
  try {
    const fieldObjects = (await doc.getFieldObjects()) as Record<
      string,
      Array<{ name?: string; value?: unknown }>
    > | null;
    if (fieldObjects) {
      for (const [name, arr] of Object.entries(fieldObjects)) {
        for (const f of arr) {
          const v = f?.value;
          if (v != null && String(v).trim() !== "") {
            formValues.push({ name: f.name ?? name, value: String(v) });
          }
        }
      }
    }
  } catch {
    formValues = [];
  }

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(`--- Page ${i} ---\n${pageText}`);

    // Also pull text from annotations on this page (widget form values,
    // FreeText / typewriter annotations, etc.).
    try {
      const annots = (await page.getAnnotations()) as Array<{
        subtype?: string;
        fieldName?: string;
        fieldValue?: unknown;
        contents?: string;
        buttonValue?: unknown;
      }>;
      const annotLines: string[] = [];
      for (const a of annots) {
        const label = a.fieldName ?? a.subtype ?? "annotation";
        const val =
          (a.fieldValue != null && String(a.fieldValue).trim()) ||
          (a.buttonValue != null && String(a.buttonValue).trim()) ||
          (a.contents != null && String(a.contents).trim()) ||
          "";
        if (val) annotLines.push(`${label}: ${val}`);
      }
      if (annotLines.length > 0) {
        parts.push(`--- Page ${i} Annotations ---\n${annotLines.join("\n")}`);
      }
    } catch {
      /* ignore annotation errors */
    }
  }

  let out = parts.join("\n\n").trim();
  if (formValues.length > 0) {
    out +=
      "\n\n--- Filled Form Fields ---\n" +
      formValues.map((f) => `${f.name}: ${f.value}`).join("\n");
  }
  return out;
}

/** Heuristic: did native extraction yield enough real prose to skip OCR? */
export function isExtractedTextRich(text: string): boolean {
  if (text.length < 500) return false;
  const letters = text.match(/[a-zA-Z]/g)?.length ?? 0;
  return letters >= 200;
}


/**
 * Render up to `maxPages` of a PDF as PNG data URLs (for OCR fallback on
 * scanned documents). Returns an empty array if rendering isn't possible.
 */
export async function renderPdfToImages(
  file: File,
  maxPages = 12,
  scale = 1.1,
): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = Math.min(doc.numPages, maxPages);
  const out: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.68));
  }
  return out;
}

/** Read an image File as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file."));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}
