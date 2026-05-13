// Browser-only PDF text extraction + page-to-image rendering using pdfjs-dist.
import * as pdfjs from "pdfjs-dist";
// Vite bundles the worker as a URL.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(`--- Page ${i} ---\n${pageText}`);
  }
  return parts.join("\n\n").trim();
}

/**
 * Render up to `maxPages` of a PDF as PNG data URLs (for OCR fallback on
 * scanned documents). Returns an empty array if rendering isn't possible.
 */
export async function renderPdfToImages(
  file: File,
  maxPages = 6,
  scale = 1.6,
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
    out.push(canvas.toDataURL("image/png"));
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
