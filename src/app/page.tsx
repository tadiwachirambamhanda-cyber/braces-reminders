import Link from "next/link";
import { connection } from "next/server";
import { Nav } from "./nav";
import { loadData } from "@/lib/load-data";
import { isBraces } from "@/lib/patients";
import { freeTimes, slotsForDate } from "@/lib/calendar";
import { FRIDAYS } from "@/lib/seed-data";

export default async function PatientsPage() {
  await connection(); // read the data files on every visit, not once at build time
  const data = loadData();

  if (!data) {
    return (
      <>
        <Nav />
        <main className="page">
          <h1 className="page-title">Smile Book</h1>
          <p className="mt-4">No patients yet. Run <code className="font-mono">npm run seed</code> in the terminal, then refresh this page.</p>
        </main>
      </>
    );
  }

  const { patients, slots } = data;
  const bracesCount = patients.filter(isBraces).length;
  const COLS = "grid-cols-[60px_120px_170px_120px_1fr]";

  return (
    <>
      <Nav />
      <main className="page page-wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Smile Book</h1>
            <p className="page-lead">Liwan Dental. All patients below are made up.</p>
          </div>
          <Link href="/run" className="btn-primary">Run this week</Link>
        </div>

        <div className="mt-8 flex flex-wrap items-start gap-x-12 gap-y-10">
          <div className="min-w-0 flex-[1_1_560px]">
            <h2 className="text-[26px]">Patients</h2>
            <p className="mt-1 text-soft" data-testid="patient-count">
              {patients.length} patients, {bracesCount} braces
            </p>
            <div className="ledger mt-3" role="table">
              <div role="row" className={`ledger-head grid ${COLS}`}>
                <span role="columnheader">ID</span><span role="columnheader">First name</span><span role="columnheader">Phone</span><span role="columnheader">Treatment</span><span role="columnheader">Booking</span>
              </div>
              {patients.map((p) => (
                <div role="row" key={p.id} className={`ledger-row grid ${COLS}`} data-testid="patient-row">
                  <span role="cell" className="cell-soft num" data-label="ID">{p.id}</span>
                  <span role="cell" className="cell-name" data-label="First name">{p.firstName}</span>
                  <span role="cell" className={p.phone ? "num" : "status-clay"} data-label="Phone">{p.phone || "missing"}</span>
                  <span role="cell" className={isBraces(p) ? "status status-ok" : "cell-soft"} data-label="Treatment">{isBraces(p) ? "braces" : p.treatment}</span>
                  <span role="cell" className={p.bookedSlotId ? "" : "cell-soft"} data-label="Booking">{p.bookedSlotId ? p.bookedSlotId.replace("T", " ") : "none"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-[260px] flex-[0_1_320px] max-sm:order-first max-sm:flex-[1_1_100%]">
            <h2 className="text-[26px]">Braces calendar</h2>
            <p className="mb-3 mt-1 text-[15px] text-soft">Fridays, 17:00 to 22:00, 20-minute slots.</p>
            <ul className="border-t border-ink">
              {FRIDAYS.map((date) => {
                const all = slotsForDate(slots, date);
                const free = freeTimes(slots, date);
                return (
                  <li key={date} className="border-b border-rule py-3" data-testid="calendar-day">
                    <p className="font-semibold">
                      {date}: {all.length} slots, {free.length} free
                    </p>
                    <p className="num mt-1 text-sm text-soft">{free.join("  ")}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
