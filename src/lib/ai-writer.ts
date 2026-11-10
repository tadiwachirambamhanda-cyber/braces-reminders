// Claude writes one warm sentence for a reply. Code checks it (opening-rules.ts) and uses the
// fixed template alone if the check fails, Claude errors or takes too long.
// Server side only: never import this from a client component.
import Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "./language";
import { MAX_MESSAGE_CHARS } from "./jev";
import { checkOpening, OPENING_PROMPT } from "./opening-rules";

export const WRITER_MODEL = "claude-sonnet-5-5";
export const WRITER_TIMEOUT_MS = 5_000;
const USD_PER_INPUT_TOKEN = 2 / 1_000_000;
const USD_PER_OUTPUT_TOKEN = 10 / 1_000_000;

export type DraftResult =
  | { ok: true; text: string; ms: number; costUsd: number | null }
  | { ok: false; error: string; ms: number };
export type OpeningWriter = (args: { lang: Lang; message: string }) => Promise<DraftResult>;

export const claudeWriter: OpeningWriter = async ({ lang, message }) => {
  const started = performance.now();
  try {
    const client = new Anthropic({ maxRetries: 0, timeout: WRITER_TIMEOUT_MS }); // reads ANTHROPIC_API_KEY
    const response = await client.messages.create({
      model: WRITER_MODEL,
      max_tokens: 1000,
      system: OPENING_PROMPT,
      messages: [
        {
          role: "user",
          content: `Language: ${lang === "ar" ? "Arabic" : "English"}\n<patient_message>\n${message.slice(0, MAX_MESSAGE_CHARS)}\n</patient_message>`,
        },
      ],
      output_config: { effort: "low" },
    });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    const ms = Math.round(performance.now() - started);
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !text) {
      return { ok: false, error: `no_usable_text:${response.stop_reason}`, ms };
    }
    return {
      ok: true,
      text,
      ms,
      costUsd: response.usage.input_tokens * USD_PER_INPUT_TOKEN + response.usage.output_tokens * USD_PER_OUTPUT_TOKEN,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.name : "Error", ms: Math.round(performance.now() - started) };
  }
};

export type Opening = { text: string | null; ms: number; costUsd: number | null; note: string | null };

// The checked opening, or null text with the reason it was not used.
export async function getOpening(write: OpeningWriter, lang: Lang, message: string): Promise<Opening> {
  const draft = await write({ lang, message });
  if (!draft.ok) return { text: null, ms: draft.ms, costUsd: null, note: `writer_${draft.error}` };
  const checked = checkOpening(draft.text, lang);
  if (!checked.ok) return { text: null, ms: draft.ms, costUsd: draft.costUsd, note: `failed:${checked.failed.join(",")}` };
  return { text: draft.text, ms: draft.ms, costUsd: draft.costUsd, note: null };
}
