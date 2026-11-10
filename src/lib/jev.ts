// Jev reads what a patient's message means. Code judges the answer (see jev-rules in docs/).
// Server side only: never import this from a client component.
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

export const JEV_MODEL = "jev-1.13.0";
export const JEV_MIN_CONFIDENCE = 0.6; // below this, the answer counts as "not sure"
export const JEV_TIMEOUT_MS = 2000;
const JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000; // output tokens are free
export const MAX_MESSAGE_CHARS = 500; // never send more than this out

export const QUESTIONS = {
  intent: {
    ask: "What does the patient want?",
    options: {
      times_question: "They ask in general when they can come, what days or hours the braces visits are, or whether there is availability, without naming a particular day or time",
      booking_request: "They want to book, name a particular day or time, or ask to change or cancel an appointment",
      price_question: "They ask what something costs or about payment",
      greeting_or_thanks: "Only a greeting, a thank-you or an acknowledgement, with no question or request",
      pain_or_urgent: "Pain, swelling, bleeding, a broken or loose bracket or wire, or anything that sounds urgent",
      other: "Something else that fits none of the other options",
      not_sure: "The message is too unclear to tell",
    },
  },
  language: {
    ask: "Which language is the message written in?",
    options: { english: "English", arabic: "Arabic", other: "Any language that is not English or Arabic" },
  },
} as const;

export type JevIntent = keyof typeof QUESTIONS.intent.options;

export type JevResult =
  | { ok: true; intent: JevIntent; intentConfidence: number; language: string; ms: number; costUsd: number | null }
  | { ok: false; error: string; ms: number };

export type Classifier = (message: string) => Promise<JevResult>;

export const askJev: Classifier = async (message) => {
  const started = performance.now();
  try {
    const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY
    const { answers, usage } = await client.systemOne(
      {
        state: {
          business: "A dental clinic receiving a WhatsApp message from a braces patient.",
          patient_message: message.slice(0, MAX_MESSAGE_CHARS),
        },
        questions: {
          intent: choice(QUESTIONS.intent.ask, QUESTIONS.intent.options),
          language: choice(QUESTIONS.language.ask, QUESTIONS.language.options),
        },
        model: JEV_MODEL,
      },
      { timeout: JEV_TIMEOUT_MS, signal: AbortSignal.timeout(JEV_TIMEOUT_MS), retry: { maxRetries: 0 } },
    );
    return {
      ok: true,
      intent: answers.intent.choice as JevIntent,
      intentConfidence: answers.intent.confidence,
      language: String(answers.language.choice),
      ms: Math.round(performance.now() - started),
      costUsd: usage.input_tokens === null ? null : usage.input_tokens * JEV_USD_PER_INPUT_TOKEN,
    };
  } catch (err) {
    // Only the error's name goes on record, never the message or a key.
    return { ok: false, error: err instanceof Error ? err.name : "Error", ms: Math.round(performance.now() - started) };
  }
};

// Code judges: only a confident answer counts.
export function confidentIntent(r: JevResult): JevIntent | null {
  if (!r.ok) return null;
  if (!(r.intentConfidence >= JEV_MIN_CONFIDENCE)) return null;
  return r.intent === "not_sure" ? null : r.intent;
}
