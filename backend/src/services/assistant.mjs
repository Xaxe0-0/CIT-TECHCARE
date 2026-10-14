import { Problem, throttle } from '../middleware/auth.mjs';
import * as v from '../validations/validation.mjs';
import { findFixes, looksTechnical } from './tech-fixes.mjs';
import { filipinoFixes } from './tech-fixes-fil.mjs';
import { isFilipino } from '../../../shared/src/language.mjs';

// Answers come from local Ollama models in two steps:
// 1. Keywords propose verified fixes and an embedding model checks one is about the same
//    problem. A match is streamed word for word, so its steps and menu paths stay correct.
// 2. Otherwise the model writes an answer under strict rules, or replies ESCALATE so the page
//    can send the person to Discussion.
export const ESCALATE = 'ESCALATE';
const SYSTEM = `You are the TechCare assistant on a campus community tech-support website. You only help fix or use everyday technology: computers and laptops, phones and tablets, Windows, macOS, Android, iPhone, Wi-Fi and internet, Bluetooth, printers, browsers, email, common apps, files and storage, slow or freezing devices, updates, and online safety.

Rules:
- Be accurate. Give only well-known, safe, standard troubleshooting steps. Never invent menu names, settings, commands, error codes, or facts.
- Do not write menu paths, keyboard shortcuts, or commands unless they appear in the settings list below. Otherwise describe the setting by name, for example "open your mouse settings".
- Start with the most likely fix. Use 3 to 6 short numbered steps, then one sentence on what to do if it still fails. Stay under 150 words. Plain text only: no markdown, no bold, no headings.
- Always reply in clear, simple English, even when the question is in Filipino.
- Never ask for passwords, verification codes, or personal details. Do not suggest disabling security software, editing the registry or BIOS, opening the device, or downloading unofficial tools.
- For a swollen battery, smoke, a burning smell, sparks, or liquid damage: tell them to stop using the device and get qualified help.
- Reply with exactly ${ESCALATE} and nothing else when: the question is not about fixing or using technology (general knowledge, homework, opinions, chat); it needs someone to physically inspect the device; it depends on a school system or account you cannot see; it asks for anything harmful or unlawful; or you are not confident your answer is correct.

Settings list (the only menu paths you may write):
- Windows 11: Settings > System > Sound; Settings > Network & internet; Settings > Bluetooth & devices; Settings > Windows Update; Settings > System > Troubleshoot > Other troubleshooters.
- Android: Settings > Connections or Network & internet; Settings > Connected devices. iPhone: Settings > Wi-Fi; Settings > Bluetooth; Settings > General > Software Update.`;
// Worked examples teach the small model the expected length, tone, and when to decline.
const EXAMPLES = [
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: ESCALATE },
  { role: 'user', content: 'Mabagal mag-load yung apps sa phone ko' },
  {
    role: 'assistant',
    content: [
      '1. Restart the phone to clear apps stuck in the background.',
      '2. Close apps you are not using from the recent apps view.',
      '3. Check that the phone has free storage space; delete large videos or unused apps if it is almost full.',
      '4. Update the slow apps and install any pending system update.',
      '5. If one app is slow, clear its cache or reinstall it.',
      'If it is still slow, ask the community with your phone model and what you tried.',
    ].join('\n'),
  },
];

const config = () => ({
  enabled: process.env.TECHCARE_ASSISTANT_AI !== '0',
  url: process.env.TECHCARE_OLLAMA_URL || 'http://127.0.0.1:11434',
  model: process.env.TECHCARE_OLLAMA_MODEL || 'qwen2.5:3b',
  embedModel: process.env.TECHCARE_OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  // Token budget per generated answer; also bounds CPU time on a shared server.
  tokens: Math.min(Math.max(Number(process.env.TECHCARE_ASSISTANT_MAX_TOKENS) || 400, 64), 1024),
});
export const assistantEnabled = () => config().enabled;

const unavailable = () =>
  new Problem('The AI assistant is unavailable right now. Built-in help still works.', 503);

