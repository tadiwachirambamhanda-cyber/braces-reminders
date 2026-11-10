import { join } from "node:path";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ApprovalError, approve, fileStore, isApproved } from "@/lib/approval";
import { OPENING_CHECKS, OPENING_PROMPT } from "@/lib/opening-rules";
import { BRACES_PRICE_AED, REPLY_TEMPLATES, repliesWordingHash } from "@/lib/replies-wording";
import { renderTemplate, wordingHash, type ReminderNumber } from "@/lib/wording";
import { Nav } from "../nav";

const FILES = {
  reminders: join(process.cwd(), "data", "wording-approval.json"),
  replies: join(process.cwd(), "data", "replies-approval.json"),
};
const SAMPLE_NAME = "Sara";
const SAMPLE_DATE = "2026-11-06";

async function approveAction(formData: FormData) {
  "use server";
  const set = formData.get("set") === "replies" ? "replies" : "reminders";
  const name = String(formData.get("name") ?? "");
  try {
    approve(fileStore(FILES[set]), name, set === "replies" ? repliesWordingHash() : wordingHash());
  } catch (error) {
    redirect(`/wording?error=${error instanceof ApprovalError ? "name" : "save"}&set=${set}`);
  }
  redirect("/wording");
}

function Status({ set, hash }: { set: keyof typeof FILES; hash: string }) {
  const store = fileStore(FILES[set]);
  const record = store.read();
  const approved = isApproved(store, hash);
  return (
    <p className={`status ${approved && record ? "status-ok" : "status-clay"}`} data-testid={`approval-status-${set}`}>
      {approved && record ? (
        <span>
          <strong>Approved</strong> by {record.approvedBy} on {record.approvedAt.slice(0, 16).replace("T", " ")} UTC.
        </span>
      ) : record ? (
        <span><strong>Not approved.</strong> The wording has changed since it was last approved, so it needs approving again.</span>
      ) : (
        <span><strong>Not approved yet.</strong> Nothing can be built from this wording until it is approved.</span>
      )}
    </p>
  );
}

function ApproveForm({ set, error, errorSet }: { set: keyof typeof FILES; error: string | undefined; errorSet: string | undefined }) {
  return (
    <>
      <form action={approveAction} className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-3">
        <input type="hidden" name="set" value={set} />
        <label className="field-label">
          Your name
          <input name="name" required className="field w-60" autoComplete="off" data-testid={`name-${set}`} />
        </label>
        <button type="submit" className="btn-primary" data-testid={`approve-${set}`}>Approve this wording</button>
      </form>
      {errorSet === set && error === "name" ? <p className="strip strip-clay mt-3" role="alert">Please type your name to approve.</p> : null}
      {errorSet === set && error === "save" ? (
        <p className="strip strip-clay mt-3" role="alert">The approval could not be saved here (the folder may be read-only). Nothing was approved.</p>
      ) : null}
    </>
  );
}

function SetHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-4">
      <h2 className="text-[28px]">{title}</h2>
      {children}
    </div>
  );
}

// English on the left, Arabic on the right (stacked on a phone). Arabic is its own right-to-left block.
function Pair({ label, en, ar, testId }: { label: string; en: string; ar: string; testId?: string }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 border-b border-rule py-5">
      <div className="min-w-0 flex-[1_1_320px]">
        <p className="label-caps mb-1.5">{label}</p>
        <p className="whitespace-pre-wrap leading-relaxed" data-testid={testId ? `${testId}-en` : undefined}>{en}</p>
      </div>
      <div className="min-w-0 flex-[1_1_320px]" dir="rtl" lang="ar">
        <p className="label-caps mb-1.5 text-left" dir="ltr" lang="en" style={{ fontSize: 13, lineHeight: "normal" }}>Arabic</p>
        <p className="whitespace-pre-wrap text-right" data-testid={testId ? `${testId}-ar` : undefined}>{ar}</p>
      </div>
    </div>
  );
}

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

