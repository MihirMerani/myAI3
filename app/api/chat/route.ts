
import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { MODEL } from '@/config';
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';
import pdf from 'pdf-parse';

export const maxDuration = 60; // Increased duration for PDF processing
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    if (latestUserMessage) {
        // --- 1. PDF EXTRACTION LOGIC START ---

        // FIX: Cast to 'any' to access experimental_attachments without TS error
        const attachments = (latestUserMessage as any).experimental_attachments;

        if (attachments) {
            for (const attachment of attachments) {
                if (attachment.contentType === 'application/pdf' && attachment.url) {
                    try {
                        const base64Data = attachment.url.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const data = await pdf(buffer);

                        // Append PDF text to the user's message parts
                        const pdfContext = `\n\n--- [ATTACHED PDF CONTENT: ${attachment.name}] ---\n${data.text}\n--- [END OF PDF] ---`;

                        // Find the text part and append, or create a new one
                        const textPart = latestUserMessage.parts.find(p => p.type === 'text');
                        if (textPart && 'text' in textPart) {
                            textPart.text += pdfContext;
                        } else {
                            latestUserMessage.parts.push({ type: 'text', text: pdfContext });
                        }

                        // Remove attachment to prevent binary errors downstream
                        delete (latestUserMessage as any).experimental_attachments;

                    } catch (e) {
                        console.error("PDF Parse Error", e);
                    }
                }
            }
        }
        // --- PDF EXTRACTION LOGIC END ---

        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        if (textParts) {
            // Now we moderate the text INCLUDING the PDF content
            const moderationResult = await isContentFlagged(textParts);

            if (moderationResult.flagged) {
                const stream = createUIMessageStream({
                    execute({ writer }) {
                        const textId = 'moderation-denial-text';
                        writer.write({ type: 'start' });
                        writer.write({ type: 'text-start', id: textId });
                        writer.write({
                            type: 'text-delta',
                            id: textId,
                            delta: moderationResult.denialMessage || "Your message (or document) violates our guidelines. I can't answer that."
                        });
                        writer.write({ type: 'text-end', id: textId });
                        writer.write({ type: 'finish' });
                    },
                });
                return createUIMessageStreamResponse({ stream });
            }
        }
    }

    const result = streamText({
        model: MODEL,
        system: SYSTEM_PROMPT,
        messages: convertToModelMessages(messages),
        tools: {
            webSearch,
            vectorDatabaseSearch,
        },
        stopWhen: stepCountIs(10),
        providerOptions: {
            openai: {
                reasoningSummary: 'auto',
                reasoningEffort: 'low',
                parallelToolCalls: false,
            }
        }
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
    });
}
