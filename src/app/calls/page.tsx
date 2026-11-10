import Link from "next/link";
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

  const urgent = open.filter((c) => c.reason === "urgent_message");
  const COLS = "grid-cols-[150px_170px_1fr_110px]";

  return (
    <>
      <Nav />
      <main className="page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Call list</h1>
            <p className="page-lead">Patients a person needs to call or answer. Nothing more is sent to them automatically.</p>
          </div>
          <Link href="/book" className="btn-primary">Book a visit</Link>
        </div>
        {urgent.length > 0 ? (
          <p className="strip strip-clay mt-5" data-testid="urgent-strip">
            {urgent.length} urgent {urgent.length === 1 ? "patient" : "patients"}: call {names.get(urgent[0].patientId)} first.
          </p>
        ) : null}
        <p className="mt-6 flex items-baseline gap-3" data-testid="calls-count">
          <span className="font-serif text-[32px]">{open.length}</span> <span className="text-soft">to call</span>
        </p>
        {open.length === 0 ? (
          <p className="mt-4">Nobody is on the call list.</p>
        ) : (
          <div className="ledger mt-3">
            <div className={`ledger-head grid ${COLS}`}>
              <span>Status</span><span>Patient</span><span>Why</span><span>Week</span>
            </div>
            {open.map((c) => {
              const isUrgent = c.reason === "urgent_message";
              return (
                <div key={c.id} className={`ledger-row grid ${COLS} ${isUrgent ? "urgent" : ""}`} data-testid="call-row">
                  <span className={`status ${isUrgent ? "status-clay" : ""}`} data-label="Status">{isUrgent ? "URGENT" : "Needs a person"}</span>
                  <span className="cell-name" data-label="Patient">
                    {names.get(c.patientId)} <span className="font-sans text-[13px] text-soft">{c.patientId}</span>
                  </span>
                  <span data-testid="call-reason" data-label="Why">{REASON_TEXT[c.reason]}</span>
                  <span className="cell-soft" data-label="Week">{c.week ?? ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
