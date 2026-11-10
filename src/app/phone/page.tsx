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

const ARABIC = /[؀-ۿ]/;

// A message may hold English and Arabic paragraphs. Arabic goes in its own right-to-left block.
function MessageBody({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) =>
        ARABIC.test(para) ? (
          <div key={i} dir="rtl" lang="ar" className={`text-right ${i > 0 ? "mt-2 border-t border-black/10 pt-2" : ""}`}>
            {para}
          </div>
        ) : (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed ${i > 0 ? "mt-2" : ""}`}>
            {para}
          </div>
        ),
      )}
    </>
  );
}

export default async function PhonePage(props: PageProps<"/phone">) {
  await connection();
  const params = await props.searchParams;
  const state = fileState();
  const requested = Array.isArray(params.patient) ? params.patient[0] : params.patient;

  if (!state) {
    return (
      <>
        <Nav />
        <main className="page">
          <p>No patients yet. Run <code className="font-mono">npm run seed</code> first.</p>
        </main>
      </>
    );
  }

  const messages = state.messages.read();
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.patientId, (counts.get(m.patientId) ?? 0) + 1);
  const patients = state.seed.patients.filter((p) => p.treatment === "braces");
  const selected = state.seed.patients.find((p) => p.id === requested) ?? patients.find((p) => counts.has(p.id)) ?? patients[0];
  const chat = messages.filter((m) => m.patientId === selected.id).sort((a, b) => a.sendAt.localeCompare(b.sendAt));

  return (
    <>
      <Nav />
      <main className="page">
        <h1 className="page-title">Phone simulator</h1>
        <p className="page-lead">What each patient sees on WhatsApp. Times are the planned send times.</p>
        <div className="mt-7 flex flex-wrap items-start gap-8">
          <ul className="max-h-44 flex-[1_1_100%] sm:max-h-[32rem] overflow-y-auto border-t border-ink sm:flex-[0_0_200px]" data-testid="patient-list">
            {patients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/phone?patient=${p.id}`}
                  className="flex min-h-11 items-center justify-between border-b border-rule px-2.5 text-ink no-underline"
                  style={p.id === selected.id ? { background: "var(--chat-ground)", fontWeight: 600 } : undefined}
                >
                  <span>
                    <span className="font-serif text-lg">{p.firstName}</span>{" "}
                    <span className="text-[13px] font-normal text-soft">{p.id}</span>
                  </span>
                  <span className="font-normal text-soft">{counts.get(p.id) ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="phone-frame" data-testid="chat">
            <header className="phone-header">
              <span className="phone-avatar" aria-hidden="true">{selected.firstName.slice(0, 1)}</span>
              <div>
                <h2 className="phone-name">{selected.firstName}</h2>
                <p className="phone-status">{selected.id}, online</p>
              </div>
            </header>
            <div className="phone-chat">
              {chat.length === 0 ? <p className="text-sm text-soft">No messages yet.</p> : null}
              <ul className="flex flex-col gap-1.5">
                {chat.map((m) => {
                  const out = m.direction === "out";
                  return (
                    <li key={m.id} className={`max-w-[88%] ${out ? "self-start" : "mt-2.5 self-end"}`} data-testid={`msg-${m.kind}`}>
                      <div
                        className="px-3.5 py-2.5"
                        style={{
                          background: out ? "var(--bubble-out)" : "var(--bubble-in)",
                          borderRadius: out ? "10px 10px 10px 2px" : "10px 10px 2px 10px",
                        }}
                      >
                        <MessageBody text={m.text} />
                        <p className="mt-1 text-right text-xs" style={{ color: out ? "var(--bubble-time)" : "var(--soft)" }}>
                          {out ? `Liwan Dental, planned ${label(m.sendAt)}` : `${selected.firstName}, ${label(m.sendAt)}`}
                        </p>
                      </div>
                      {m.ai ? (
                        <p className="mx-0.5 mt-1 font-mono text-xs leading-normal text-soft" data-testid="ai-line">
                          Read by: {m.ai.engine}
                          {m.ai.intent ? ` (${m.ai.intent}, confidence ${m.ai.confidence === null ? "n/a" : m.ai.confidence.toFixed(2)})` : ""}, {m.ai.ms} ms
                          {m.ai.costUsd !== null ? `, $${m.ai.costUsd.toFixed(5)}` : ""}. Warm sentence:{" "}
                          {m.ai.opening === "ai" ? "written by AI, passed the checks" : `fixed wording${m.ai.openingNote ? ` (${m.ai.openingNote})` : ""}`}.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <form action={sendAction} className="phone-bar" data-testid="send-form">
              <input type="hidden" name="patient" value={selected.id} />
              <input
                name="text"
                dir="auto"
                aria-label={`Type a message as ${selected.firstName}`}
                placeholder={`Type a message as ${selected.firstName}`}
                className="phone-input"
                autoComplete="off"
                data-testid="send-text"
              />
              <button type="submit" className="phone-send">Send</button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
