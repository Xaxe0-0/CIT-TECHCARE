# TechCare assistant handoff

The help widget answers TechCare questions from local project content first. Questions it cannot answer go to `POST /api/assistant`, which uses a local [Ollama](https://ollama.com) server (no OpenAI SDK, cloud AI, or API credentials):

1. A question with no technology words is declined immediately (the page links to Discussion).
2. Keywords in `backend/src/services/tech-fixes.mjs` propose verified fixes; the `nomic-embed-text` embedding model checks the best one is about the same problem. A match is returned word for word, so its steps and menu paths stay correct.
3. Otherwise the chat model (`qwen2.5:3b` by default) streams an answer under strict rules, or replies `ESCALATE`, which the page shows as a link to Discussion. Each question is answered on its own, without earlier turns.

Configure it with `TECHCARE_ASSISTANT_AI`, `TECHCARE_OLLAMA_URL`, `TECHCARE_OLLAMA_MODEL`, `TECHCARE_OLLAMA_EMBED_MODEL`, and `TECHCARE_ASSISTANT_MAX_TOKENS` (see `.env.example`). After editing the verified fixes or changing models, run `npm run test:assistant` with Ollama running. `qwen2.5:3b` uses the Qwen research licence (non-commercial); choose an Apache-2.0 model for commercial use.

## How answers work

The widget runs entirely in the browser. `frontend/src/utils/assistant-knowledge.ts` holds public product answers, wording patterns, detailed steps, and internal links. `frontend/src/utils/guide-assistant.ts` matches questions to that content and the existing troubleshooting guides in `frontend/src/utils/content.ts`. It recognizes limited follow-ups such as “Show me the steps” and “Tell me more” using the last topic. This is a rule-based help assistant, not a generative model or general-purpose search engine. Unsupported questions receive an honest fallback with suggestions and a community link.

The UI is in `frontend/src/components/features/guide-assistant.tsx`, mounted in the shared shell. Suggested follow-ups retain the topic of the reply they belong to. Answers do not inspect accounts, discussions, private messages, or live moderation status, and cannot take actions for the visitor. Ordinary page links navigate to existing screens; account permissions still apply on those screens.

## Updating help

1. Verify a feature against its current screen and backend behavior.
2. Add or update a `helpTopics` entry with a stable ID, a sample question, matching patterns, an accurate answer, steps, and an optional internal link.
3. Keep entries specific. Exact sample questions are matched first. Broader pattern matches use array order, so place specific intents before generic words such as “account.”
4. Keep personal information, credentials, account status, and unapproved support promises out of this public content.
5. Add representative questions and follow-up checks to `scripts/chatbot-check.mjs` when extending behavior.

Booth answers intentionally link to the current page instead of duplicating dates. If workflows or permissions change, update the relevant answers and browser checks together. Broader language understanding would require a separate design decision; the current matcher does not promise to understand arbitrary wording.

## Privacy and operation

Chat messages are kept only in React memory, capped at 41 displayed messages. Clear chat, a page refresh, or an account change clears the conversation. Closing/reopening retains it within the same page session. There is no browser-storage persistence or chat transcript logging; AI questions are sent to the TechCare server and its local Ollama only, and are not stored. Page navigation and other site actions still use the normal TechCare backend.

There are no AI usage fees for this implementation. Ordinary hosting, email delivery, and other project operating costs are separate. Keep `.env.local`, databases, uploaded private media, and generated build folders out of a source handoff; use `.env.example` and have the receiving team supply its own operational configuration.

## Verification

Start the local app on port 3000, then run:

```powershell
node scripts/chatbot-check.mjs
npm run typecheck
npm run build
```

Browser checks use locally installed Edge and synthetic text without registering accounts. They cover app topics, follow-ups, matching ambiguity, safety/fallback behavior, escaped input, no external chat requests, keyboard controls, navigation, temporary history, and desktop/mobile accessibility. Screenshots and the report are written to ignored `artifacts/`.
