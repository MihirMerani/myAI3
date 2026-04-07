import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import pdf from "pdf-parse";

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Bhashini translation helper
async function translateWithBhashini(
    text: string,
    targetLang: string
): Promise<string> {
    const userId = process.env.BHASHINI_USER_ID;
    const apiKey = process.env.BHASHINI_API_KEY;

    if (!userId || !apiKey) {
        console.warn("Bhashini API credentials not configured, skipping translation");
        return text;
    }

    const langMap: Record<string, string> = {
        hi: "hi",
        mr: "mr",
        gu: "gu",
    };

    const targetLanguage = langMap[targetLang];
    if (!targetLanguage) return text;

    try {
        const response = await fetch(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    userID: userId,
                    ulcaApiKey: apiKey,
                },
                body: JSON.stringify({
                    pipelineTasks: [
                        {
                            taskType: "translation",
                            config: {
                                language: {
                                    sourceLanguage: "en",
                                    targetLanguage: targetLanguage,
                                },
                                serviceId: "ai4bharat/indictrans-v2-all-gpu--t4",
                            },
                        },
                    ],
                    inputData: {
                        input: [{ source: text }],
                    },
                }),
            }
        );

        if (!response.ok) {
            console.error("Bhashini API error:", response.status);
            return text;
        }

        const data = await response.json();
        const translatedText =
            data?.pipelineResponse?.[0]?.output?.[0]?.target || text;
        return translatedText;
    } catch (error) {
        console.error("Bhashini translation error:", error);
        return text;
    }
}

// Extract text from DOCX using mammoth
async function extractDocxText(buffer: Buffer): Promise<string> {
    try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error("DOCX extraction error:", error);
        throw new Error("Failed to extract text from DOCX file");
    }
}

// Extract text from image using OpenAI Vision
async function extractImageText(
    base64Data: string,
    mimeType: string
): Promise<string> {
    try {
        const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please extract and transcribe ALL text from this document image. Preserve the formatting and structure as much as possible. If it's a legal document, maintain clause numbering and section headers.",
                        },
                        {
                            type: "image",
                            image: `data:${mimeType};base64,${base64Data}`,
                        },
                    ],
                },
            ],
        });
        return text;
    } catch (error) {
        console.error("Image OCR error:", error);
        throw new Error("Failed to extract text from image");
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const pastedText = formData.get("text") as string | null;
        const language = (formData.get("language") as string) || "en";
        const reviewType = (formData.get("reviewType") as string) || "full";

        let extractedText = "";

        // --- Text Extraction ---
        if (pastedText && pastedText.trim()) {
            extractedText = pastedText.trim();
        } else if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileType = file.type;

            if (fileType === "application/pdf") {
                const data = await pdf(buffer);
                extractedText = data.text;
            } else if (
                fileType ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                fileType === "application/msword"
            ) {
                extractedText = await extractDocxText(buffer);
            } else if (fileType.startsWith("image/")) {
                const base64 = buffer.toString("base64");
                extractedText = await extractImageText(base64, fileType);
            } else if (fileType === "text/plain") {
                extractedText = buffer.toString("utf-8");
            } else {
                return NextResponse.json(
                    { error: "Unsupported file type. Use PDF, DOCX, image, or text." },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { error: "No file or text provided" },
                { status: 400 }
            );
        }

        if (!extractedText.trim()) {
            return NextResponse.json(
                { error: "Could not extract any text from the document" },
                { status: 400 }
            );
        }

        // Truncate very long documents
        const maxChars = 15000;
        if (extractedText.length > maxChars) {
            extractedText = extractedText.substring(0, maxChars) + "\n\n[Document truncated for analysis]";
        }

        // --- AI Analysis ---
        let reviewPrompt = "";

        if (reviewType === "full") {
            reviewPrompt = `You are a legal document review AI for Indian law. Perform a FULL review of the following document.

Your response MUST be valid JSON with this exact structure:
{
  "documentType": "string - type of document (e.g., Employment Contract, NDA, Rental Agreement, Loan Agreement, etc.)",
  "summary": "string - plain-English summary of the document (3-5 sentences)",
  "riskScore": number between 0-100 (0 = safe, 100 = very risky),
  "clauses": [
    {
      "clause": "string - clause name or section title",
      "risk": "high" | "medium" | "low",
      "explanation": "string - what this clause means and why it has this risk level"
    }
  ]
}

IMPORTANT ANALYSIS RULES:
- Identify: one-sided terms, missing standard protections, unusual jurisdiction clauses, auto-renewal traps, liability caps, IP assignment issues, non-compete restrictions, indemnification clauses, termination conditions
- Flag any clauses that are unusual for Indian law
- If standard clauses (like dispute resolution, force majeure, data protection) are MISSING, add them as high/medium risk clauses with explanation
- Keep explanations simple enough for a non-lawyer to understand
- Respond ONLY with the JSON, no other text`;
        } else if (reviewType === "risk-only") {
            reviewPrompt = `You are a legal document review AI for Indian law. Identify ONLY the risky clauses in the following document.

Your response MUST be valid JSON:
{
  "documentType": "string",
  "summary": "string - one sentence about what this document is",
  "riskScore": number 0-100,
  "clauses": [
    {
      "clause": "string",
      "risk": "high" | "medium",
      "explanation": "string - why this is risky"
    }
  ]
}

Only include clauses that are "high" or "medium" risk. Skip low-risk/OK clauses.
Respond ONLY with JSON.`;
        } else {
            reviewPrompt = `You are a legal document review AI for Indian law. Provide a SUMMARY of the following document.

Your response MUST be valid JSON:
{
  "documentType": "string",
  "summary": "string - detailed 5-8 sentence summary covering key terms, parties, obligations, and notable conditions",
  "riskScore": number 0-100,
  "clauses": []
}

Respond ONLY with JSON.`;
        }

        const { text: aiResponse } = await generateText({
            model: openai("gpt-4o-mini"),
            messages: [
                { role: "system", content: reviewPrompt },
                {
                    role: "user",
                    content: `Review this document:\n\n${extractedText}`,
                },
            ],
        });

        // Parse AI response
        let result;
        try {
            // Try to extract JSON from the response (handle cases where AI adds extra text)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in AI response");
            }
            result = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error("Failed to parse AI response:", aiResponse);
            return NextResponse.json(
                { error: "Failed to parse document review. Please try again." },
                { status: 500 }
            );
        }

        // Ensure correct structure
        const reviewResult = {
            documentType: result.documentType || "Unknown Document",
            summary: result.summary || "No summary available",
            riskScore: Math.min(100, Math.max(0, Number(result.riskScore) || 50)),
            clauses: Array.isArray(result.clauses)
                ? result.clauses.map((c: any) => ({
                    clause: c.clause || "Unnamed clause",
                    risk: ["high", "medium", "low"].includes(c.risk) ? c.risk : "medium",
                    explanation: c.explanation || "No explanation available",
                }))
                : [],
            translatedSummary: undefined as string | undefined,
        };

        // --- Bhashini Translation ---
        if (language !== "en") {
            const translatedSummary = await translateWithBhashini(
                reviewResult.summary,
                language
            );
            reviewResult.translatedSummary = translatedSummary;

            // Also translate clause explanations
            for (let i = 0; i < reviewResult.clauses.length; i++) {
                const translatedExplanation = await translateWithBhashini(
                    reviewResult.clauses[i].explanation,
                    language
                );
                reviewResult.clauses[i].explanation = translatedExplanation;
            }
        }

        return NextResponse.json(reviewResult);
    } catch (error: any) {
        console.error("Document review error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
