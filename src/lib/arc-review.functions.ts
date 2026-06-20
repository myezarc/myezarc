import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  guidelineText: z.string().min(20).max(400_000),
  applicationText: z.string().min(20).max(400_000),
});

const ReviewSchema = z.object({
  formSection: z.object({
    found: z.boolean(),
    sectionTitle: z.string(),
    locationHint: z.string(),
    requiredFields: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    ),
  }),
  decision: z.enum(["approved", "conditional", "rejected"]),
  summary: z.string(),
  findings: z.array(
    z.object({
      rule: z.string(),
      status: z.enum(["pass", "warn", "fail"]),
      note: z.string(),
    }),
  ),
  homeownerMessage: z.string(),
});

export type ReviewResult = z.infer<typeof ReviewSchema>;

const SYSTEM_PROMPT = `You are an Architectural Review Committee (ARC) assistant for an HOA. You will receive two documents:

1. The HOA's Architectural Guidelines (rules, standards, and the architectural request form template).
2. A homeowner's submitted Architectural Application.

Your job:

A) Locate the "Architectural Request Form" / "ARC Application" section within the GUIDELINE document. The exact name varies per HOA — it may be called "Application Form", "Request for Architectural Review", "ARC Submittal Form", "Improvement Request", "Modification Application", etc. Find whichever section in the guideline lists the required fields/information a homeowner must provide. Extract the explicit list of required fields from THAT section.

B) Compare the homeowner's APPLICATION document against the required fields you extracted from the guideline, AND against any substantive rules in the guideline (setbacks, materials, color palettes, heights, signed acknowledgements, etc.) that you can verify from the application's contents.

C) Produce a structured review:
- decision: "approved" if everything aligns, "conditional" if there are minor fixable gaps, "rejected" if critical items are missing or violate hard rules.
- summary: 2-3 sentences for the committee.
- findings: one entry per checked item. Use "pass" / "warn" / "fail". Be specific — quote the rule or required field, and quote/cite what the application says (or note that it is missing).
- homeownerMessage: A warm, neighbor-friendly paragraph addressed to the homeowner. Plain English. Thank them, then list exactly what they need to do to fix any issues, referencing the relevant guideline section. If approved, just say so warmly.

Checklist requirements:
- If you find an application/form section in the guideline, create a finding for EVERY required field in that form section.
- Always check the main ARC completeness items when they are relevant to the project: homeowner/contact information, property address or lot/unit, project description/scope, site plan or drawing, dimensions/height/placement, materials, colors/finish, contractor/permit details if mentioned, signatures/acknowledgements, and neighbor impact if mentioned.
- For substantive HOA rules, create findings only for rules actually present in the guideline. Do not invent setback, height, color, or material rules.
- If the application does not provide enough information to verify a rule, use "warn" and explain the missing information. Use "fail" for a clear hard-rule conflict or a critical missing required item.
- Prefer at least 6 findings when the documents contain enough information. More is better when there are more required fields or rules.

Be strict but fair. NEVER invent rules or fields that are not in the guideline. If the guideline doesn't contain an application-form section, set formSection.found = false and base your review only on substantive rules you can verify.`;

export const runArcReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI gateway is not configured.");
    }

    const userContent = `=== HOA ARCHITECTURAL GUIDELINE (full text) ===
${data.guidelineText}

=== HOMEOWNER APPLICATION (full text) ===
${data.applicationText}

Now perform the review as instructed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_arc_review",
              description:
                "Submit the structured ARC review with extracted form fields and findings.",
              parameters: {
                type: "object",
                properties: {
                  formSection: {
                    type: "object",
                    properties: {
                      found: { type: "boolean" },
                      sectionTitle: {
                        type: "string",
                        description:
                          "The exact heading/name of the application form section in the guideline (e.g. 'ARC Submittal Form'). Empty string if not found.",
                      },
                      locationHint: {
                        type: "string",
                        description:
                          "Where in the guideline the section appears (page number, section number, or short quote).",
                      },
                      requiredFields: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["name", "description"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["found", "sectionTitle", "locationHint", "requiredFields"],
                    additionalProperties: false,
                  },
                  decision: {
                    type: "string",
                    enum: ["approved", "conditional", "rejected"],
                  },
                  summary: { type: "string" },
                  findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rule: { type: "string" },
                        status: {
                          type: "string",
                          enum: ["pass", "warn", "fail"],
                        },
                        note: { type: "string" },
                      },
                      required: ["rule", "status", "note"],
                      additionalProperties: false,
                    },
                  },
                  homeownerMessage: { type: "string" },
                },
                required: [
                  "formSection",
                  "decision",
                  "summary",
                  "findings",
                  "homeownerMessage",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "submit_arc_review" },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("AI gateway error", response.status, text);
      if (response.status === 429) {
        throw new Error("AI rate limit reached. Please wait a moment and try again.");
      }
      if (response.status === 402) {
        throw new Error(
          "AI credits exhausted. Please add credits in Lovable workspace settings.",
        );
      }
      throw new Error(`AI gateway error (${response.status}).`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      throw new Error("AI did not return a structured review.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(args);
    } catch {
      throw new Error("AI returned malformed JSON.");
    }

    return ReviewSchema.parse(parsed);
  });
