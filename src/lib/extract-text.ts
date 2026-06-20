import { extractPdfText, fileToDataUrl, isExtractedTextRich, renderPdfToImages } from "@/lib/pdf-extract";

type OcrFn = (args: { data: { images: string[]; label?: string } }) => Promise<{ text: string }>;

const OCR_CHUNK = 2;

export async function extractTextFromFile(
  file: File,
  ocr: OcrFn,
  label: string,
): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    let text = "";
    let extractError: unknown = null;
    try {
      text = await extractPdfText(file);
    } catch (error) {
      extractError = error;
    }
    if (isExtractedTextRich(text)) return text;
    let images: string[] = [];
    try {
      images = await renderPdfToImages(file);
    } catch (error) {
      if (text.trim()) return text;
      const message =
        error instanceof Error
          ? error.message
          : extractError instanceof Error
            ? extractError.message
            : "This browser could not read the PDF.";
      throw new Error(`Could not read this PDF. Try another browser or re-save the PDF. ${message}`);
    }
    if (images.length === 0) return text;
    return await ocrAllPages(ocr, images, label);
  }
  const dataUrl = await fileToDataUrl(file);
  const { text } = await ocr({ data: { images: [dataUrl], label } });
  return text;
}

async function ocrAllPages(ocr: OcrFn, images: string[], label: string): Promise<string> {
  const chunks: string[] = [];
  for (let i = 0; i < images.length; i += OCR_CHUNK) {
    const slice = images.slice(i, i + OCR_CHUNK);
    try {
      const { text } = await ocr({
        data: { images: slice, label: `${label} (pages ${i + 1}-${i + slice.length})` },
      });
      if (text.trim()) chunks.push(text.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OCR failed.";
      if (/timeout|504|gateway/i.test(msg) && slice.length > 1) {
        for (let j = 0; j < slice.length; j++) {
          const { text } = await ocr({
            data: { images: [slice[j]], label: `${label} (page ${i + j + 1})` },
          });
          if (text.trim()) chunks.push(text.trim());
        }
        continue;
      }
      throw e;
    }
  }
  return chunks.join("\n\n");
}
