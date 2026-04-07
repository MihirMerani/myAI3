import { Pinecone } from '@pinecone-database/pinecone';
import { PINECONE_TOP_K } from '@/config';
import { searchResultsToChunks, getSourcesFromChunks, getContextFromSources } from '@/lib/sources';
import { PINECONE_INDEX_NAME } from '@/config';

// Lazy-init Pinecone to avoid build-time errors when API key isn't set
let _pinecone: Pinecone | null = null;
function getPinecone(): Pinecone {
    if (!_pinecone) {
        if (!process.env.PINECONE_API_KEY) {
            throw new Error('PINECONE_API_KEY is not set');
        }
        _pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
    }
    return _pinecone;
}

export const pinecone = { get instance() { return getPinecone(); } };

function getPineconeIndex() {
    return getPinecone().Index(PINECONE_INDEX_NAME);
}

export async function searchPinecone(
    query: string,
): Promise<string> {
    const pineconeIndex = getPineconeIndex();
    const results = await pineconeIndex.namespace('default').searchRecords({
        query: {
            inputs: {
                text: query,
            },
            topK: PINECONE_TOP_K,
        },
        fields: ['text', 'pre_context', 'post_context', 'source_url', 'source_description', 'source_type', 'order'],
    });

    const chunks = searchResultsToChunks(results);
    const sources = getSourcesFromChunks(chunks);
    const context = getContextFromSources(sources);
    return `< results > ${context} </results>`;
}