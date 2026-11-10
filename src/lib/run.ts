// The real weekly run. It uses F2's decisions to see who is due, then looks at what was really
// saved: reminders already sent, the reminder number, and the call list. Nothing is sent
// outside the simulator, and nothing is built from wording that has not been approved.
import { isApproved } from "./approval";
import { decideWeek } from "./run-week";
import { sendTimes, DEFAULT_RUN_AT } from "./schedule";
import { addCall, effectiveData, newId, type AppState, type CallReason, type Message, type RunRecord } from "./state";
import { buildReminder, wordingHash } from "./wording";
import { isBraces } from "./patients";

export type RunSummary = {
  runId: string;
  monday: string;
  friday: string;
  created: number;
  firstReminders: number;
  secondReminders: number;
  alreadySent: number;
  skippedBooked: number;
  needsPerson: number; // call list entries for patients looked at this run
};

export type RunOutcome = { ok: true; summary: RunSummary } | { ok: false; reason: "wording_not_approved" };

export function runWeek(
  state: AppState,
  monday: string,
  opts: { now?: Date; runAt?: number } = {},
): RunOutcome {
  const now = opts.now ?? new Date();
  // The wording gate: no reminder is built from wording that has not been approved.
  if (!isApproved(state.reminderApproval, wordingHash())) return { ok: false, reason: "wording_not_approved" };

  const { patients } = effectiveData(state);
  const week = decideWeek(patients, monday);
  const runId = newId("R");
  const records: RunRecord[] = [];
  const record = (patientId: string, status: RunRecord["status"], reason: string | null) =>
    records.push({ runId, week: monday, patientId, status, reason, at: now.toISOString() });
  const call = (patientId: string, reason: CallReason) => {
    addCall(state, { patientId, reason, week: monday }, now);
    record(patientId, "needs_person", reason);
  };

  // All checks and saves for the messages happen in one step, so a double press adds nothing.
  const sent = state.messages.update((existing) => {
    const saved: Message[] = [];
    const byId = new Map(patients.map((p) => [p.id, p]));
    const pending: { patientId: string; text: string; number: 1 | 2; dueDate: string }[] = [];

    for (const d of week.decisions) {
      const p = byId.get(d.patientId)!;
      if (!isBraces(p)) continue; // already filtered by the decision, kept as a safety net (B1)
      if (d.status === "skipped_booked") {
        record(p.id, "skipped_booked", null);
        continue;
      }
      if (d.status === "needs_person") {
        if (d.reason === "no_phone") {
          call(p.id, "no_phone");
        } else {
          // Third week: only "two reminders" if two were really saved.
          const count = existing.filter((m) => m.kind === "reminder" && m.patientId === p.id && m.visitDueDate === p.dueDate).length;
          call(p.id, count >= 2 ? "no_booking_after_two_reminders" : "missed_reminders");
        }
        continue;
      }
      // to_send: skip if this week's reminder is already saved (B3).
      if (existing.some((m) => m.kind === "reminder" && m.patientId === p.id && m.week === monday)) {
        record(p.id, "already_sent", null);
        continue;
      }
      const count = existing.filter((m) => m.kind === "reminder" && m.patientId === p.id && m.visitDueDate === p.dueDate).length;
      const number = count + 1;
      if (number > 2) {
        call(p.id, "no_booking_after_two_reminders"); // B3, B6: never a third
        continue;
      }
      const built = buildReminder({ firstName: p.firstName, reminderNumber: number as 1 | 2, visitDate: week.friday }, state.reminderApproval);
      if (!built.ok) {
        call(p.id, "reminder_failed_checks");
        continue;
      }
      pending.push({ patientId: p.id, text: built.text, number: number as 1 | 2, dueDate: p.dueDate });
    }

    pending.sort((a, b) => a.patientId.localeCompare(b.patientId));
    const times = sendTimes(monday, pending.length, opts.runAt ?? DEFAULT_RUN_AT);
    pending.forEach((r, i) => {
      saved.push({
        id: newId("M"),
        patientId: r.patientId,
        direction: "out",
        kind: "reminder",
        text: r.text,
        week: monday,
        reminderNumber: r.number,
        visitDate: week.friday,
        visitDueDate: r.dueDate,
        sendAt: times[i],
      });
      record(r.patientId, "sent", `reminder ${r.number}`);
    });
    return { items: [...existing, ...saved], result: saved };
  });

  state.runs.update((items) => ({ items: [...items, ...records], result: null }));

  return {
    ok: true,
    summary: {
      runId,
      monday,
      friday: week.friday,
      created: sent.length,
      firstReminders: sent.filter((m) => m.reminderNumber === 1).length,
      secondReminders: sent.filter((m) => m.reminderNumber === 2).length,
      alreadySent: records.filter((r) => r.status === "already_sent").length,
      skippedBooked: records.filter((r) => r.status === "skipped_booked").length,
      needsPerson: records.filter((r) => r.status === "needs_person").length,
    },
  };
}
