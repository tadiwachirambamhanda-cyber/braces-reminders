import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isMonday } from "@/lib/dates";
import { runWeek } from "@/lib/run";
import { decideWeek, type Decision } from "@/lib/run-week";
import { sendTimes, timeOfDay } from "@/lib/schedule";
import { effectiveData, fileState, REASON_TEXT, type CallReason } from "@/lib/state";
import { Nav } from "../nav";

const MONDAYS = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"];

async function runAction(formData: FormData) {
  "use server";
  const week = String(formData.get("week") ?? "");
  const state = fileState();
  if (!state || !isMonday(week)) redirect(`/run?week=${encodeURIComponent(week)}`);
  const out = runWeek(state, week);
  if (!out.ok) redirect(`/run?week=${week}&error=wording`);
  redirect(`/run?week=${week}&run=${out.summary.runId}`);
}

const STATUS_LABEL: Record<Decision["status"], string> = {
  to_send: "to send",
  skipped_booked: "skipped (already booked)",
  needs_person: "needs a person",
};

function reasonText(d: Decision): string {
  if (d.status === "to_send") return `reminder ${d.reminderNumber}`;
  if (d.reason === "no_phone") return "no usable phone number";
  if (d.reason === "no_booking_after_two_reminders") return "no booking after two reminders";
  return "";
}

export default async function RunPage(props: PageProps<"/run">) {
  await connection(); // read saved state on every visit
  const params = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const week = one(params.week);
  const runId = one(params.run);
  const error = one(params.error);
  const state = fileState();

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Nav />
      <h1 className="text-2xl font-semibold">Run this week</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Pick the Monday. &quot;Run this week&quot; creates the reminders in the phone simulator, each with a planned send time between 17:00 and 22:00.
        &quot;Preview&quot; only shows who would get one.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <form action={runAction} className="flex items-end gap-3">
          <WeekSelect value={week} />
          <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">Run this week</button>
        </form>
        <form method="get" className="flex items-end gap-3">
          <WeekSelect value={week} />
          <button type="submit" className="rounded border border-neutral-400 px-4 py-2">Preview</button>
        </form>
      </div>

      {error === "wording" ? (
        <p className="mt-4 text-red-700" role="alert">
          Nothing was created. The reminder wording has not been approved yet. Approve it on the Wording page first.
        </p>
      ) : null}

      {!state ? (
        <p className="mt-6">No patients yet. Run <code className="font-mono">npm run seed</code> first.</p>
      ) : week === undefined ? null : !isMonday(week) ? (
        <p className="mt-6" role="alert">Please pick a Monday. {week} is not one.</p>
      ) : runId ? (
        <RunResult state={state} week={week} runId={runId} />
      ) : (
        <Preview state={state} week={week} />
      )}
    </main>
  );
}

function WeekSelect({ value }: { value: string | undefined }) {
  return (
    <label className="text-sm">
      Week starting Monday
      <select name="week" defaultValue={value ?? MONDAYS[0]} className="mt-1 block rounded border border-neutral-300 px-2 py-1">
        {MONDAYS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </label>
  );
}

type State = NonNullable<ReturnType<typeof fileState>>;

function Preview({ state, week }: { state: State; week: string }) {
  const { patients } = effectiveData(state);
  const r = decideWeek(patients, week);
  const rank = { to_send: 0, needs_person: 1, skipped_booked: 2 } as const;
  const rows = [...r.decisions].sort((a, b) => rank[a.status] - rank[b.status] || a.patientId.localeCompare(b.patientId));
  const planned = sendTimes(week, r.counts.toSend);
  const sendRows = rows.filter((d) => d.status === "to_send");

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Preview: week of {r.monday}, braces visits on Friday {r.friday}</h2>
      <Counts
        toSend={r.counts.toSend}
        detail={`${r.counts.firstReminders} first, ${r.counts.secondReminders} second`}
        skipped={r.counts.skippedBooked}
        needs={r.counts.needsPerson}
        other={r.counts.ignored}
        otherLabel="not this week"
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">First name</th>
              <th className="py-2 pr-4">Visit due</th>
              <th className="py-2 pr-4">Result</th>
              <th className="py-2 pr-4">Why</th>
              <th className="py-2 pr-4">Planned send time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const i = sendRows.indexOf(d);
              return (
                <tr key={d.patientId} className="border-b border-neutral-200" data-testid="decision-row">
                  <td className="py-2 pr-4 font-mono">{d.patientId}</td>
                  <td className="py-2 pr-4">{d.firstName}</td>
                  <td className="py-2 pr-4">{d.dueDate}</td>
                  <td className="py-2 pr-4">{STATUS_LABEL[d.status]}</td>
                  <td className="py-2 pr-4">{reasonText(d)}</td>
                  <td className="py-2 pr-4 font-mono" data-testid="planned-time">{i >= 0 ? timeOfDay(planned[i]) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunResult({ state, week, runId }: { state: State; week: string; runId: string }) {
  const records = state.runs.read().filter((r) => r.runId === runId);
  const names = new Map(state.seed.patients.map((p) => [p.id, p.firstName]));
  const messages = state.messages.read().filter((m) => m.kind === "reminder" && m.week === week);
  const count = (s: string) => records.filter((r) => r.status === s).length;
  const created = records.filter((r) => r.status === "sent");

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Run done: week of {week}</h2>
      <Counts
        toSend={created.length}
        detail={`${created.filter((r) => r.reason === "reminder 1").length} first, ${created.filter((r) => r.reason === "reminder 2").length} second`}
        skipped={count("skipped_booked")}
        needs={count("needs_person")}
        other={count("already_sent")}
        otherLabel="already sent earlier"
        toSendLabel="reminders created"
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">First name</th>
              <th className="py-2 pr-4">Result</th>
              <th className="py-2 pr-4">Why</th>
              <th className="py-2 pr-4">Planned send time</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const m = messages.find((x) => x.patientId === r.patientId);
              return (
                <tr key={r.patientId} className="border-b border-neutral-200" data-testid="decision-row">
                  <td className="py-2 pr-4 font-mono">{r.patientId}</td>
                  <td className="py-2 pr-4">{names.get(r.patientId)}</td>
                  <td className="py-2 pr-4">{r.status.replace("_", " ")}</td>
                  <td className="py-2 pr-4">{r.reason && r.status === "needs_person" ? REASON_TEXT[r.reason as CallReason] : (r.reason ?? "")}</td>
                  <td className="py-2 pr-4 font-mono" data-testid="planned-time">{r.status === "sent" && m ? timeOfDay(m.sendAt) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Counts(props: { toSend: number; detail: string; skipped: number; needs: number; other: number; otherLabel: string; toSendLabel?: string }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="counts">
      <li className="rounded border border-neutral-300 p-3">
        <span className="block text-2xl font-semibold" data-testid="count-to-send">{props.toSend}</span>
        {props.toSendLabel ?? "to send"}
        <span className="block text-xs text-neutral-600">{props.detail}</span>
      </li>
      <li className="rounded border border-neutral-300 p-3">
        <span className="block text-2xl font-semibold" data-testid="count-skipped">{props.skipped}</span>
        skipped (booked)
      </li>
      <li className="rounded border border-neutral-300 p-3">
        <span className="block text-2xl font-semibold" data-testid="count-needs-person">{props.needs}</span>
        need a person
      </li>
      <li className="rounded border border-neutral-300 p-3">
        <span className="block text-2xl font-semibold" data-testid="count-ignored">{props.other}</span>
        {props.otherLabel}
      </li>
    </ul>
  );
}
