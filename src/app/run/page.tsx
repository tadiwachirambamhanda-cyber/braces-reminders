import Link from "next/link";
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
  skipped_booked: "skipped (booked)",
  needs_person: "needs a person",
};

// One name per outcome after a run too (the stored values stay as they are).
const RESULT_LABEL: Record<string, string> = {
  sent: "sent",
  skipped_booked: "skipped (booked)",
  needs_person: "needs a person",
  already_sent: "already sent",
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
    <>
      <Nav />
      <main className="page">
        <h1 className="page-title">Run this week</h1>
        <p className="page-lead">
          Pick the Monday. &quot;Run this week&quot; creates the reminders in the phone simulator, each with a planned send time between 17:00 and 22:00.
          &quot;Preview&quot; only shows who would get one.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <form action={runAction} className="flex flex-wrap items-end gap-4">
            <WeekSelect value={week} />
            <button type="submit" className="btn-primary">Run this week</button>
          </form>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <WeekSelect value={week} />
            <button type="submit" className="btn-quiet">Preview</button>
          </form>
        </div>

        {error === "wording" ? (
          <p className="strip strip-clay mt-5" role="alert">
            Nothing was created. The reminder wording has not been approved yet. Approve it on the <Link href="/wording" className="underline">Wording page</Link> first.
          </p>
        ) : null}

        {!state ? (
          <p className="mt-6">No patients yet. Run <code className="font-mono">npm run seed</code> first.</p>
        ) : week === undefined ? (
          <p className="mt-6 text-soft">Choose a Monday, then Preview or Run this week.</p>
        ) : !isMonday(week) ? (
          <p className="strip strip-clay mt-6" role="alert">Please pick a Monday. {week} is not one.</p>
        ) : runId ? (
          <RunResult state={state} week={week} runId={runId} />
        ) : (
          <Preview state={state} week={week} />
        )}
      </main>
    </>
  );
}

function WeekSelect({ value }: { value: string | undefined }) {
  return (
    <label className="field-label">
      Week starting Monday
      <select name="week" defaultValue={value ?? MONDAYS[0]} className="field min-w-[180px]">
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
    <section className="mt-8 border-t border-ink pt-5">
      <h2 className="text-[22px]">Preview: week of {r.monday}, braces visits on Friday {r.friday}</h2>
      <Counts
        toSend={r.counts.toSend}
        detail={`${r.counts.firstReminders} first, ${r.counts.secondReminders} second`}
        skipped={r.counts.skippedBooked}
        needs={r.counts.needsPerson}
        other={r.counts.ignored}
        otherLabel="not this week"
      />
      <div className="ledger mt-4" role="table">
        <div role="row" className="ledger-head grid grid-cols-[60px_120px_130px_190px_1fr_120px]">
          <span role="columnheader">ID</span><span role="columnheader">First name</span><span role="columnheader">Visit due</span><span role="columnheader">Result</span><span role="columnheader">Why</span><span role="columnheader">Planned send time</span>
        </div>
        {rows.map((d) => {
          const i = sendRows.indexOf(d);
          return (
            <div role="row" key={d.patientId} className="ledger-row grid grid-cols-[60px_120px_130px_190px_1fr_120px]" data-testid="decision-row">
              <span role="cell" className="cell-soft" data-label="ID">{d.patientId}</span>
              <span role="cell" className="cell-name" data-label="First name">{d.firstName}</span>
              <span role="cell" data-label="Visit due">{d.dueDate}</span>
              <span role="cell" className={`status ${d.status === "to_send" ? "status-ok" : d.status === "needs_person" ? "status-clay" : ""}`} data-label="Result">{STATUS_LABEL[d.status]}</span>
              <span role="cell" className="cell-soft" data-label="Why">{reasonText(d)}</span>
              <span role="cell" className="num" data-label="Planned send time" data-testid="planned-time">{i >= 0 ? timeOfDay(planned[i]) : ""}</span>
            </div>
          );
        })}
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
    <section className="mt-8 border-t border-ink pt-5">
      <h2 className="text-[22px]">Run done: week of {week}</h2>
      <Counts
        toSend={created.length}
        detail={`${created.filter((r) => r.reason === "reminder 1").length} first, ${created.filter((r) => r.reason === "reminder 2").length} second`}
        skipped={count("skipped_booked")}
        needs={count("needs_person")}
        other={count("already_sent")}
        otherLabel="already sent earlier"
        toSendLabel="reminders created"
      />
      <div className="ledger mt-4" role="table">
        <div role="row" className="ledger-head grid grid-cols-[60px_120px_190px_1fr_120px]">
          <span role="columnheader">ID</span><span role="columnheader">First name</span><span role="columnheader">Result</span><span role="columnheader">Why</span><span role="columnheader">Planned send time</span>
        </div>
        {records.map((r) => {
          const m = messages.find((x) => x.patientId === r.patientId);
          return (
            <div role="row" key={r.patientId} className="ledger-row grid grid-cols-[60px_120px_190px_1fr_120px]" data-testid="decision-row">
              <span role="cell" className="cell-soft" data-label="ID">{r.patientId}</span>
              <span role="cell" className="cell-name" data-label="First name">{names.get(r.patientId)}</span>
              <span role="cell" className={`status ${r.status === "sent" ? "status-ok" : r.status === "needs_person" ? "status-clay" : ""}`} data-label="Result">{RESULT_LABEL[r.status] ?? r.status.replace("_", " ")}</span>
              <span role="cell" className="cell-soft" data-label="Why">{r.reason && r.status === "needs_person" ? REASON_TEXT[r.reason as CallReason] : (r.reason ?? "")}</span>
              <span role="cell" className="num" data-label="Planned send time" data-testid="planned-time">{r.status === "sent" && m ? timeOfDay(m.sendAt) : ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Counts(props: { toSend: number; detail: string; skipped: number; needs: number; other: number; otherLabel: string; toSendLabel?: string }) {
  return (
    <ul className="mt-3 flex flex-wrap items-baseline gap-x-10 gap-y-3" data-testid="counts">
      <li className="flex items-baseline gap-3">
        <span className="font-serif text-[64px] leading-none text-green" data-testid="count-to-send">{props.toSend}</span>
        <span className="text-lg">
          {props.toSendLabel ?? "to send"}
          <span className="block text-sm text-soft">{props.detail}</span>
        </span>
      </li>
      <li className="flex items-baseline gap-2">
        <span className="font-serif text-[28px]" data-testid="count-skipped">{props.skipped}</span>
        <span className="text-soft">skipped (booked)</span>
      </li>
      <li className="flex items-baseline gap-2">
        <span className="font-serif text-[28px]" data-testid="count-needs-person">{props.needs}</span>
        <span className="text-soft">needs a person</span>
      </li>
      <li className="flex items-baseline gap-2">
        <span className="font-serif text-[28px]" data-testid="count-ignored">{props.other}</span>
        <span className="text-soft">{props.otherLabel}</span>
      </li>
    </ul>
  );
}
