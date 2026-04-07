import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

// Lazy-init Exa client to avoid build-time errors when API key isn't set
let _exa: Exa | null = null;
function getExa(): Exa {
  if (!_exa) {
    _exa = new Exa(process.env.EXA_API_KEY);
  }
  return _exa;
}

export const webSearch = tool({
  description: 'Search the web for up-to-date information, especially Indian legal news, regulatory updates, and recent court developments',
  inputSchema: z.object({
    query: z.string().min(1).describe('The search query'),
  }),
  execute: async ({ query }) => {
    try {
      const exa = getExa();
      const { results } = await exa.search(query, {
        contents: {
          text: true,
        },
        numResults: 3,
      });

      return results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.text?.slice(0, 1000) || '',
        publishedDate: result.publishedDate,
      }));
    } catch (error) {
      console.error('Error searching the web:', error);
      return [];
    }
  },
});