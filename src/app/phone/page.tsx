import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { handlePatientMessageAI } from "@/lib/replies-ai";
import { fileState } from "@/lib/state";
import { Nav } from "../nav";

async function sendAction(formData: FormData) {
  "use server";
  const patientId = String(formData.get("patient") ?? "");
  const text = String(formData.get("text") ?? "").slice(0, 500);
  const state = fileState();
  if (state && state.seed.patients.some((p) => p.id === patientId)) await handlePatientMessageAI(state, patientId, text);
  redirect(`/phone?patient=${encodeURIComponent(patientId)}`);
}

function label(sendAt: string): string {
  return `${sendAt.slice(0, 10)} ${sendAt.slice(11, 16)}`;
}

export default async function PhonePage(props: PageProps<"/phone">) {
  await connection();
  const params = await props.searchParams;
  const state = fileState();
  const requested = Array.isArray(params.patient) ? params.patient[0] : params.patient;

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <Nav />
        <p>No patients yet. Run <code className="font-mono">npm run seed</code> first.</p>
      </main>
    );
  }

  const messages = state.messages.read();
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.patientId, (counts.get(m.patientId) ?? 0) + 1);
  const patients = state.seed.patients.filter((p) => p.treatment === "braces");
  const selected = state.seed.patients.find((p) => p.id === requested) ?? patients.find((p) => counts.has(p.id)) ?? patients[0];
  const chat = messages.filter((m) => m.patientId === selected.id).sort((a, b) => a.sendAt.localeCompare(b.sendAt));

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Nav />
      <h1 className="text-2xl font-semibold">Phone simulator</h1>
      <p className="mt-1 text-sm text-neutral-600">What each patient sees on WhatsApp. Times are the planned send times.</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[14rem_1fr]">
        <ul className="max-h-[32rem] overflow-y-auto rounded border border-neutral-300 text-sm" data-testid="patient-list">
          {patients.map((p) => (
            <li key={p.id}>
              <Link
                href={`/phone?patient=${p.id}`}
                className={`flex justify-between px-3 py-2 hover:bg-neutral-100 ${p.id === selected.id ? "bg-neutral-100 font-medium" : ""}`}
              >
                <span>{p.id} {p.firstName}</span>
                <span className="text-neutral-500">{counts.get(p.id) ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="rounded border border-neutral-300 p-4" data-testid="chat">
          <h2 className="font-semibold">{selected.firstName} ({selected.id})</h2>
          {chat.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No messages yet.</p> : null}
          <ul className="mt-3 space-y-3">
            {chat.map((m) => (
              <li key={m.id} className={m.direction === "out" ? "mr-8" : "ml-8"} data-testid={`msg-${m.kind}`}>
                <div className={`whitespace-pre-wrap rounded-lg p-3 text-sm ${m.direction === "out" ? "bg-green-100" : "bg-neutral-100"}`}>{m.text}</div>
                <p className="mt-1 text-xs text-neutral-500">
                  {m.direction === "out" ? "Liwan Dental" : selected.firstName}, planned {label(m.sendAt)}
                </p>
                {m.ai ? (
                  <p className="text-xs text-neutral-500" data-testid="ai-line">
                    Read by: {m.ai.engine}
                    {m.ai.intent ? ` (${m.ai.intent}, confidence ${m.ai.confidence === null ? "n/a" : m.ai.confidence.toFixed(2)})` : ""}, {m.ai.ms} ms
                    {m.ai.costUsd !== null ? `, $${m.ai.costUsd.toFixed(5)}` : ""}. Warm sentence:{" "}
                    {m.ai.opening === "ai" ? "written by AI, passed the checks" : `fixed wording${m.ai.openingNote ? ` (${m.ai.openingNote})` : ""}`}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <form action={sendAction} className="mt-4 flex gap-2" data-testid="send-form">
            <input type="hidden" name="patient" value={selected.id} />
            <input
              name="text"
              dir="auto"
              placeholder={`Type a message as ${selected.firstName}`}
              className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
              autoComplete="off"
              data-testid="send-text"
            />
            <button type="submit" className="rounded bg-green-700 px-4 py-1 text-sm text-white">Send</button>
          </form>
        </section>
      </div>
    </main>
  );
}
