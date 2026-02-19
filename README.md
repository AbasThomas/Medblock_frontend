# UniBridge Frontend MVP

UniBridge is a virtual campus platform for Nigerian universities. This MVP is a hackathon-ready Next.js app with working AI endpoints and a demo dashboard.

## What is implemented

- AI lecture summarization
- AI resource moderation (toxicity safety checks)
- AI scholarship/gig matching (embedding-based ranking + fallback scoring)
- AI multilingual translation (English -> Yoruba / Nigerian Pidgin fallback)
- AI mental health check-in assistant with urgent keyword escalation
- Pricing plan cards and core platform modules for demo flow
- Resilient mode: app still works if Hugging Face is unavailable

## Free Hugging Face models used

- Summarization: `facebook/bart-large-cnn` with `sshleifer/distilbart-cnn-12-6` fallback
- Moderation: `unitary/unbiased-toxic-roberta`
- Matching embeddings: `sentence-transformers/all-MiniLM-L6-v2`
- Translation: `facebook/nllb-200-distilled-600M`
- Check-ins: `google/flan-t5-base`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env.local
```
Set `HUGGINGFACE_API_KEY` in `.env.local`.

3. Start dev server:
```bash
npm run dev
```

Open `http://localhost:3000`.

## API routes

- `GET /api/ai/status`
- `POST /api/ai/summarize`
- `POST /api/ai/translate`
- `POST /api/ai/moderate`
- `POST /api/ai/match`
- `POST /api/ai/checkin`

## Notes for production

- Add Supabase Auth, DB, Storage, and real user data wiring.
- Add `next-pwa` + IndexedDB queueing for full offline sync.
- Add moderation review queues for admin users.
- Add Paystack/Flutterwave server-side payment flows.
