# ML Check — AI Legal Document Review

> AI-powered legal document review for every Indian.

ML Check helps users understand legal documents in plain language. Upload contracts, agreements, NDAs, and more — get clause-by-clause risk analysis with plain-English explanations in English, Hindi, Marathi, or Gujarati.

## Features

- 📄 **Document Review** — Upload PDF, DOCX, images, or paste text. Get structured risk analysis with clause-by-clause ratings.
- 💬 **Chat with Your Document** — Ask questions about your uploaded document using RAG-powered AI search.
- 📰 **Legal Research** — Search recent Indian legal news, regulatory updates, and court developments via Exa.
- ⚖️ **General Legal Q&A** — Ask any legal question and get clear, easy-to-understand answers.
- 🌐 **Multilingual** — Responses available in English, Hindi, Marathi, and Gujarati (powered by Bhashini).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: OpenAI GPT-4o-mini via Vercel AI SDK
- **Web Search**: Exa API
- **Vector DB**: Pinecone
- **Translation**: Bhashini API (Government of India)
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/MihirMerani/myAI3.git
cd myAI3
npm install
```

### 2. Set Environment Variables

Copy `env.template` to `.env.local` and fill in the API keys:

```bash
cp env.template .env.local
```

#### Required Keys

| Variable | Description | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini | [platform.openai.com](https://platform.openai.com/api-keys) |
| `EXA_API_KEY` | Exa web search API key | [exa.ai](https://exa.ai) |
| `PINECONE_API_KEY` | Pinecone vector database key | [pinecone.io](https://www.pinecone.io/) |

#### Optional Keys (for translation)

| Variable | Description | Where to get it |
|---|---|---|
| `BHASHINI_USER_ID` | Bhashini userID for translation | [bhashini.gov.in](https://bhashini.gov.in) → Sign up → My Profile → Generate API Key → copy `userId` |
| `BHASHINI_API_KEY` | Bhashini ulcaApiKey | Same page as above → copy `ulcaApiKey` |

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Project Structure

```
app/
├── page.tsx                    # Landing page with 4 feature cards
├── chat/page.tsx               # Main chat interface
├── api/
│   ├── chat/
│   │   ├── route.ts            # Chat API with streaming
│   │   └── tools/
│   │       ├── web-search.ts   # Exa web search tool
│   │       └── search-vector-database.ts  # Pinecone tool
│   └── document-review/
│       └── route.ts            # Document upload & review API
components/
├── document-upload.tsx         # Document upload UI component
├── messages/
│   └── tool-call.tsx           # Tool call display
└── ui/                         # shadcn/ui components
config.ts                       # App configuration
prompts.ts                      # System prompts
lib/
├── moderation.ts               # Content moderation
├── pinecone.ts                 # Pinecone integration
└── sources.ts                  # Source/citation handling
```

## Deployment

This app is configured for Vercel deployment. Push to GitHub and connect to Vercel, then set the environment variables in the Vercel dashboard.

## Disclaimer

⚠️ ML Check is not a substitute for professional legal advice. Always consult a qualified lawyer for important legal decisions.

## License

MIT — Created by Mihir & Lakshay