export default async function WordingPage(props: PageProps<"/wording">) {
  await connection(); // read the approval files on every visit, never cached
  const params = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(params.error);
  const errorSet = one(params.set);
  const v = { name: SAMPLE_NAME, date: "Friday 6 November", time: "18:00", date2: "Friday 13 November" };
  const vAr = { name: SAMPLE_NAME, date: "الجمعة 6 نوفمبر", time: "18:00", date2: "الجمعة 13 نوفمبر" };
  const price = { price: String(BRACES_PRICE_AED) };

  return (
    <>
      <Nav />
      <main className="page">
        <h1 className="page-title">Wording</h1>
        <p className="page-lead">
          Read the wording below (a sample name, date and time are shown) and approve each set once. If a set is ever changed, it needs approving again.
          Someone who reads Arabic should check the Arabic before it is approved.
        </p>

        <SetHeader title="1. Reminders">
          <Status set="reminders" hash={wordingHash()} />
        </SetHeader>
        {([1, 2] as ReminderNumber[]).map((n) => (
          <Pair
            key={n}
            label={n === 1 ? "First reminder" : "Second reminder"}
            en={renderTemplate(n, "en", SAMPLE_NAME, SAMPLE_DATE)}
            ar={renderTemplate(n, "ar", SAMPLE_NAME, SAMPLE_DATE)}
            testId={`wording-${n}`}
          />
        ))}
        <ApproveForm set="reminders" error={error} errorSet={errorSet} />

        <SetHeader title="2. Confirmation and replies">
          <Status set="replies" hash={repliesWordingHash()} />
        </SetHeader>
        <Pair label="Booking confirmation (sent when the receptionist books)" en={fill(REPLY_TEMPLATES.confirmation.en, v)} ar={fill(REPLY_TEMPLATES.confirmation.ar, vAr)} />
        <Pair label={'Reply to "What times are available?" (no slot times are listed)'} en={fill(REPLY_TEMPLATES.windowReply.en, v)} ar={fill(REPLY_TEMPLATES.windowReply.ar, vAr)} />
        <Pair label="Reply when a patient names a time or wants to book (the receptionist books it)" en={fill(REPLY_TEMPLATES.bookingRequest.en, v)} ar={fill(REPLY_TEMPLATES.bookingRequest.ar, vAr)} />
        <Pair
          label={`Reply to "How much does it cost?" (braces patients only; the price is AED ${BRACES_PRICE_AED})`}
          en={fill(REPLY_TEMPLATES.priceReply.en, { ...v, ...price })}
          ar={fill(REPLY_TEMPLATES.priceReply.ar, { ...vAr, ...price })}
        />
        <Pair label="Reply to pain, bleeding or damage (the patient goes first on the call list as URGENT)" en={fill(REPLY_TEMPLATES.urgentReply.en, v)} ar={fill(REPLY_TEMPLATES.urgentReply.ar, vAr)} />
        <Pair label="Reply to anything else (the patient goes on the call list)" en={fill(REPLY_TEMPLATES.holding.en, v)} ar={fill(REPLY_TEMPLATES.holding.ar, vAr)} />

        <section className="mt-6 rounded px-6 py-5" style={{ background: "var(--tint)" }} data-testid="opening-rules">
          <h3 className="text-[22px]">The AI warm sentence (only when AI is switched on)</h3>
          <p className="mb-3 mt-1.5 max-w-[680px] leading-normal text-soft">
            Claude may add one short, warm sentence after the first line of a reply. Code throws it away and uses the fixed wording above
            if it breaks any of these rules. Approving this page approves these rules and the instructions below. Changing either needs a new approval.
          </p>
          <ol className="list-decimal pl-6 leading-loose sm:columns-2 sm:gap-10">
            {OPENING_CHECKS.map((c) => (
              <li key={c.name}>{c.description}</li>
            ))}
          </ol>
          <p className="mt-3 rounded bg-white/60 p-3 text-xs">{OPENING_PROMPT}</p>
        </section>
        <ApproveForm set="replies" error={error} errorSet={errorSet} />
      </main>
    </>
  );
}
