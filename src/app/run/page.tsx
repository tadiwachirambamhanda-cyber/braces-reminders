import Link from "next/link";
import { connection } from "next/server";
import { loadData } from "@/lib/load-data";
import { isMonday } from "@/lib/dates";
import { decideWeek, type Decision } from "@/lib/run-week";

const MONDAYS = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"];

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
  await connection(); // read the data files on every visit
  const params = await props.searchParams;
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week;
  const data = loadData();

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <p className="text-sm">
        <Link href="/" className="underline">Patients</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Run this week</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Shows who would get a braces reminder. Nothing is sent or saved yet.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Week starting Monday
          <select name="week" defaultValue={weekParam ?? MONDAYS[0]} className="mt-1 block rounded border border-neutral-300 px-2 py-1">
            {MONDAYS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">Run this week</button>
      </form>

      {!data ? (
        <p className="mt-6">No patients yet. Run <code className="font-mono">npm run seed</code> first.</p>
      ) : weekParam === undefined ? null : !isMonday(weekParam) ? (
        <p className="mt-6" role="alert">Please pick a Monday. {weekParam} is not one.</p>
      ) : (
        <Result patients={data.patients} week={weekParam} />
      )}
    </main>
  );
}

function Result({ patients, week }: { patients: NonNullable<ReturnType<typeof loadData>>["patients"]; week: string }) {
  const r = decideWeek(patients, week);
  const rank = { to_send: 0, needs_person: 1, skipped_booked: 2 } as const;
  const rows = [...r.decisions].sort((a, b) => rank[a.status] - rank[b.status] || a.patientId.localeCompare(b.patientId));

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">
        Week of {r.monday}, braces visits on Friday {r.friday}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="counts">
        <li className="rounded border border-neutral-300 p-3">
          <span className="block text-2xl font-semibold" data-testid="count-to-send">{r.counts.toSend}</span>
          to send
          <span className="block text-xs text-neutral-600">
            {r.counts.firstReminders} first, {r.counts.secondReminders} second
          </span>
        </li>
        <li className="rounded border border-neutral-300 p-3">
          <span className="block text-2xl font-semibold" data-testid="count-skipped">{r.counts.skippedBooked}</span>
          skipped (booked)
        </li>
        <li className="rounded border border-neutral-300 p-3">
          <span className="block text-2xl font-semibold" data-testid="count-needs-person">{r.counts.needsPerson}</span>
          need a person
        </li>
        <li className="rounded border border-neutral-300 p-3">
          <span className="block text-2xl font-semibold" data-testid="count-ignored">{r.counts.ignored}</span>
          not this week
        </li>
      </ul>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">First name</th>
              <th className="py-2 pr-4">Visit due</th>
              <th className="py-2 pr-4">Result</th>
              <th className="py-2 pr-4">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.patientId} className="border-b border-neutral-200" data-testid="decision-row">
                <td className="py-2 pr-4 font-mono">{d.patientId}</td>
                <td className="py-2 pr-4">{d.firstName}</td>
                <td className="py-2 pr-4">{d.dueDate}</td>
                <td className="py-2 pr-4">{STATUS_LABEL[d.status]}</td>
                <td className="py-2 pr-4">{reasonText(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