async function ollama(body, signal) {
  const { url, model } = config();
  let response;
  try {
    response = await fetch(new URL('/api/chat', url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: '10m', ...body }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    });
  } catch {
    throw unavailable();
  }
  if (response.ok && response.body) return response;
  if (response.status === 404)
    console.error(
      `TechCare assistant model "${model}" is not installed. Run: ollama pull ${model}`,
    );
  throw unavailable();
}

// Embedding similarity (nomic-embed-text) decides whether the best keyword candidate is about the
// same problem. Tested on English, Filipino, and look-alike questions: a small chat model was
// unreliable at this judgement, embeddings were not.
const fixVectors = new Map();
async function embed(input, signal) {
  const { url, embedModel } = config();
  const response = await fetch(new URL('/api/embed', url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: embedModel, input, keep_alive: '10m' }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });
  if (!response.ok) throw new Error('embedding unavailable');
  return (await response.json()).embeddings;
}
const cosine = (a, b) => {
  let dot = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return dot / Math.sqrt(x * y);
};
export async function matchFix(question, signal) {
  const candidates = findFixes(question);
  if (!candidates.length) return null;
  try {
    const missing = candidates.filter(({ fix }) => !fixVectors.has(fix));
    if (missing.length) {
      const vectors = await embed(
        missing.map(({ fix }) => `search_document: ${fix.title}. ${fix.keywords.join(', ')}`),
        signal,
      );
      missing.forEach(({ fix }, i) => fixVectors.set(fix, vectors[i]));
    }
    const [query] = await embed([`search_query: ${question}`], signal);
    const best = candidates
      .map(({ fix, score }) => ({ fix, score, similarity: cosine(query, fixVectors.get(fix)) }))
      .sort((a, b) => b.similarity - a.similarity)[0];
    // A multi-word keyword hit (often a Filipino phrase) is strong evidence on its own.
    return best.similarity >= (best.score >= 2 ? 0.5 : 0.57) ? best.fix : null;
  } catch {
    return null;
  }
}

const encoder = new TextEncoder();
const textStream = (text) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

export async function streamAnswer(d, me, signal) {
  const { enabled, tokens } = config();
  if (!enabled) throw unavailable();
  // Local inference is expensive: a site-wide ceiling plus a per-member limit.
  await throttle('source:assistant', 30, 60);
  if (me) await throttle(`assistant:${me.id}`, 10, 60);
  const question = v.text(d.message, 'Question', 2, 400);
  if (!looksTechnical(question)) return { source: 'generated', stream: textStream(ESCALATE) };
  const fix = await matchFix(question, signal);
  if (fix) {
    // Filipino questions get the hand-written Filipino fix; generated answers stay in English
    // because the local model's Filipino is not reliable enough for step-by-step help.
    const { title, steps } = (isFilipino(question) && filipinoFixes[fix.title]) || fix;
    return {
      source: 'verified',
      stream: textStream([`${title}:`, ...steps.map((step, i) => `${i + 1}. ${step}`)].join('\n')),
    };
  }
  const upstream = await ollama(
    {
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM },
        // Each question stands alone: earlier turns made the small model mix topics and
        // ignore its rules, so follow-ups are handled by built-in help and Discussion.
        ...EXAMPLES,
        // Small models follow instructions placed next to the question most reliably.
        {
          role: 'user',
          content: `${question}\n\n(Answer in English. Do not name specific buttons, menus, or options unless they are in the settings list.)`,
        },
      ],
      options: { temperature: 0.2, top_p: 0.9, num_predict: tokens, num_ctx: 4096 },
    },
    signal,
  );
  // Ollama streams one JSON object per line; forward only the generated text tokens.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  return {
    source: 'generated',
    stream: new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
              if (!line.trim()) continue;
              const event = JSON.parse(line);
              if (event.error) throw new Error('model error');
              if (event.message?.content) controller.enqueue(encoder.encode(event.message.content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        return reader.cancel();
      },
    }),
  };
}
