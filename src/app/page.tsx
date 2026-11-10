import Link from "next/link";
import { connection } from "next/server";
import { loadData } from "@/lib/load-data";
import { isBraces } from "@/lib/patients";
import { freeTimes, slotsForDate } from "@/lib/calendar";
import { FRIDAYS } from "@/lib/seed-data";

export default async function PatientsPage() {
  await connection(); // read the data files on every visit, not once at build time
  const data = loadData();

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Braces Reminders</h1>
        <p className="mt-4">No patients yet. Run <code className="font-mono">npm run seed</code> in the terminal, then refresh this page.</p>
      </main>
    );
  }

  const { patients, slots } = data;
  const bracesCount = patients.filter(isBraces).length;

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Braces Reminders</h1>
      <p className="mt-1 text-sm text-neutral-600">Liwan Dental. All patients below are made up.</p>
      <p className="mt-2 text-sm"><Link href="/run" className="underline">Run this week</Link></p>

      <h2 className="mt-6 text-lg font-semibold">Patients</h2>
      <p className="mt-1" data-testid="patient-count">
        {patients.length} patients, {bracesCount} braces
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">First name</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Treatment</th>
              <th className="py-2 pr-4">Visit due</th>
              <th className="py-2 pr-4">Booking</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-neutral-200" data-testid="patient-row">
                <td className="py-2 pr-4 font-mono">{p.id}</td>
                <td className="py-2 pr-4">{p.firstName}</td>
                <td className="py-2 pr-4 font-mono">{p.phone || "missing"}</td>
                <td className="py-2 pr-4">
                  {isBraces(p) ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">braces</span>
                  ) : (
                    p.treatment
                  )}
                </td>
                <td className="py-2 pr-4">{p.dueDate}</td>
                <td className="py-2 pr-4">{p.bookedSlotId ? p.bookedSlotId.replace("T", " ") : "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Braces calendar</h2>
      <p className="mt-1 text-sm text-neutral-600">Fridays, 17:00 to 22:00, 20-minute slots.</p>
      <ul className="mt-3 space-y-3">
        {FRIDAYS.map((date) => {
          const all = slotsForDate(slots, date);
          const free = freeTimes(slots, date);
          return (
            <li key={date} data-testid="calendar-day">
              <p className="font-medium">
                {date}: {all.length} slots, {free.length} free
              </p>
              <p className="font-mono text-sm text-neutral-700">{free.join("  ")}</p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
