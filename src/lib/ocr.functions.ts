import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  // Array of data URLs (data:image/png;base64,...) — up to 8 images.
  images: z.array(z.string().min(20).max(8_000_000)).min(1).max(8),
  label: z.string().max(120).optional(),
});

const SYSTEM_PROMPT = `You are an OCR engine. Read the provided document image(s) and return ALL visible text exactly as written.
Rules:
- Preserve reading order (top to bottom, left to right; respect columns).
- Preserve headings, bullet lists, numbered lists, and table rows.
- For form fields, output them as "Field label: value" on one line.
- Do NOT summarize, translate, or add commentary. Output the raw text only.
- If multiple pages/images are provided, separate each with a line "--- Page N ---".`;

export const ocrImages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: `Extract all text from the following document image(s)${
          data.label ? ` (${data.label})` : ""
        }.`,
      },
      ...data.images.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("OCR gateway error", response.status, text);
      if (response.status === 429)
        throw new Error("AI rate limit reached. Please wait and try again.");
      if (response.status === 402)
        throw new Error(
          "AI credits exhausted. Please add credits in Lovable workspace settings.",
        );
      throw new Error(`AI gateway error (${response.status}).`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { text: content };
  });
