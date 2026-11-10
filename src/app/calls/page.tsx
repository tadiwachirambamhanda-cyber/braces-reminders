import { connection } from "next/server";
import { fileState, REASON_TEXT } from "@/lib/state";
import { Nav } from "../nav";

export default async function CallsPage() {
  await connection();
  const state = fileState();
  const names = new Map(state?.seed.patients.map((p) => [p.id, p.firstName]) ?? []);
  const open = (state?.calls.read() ?? [])
    .filter((c) => c.open)
    .sort((a, b) => Number(b.reason === "urgent_message") - Number(a.reason === "urgent_message")); // urgent first

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Nav />
      <h1 className="text-2xl font-semibold">Call list</h1>
      <p className="mt-1 text-sm text-neutral-600">Patients a person needs to call or reply to. Nothing more is sent to them automatically.</p>
      <p className="mt-3" data-testid="calls-count">{open.length} to call</p>
      {open.length === 0 ? (
        <p className="mt-4">Nobody is on the call list.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">First name</th>
                <th className="py-2 pr-4">Why</th>
                <th className="py-2 pr-4">Week</th>
              </tr>
            </thead>
            <tbody>
              {open.map((c) => (
                <tr key={c.id} className="border-b border-neutral-200" data-testid="call-row">
                  <td className="py-2 pr-4 font-mono">{c.patientId}</td>
                  <td className="py-2 pr-4">{names.get(c.patientId)}</td>
                  <td className="py-2 pr-4" data-testid="call-reason">{REASON_TEXT[c.reason]}</td>
                  <td className="py-2 pr-4">{c.week ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
