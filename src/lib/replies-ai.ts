// The AI path for a patient's message: Jev reads the meaning, Claude may write one warm sentence,
// code decides and checks everything. With AI_MODE unset or "templates", or no keys, nothing here
// calls out and the reply is exactly the fixed, approved one.
import { claudeWriter, getOpening, type OpeningWriter } from "./ai-writer";
import { askJev, confidentIntent, MAX_MESSAGE_CHARS, type Classifier } from "./jev";
import { languageOf } from "./language";
import { decideIntent, handlePatientMessage, type ReplyOptions, type ReplyOutcome } from "./replies";
import type { AppState } from "./state";

export type AiDeps = { classify?: Classifier; write?: OpeningWriter; env?: Record<string, string | undefined> };

// Read at request time, never at the top of a file.
export function aiMode(env: Record<string, string | undefined> = process.env): { jev: boolean; opening: boolean } {
  const on = env.AI_MODE?.trim().toLowerCase() === "ai";
  return {
    jev: on && !!env.TYPESAFE_API_KEY?.trim(),
    opening: on && !!env.ANTHROPIC_API_KEY?.trim() && env.AI_OPENING?.trim().toLowerCase() !== "off",
  };
}

export async function handlePatientMessageAI(
  state: AppState,
  patientId: string,
  text: string,
  now: Date = new Date(),
  deps: AiDeps = {},
): Promise<ReplyOutcome> {
  const mode = aiMode(deps.env);
  if (!mode.jev && !mode.opening) return handlePatientMessage(state, patientId, text, now);

  const message = text.slice(0, MAX_MESSAGE_CHARS);
  const opts: ReplyOptions = {};
  let ms = 0;
  let cost = 0;

  let intent: string | null = null;
  let confidence: number | null = null;
  if (mode.jev) {
    const jev = await (deps.classify ?? askJev)(message);
    ms += jev.ms;
    if (jev.ok) {
      cost += jev.costUsd ?? 0;
      intent = jev.intent;
      confidence = jev.intentConfidence;
    }
    opts.jevIntent = confidentIntent(jev);
  }

  let openingNote: string | null = mode.opening ? null : "opening_off";
  const decided = decideIntent(message, opts.jevIntent ?? null);
  if (mode.opening && !decided.urgent) {
    const o = await getOpening(deps.write ?? claudeWriter, languageOf(message), message);
    ms += o.ms;
    cost += o.costUsd ?? 0;
    opts.opening = o.text;
    openingNote = o.note;
  } else if (decided.urgent) {
    openingNote = "urgent_no_ai_sentence";
  }

  opts.ai = {
    engine: opts.jevIntent ? "jev" : "keywords",
    intent,
    confidence,
    ms,
    costUsd: cost,
    openingNote,
  };

  // The decision on record: engine, confidence, time and cost. Never the patient's words.
  console.log("[reply]", JSON.stringify({ engine: opts.ai.engine, intent, confidence, ms, openingNote }));
  return handlePatientMessage(state, patientId, text, now, opts);
}
