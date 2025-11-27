
import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { openai } from '@ai-sdk/openai'; // Import OpenAI provider
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';

// Allow up to 60s for file processing
export const maxDuration = 60; 

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    // 1. Safe Moderation Check
    if (latestUserMessage) {
        // We only extract 'text' parts for moderation, ignoring 'file' parts
        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        // Only run moderation if there is actual text to check
        if (textParts) {
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
                            delta: moderationResult.denialMessage || "Your message violates our guidelines. I can't answer that.",
                        });
                        writer.write({ type: 'text-end', id: textId });
                        writer.write({ type: 'finish' });
                    },
                });

                return createUIMessageStreamResponse({ stream });
            }
        }
    }

    // 2. Stream with OpenAI
    const result = streamText({
        model: openai('gpt-4o'), // Explicitly using GPT-4o
        system: SYSTEM_PROMPT,
        // convertToModelMessages automatically transforms the files from the client
        // into the Base64 format OpenAI expects.
        messages: convertToModelMessages(messages), 
        tools: {
            webSearch,
            vectorDatabaseSearch,
        },
        stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true, // GPT-4o generally doesn't use this, but it's safe to leave
    });
}
