import { redirect } from "next/navigation";
import { connection } from "next/server";
import { bookSlot } from "@/lib/booking";
import { formatDateEn } from "@/lib/wording";
import { effectiveData, fileState } from "@/lib/state";
import { Nav } from "../nav";

async function bookAction(formData: FormData) {
  "use server";
  const patientId = String(formData.get("patient") ?? "");
  const slotId = String(formData.get("slot") ?? "");
  const state = fileState();
  if (!state) redirect("/book?result=nodata");
  const out = bookSlot(state, patientId, slotId);
  if (!out.ok) redirect(`/book?result=${out.error}`);
  redirect(`/book?result=${out.confirmation === "sent" ? "booked" : "booked_no_confirmation"}&patient=${patientId}`);
}

const MESSAGES: Record<string, { text: string; good: boolean }> = {
  booked: { text: "Booked. The patient has been sent a confirmation (see the Phone screen).", good: true },
  booked_no_confirmation: {
    text: "Booked, but the confirmation was NOT sent because the replies wording is not approved yet. The patient is on the call list so a person can tell them.",
    good: false,
  },
  slot_taken: { text: "That time is already taken. Nothing was booked and nothing was sent. Please pick another time.", good: false },
  already_booked: { text: "That patient already has a booking. Nothing was changed.", good: false },
  not_braces: { text: "Only braces patients can be booked here.", good: false },
  unknown_patient: { text: "That patient was not found.", good: false },
  unknown_slot: { text: "That time was not found.", good: false },
  nodata: { text: "No patients yet. Run npm run seed first.", good: false },
};

export default async function BookPage(props: PageProps<"/book">) {
  await connection();
  const params = await props.searchParams;
  const result = Array.isArray(params.result) ? params.result[0] : params.result;
  const state = fileState();
  const eff = state ? effectiveData(state) : null;
  const message = result ? MESSAGES[result] : undefined;

  const patients = (eff?.patients ?? []).filter((p) => p.treatment === "braces" && p.bookedSlotId === null);
  const free = (eff?.slots ?? []).filter((s) => s.takenBy === null);

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Nav />
      <h1 className="text-2xl font-semibold">Book a braces visit</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Pick a patient and a free time. The patient is sent a confirmation straight away. A time that is already taken is refused.
      </p>

      {message ? (
        <p className={`mt-4 rounded border p-3 ${message.good ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`} role="status" data-testid="book-result">
          {message.text}
        </p>
      ) : null}

      {!eff ? null : (
        <form action={bookAction} className="mt-6 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            Patient
            <select name="patient" required className="mt-1 block rounded border border-neutral-300 px-2 py-1" data-testid="book-patient">
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.id} {p.firstName} (due {p.dueDate})</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Free time
            <select name="slot" required className="mt-1 block rounded border border-neutral-300 px-2 py-1" data-testid="book-slot">
              {free.map((s) => (
                <option key={s.id} value={s.id}>{formatDateEn(s.date)} at {s.time}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">Book</button>
        </form>
      )}
    </main>
  );
}
