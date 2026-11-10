import { join } from "node:path";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ApprovalError, approve, fileStore, isApproved } from "@/lib/approval";
import { OPENING_CHECKS, OPENING_PROMPT } from "@/lib/opening-rules";
import { REPLY_TEMPLATES, repliesWordingHash } from "@/lib/replies-wording";
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
    <section className="mt-4 rounded border border-neutral-300 p-4" data-testid={`approval-status-${set}`}>
      {approved && record ? (
        <p>
          <strong>Approved</strong> by {record.approvedBy} on {record.approvedAt.slice(0, 16).replace("T", " ")} UTC.
        </p>
      ) : record ? (
        <p><strong>Not approved.</strong> The wording has changed since it was last approved, so it needs approving again.</p>
      ) : (
        <p><strong>Not approved yet.</strong> Nothing can be built from this wording until it is approved.</p>
      )}
    </section>
  );
}

function ApproveForm({ set, error, errorSet }: { set: keyof typeof FILES; error: string | undefined; errorSet: string | undefined }) {
  return (
    <>
      <form action={approveAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="set" value={set} />
        <label className="text-sm">
          Your name
          <input name="name" required className="mt-1 block rounded border border-neutral-300 px-2 py-1" autoComplete="off" data-testid={`name-${set}`} />
        </label>
        <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white" data-testid={`approve-${set}`}>Approve this wording</button>
      </form>
      {errorSet === set && error === "name" ? <p className="mt-3 text-red-700" role="alert">Please type your name to approve.</p> : null}
      {errorSet === set && error === "save" ? (
        <p className="mt-3 text-red-700" role="alert">The approval could not be saved here (the folder may be read-only). Nothing was approved.</p>
      ) : null}
    </>
  );
}

function Box({ lang, children, testId }: { lang: "en" | "ar"; children: string; testId?: string }) {
  return (
    <p className="mt-2 whitespace-pre-wrap rounded bg-neutral-100 p-3 text-sm" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} data-testid={testId}>
      {children}
    </p>
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

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Nav />
      <h1 className="text-2xl font-semibold">Wording</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Read the wording below (a sample name, date and time are shown) and approve each set once. If a set is ever changed, it needs approving again.
        Someone who reads Arabic should check the Arabic before it is approved.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. Reminders</h2>
      <Status set="reminders" hash={wordingHash()} />
      {([1, 2] as ReminderNumber[]).map((n) => (
        <section key={n} className="mt-6">
          <h3 className="text-lg font-semibold">{n === 1 ? "First reminder" : "Second reminder"}</h3>
          <Box lang="en" testId={`wording-${n}-en`}>{renderTemplate(n, "en", SAMPLE_NAME, SAMPLE_DATE)}</Box>
          <Box lang="ar" testId={`wording-${n}-ar`}>{renderTemplate(n, "ar", SAMPLE_NAME, SAMPLE_DATE)}</Box>
        </section>
      ))}
      <ApproveForm set="reminders" error={error} errorSet={errorSet} />

      <h2 className="mt-12 text-xl font-semibold">2. Confirmation and replies</h2>
      <Status set="replies" hash={repliesWordingHash()} />
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Booking confirmation (sent when the receptionist books)</h3>
        <Box lang="en">{fill(REPLY_TEMPLATES.confirmation.en, v)}</Box>
        <Box lang="ar">{fill(REPLY_TEMPLATES.confirmation.ar, vAr)}</Box>
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Reply to &quot;What times are available?&quot; (no slot times are listed)</h3>
        <Box lang="en">{fill(REPLY_TEMPLATES.windowReply.en, v)}</Box>
        <Box lang="ar">{fill(REPLY_TEMPLATES.windowReply.ar, vAr)}</Box>
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Reply when a patient names a time or wants to book (the receptionist books it)</h3>
        <Box lang="en">{fill(REPLY_TEMPLATES.bookingRequest.en, v)}</Box>
        <Box lang="ar">{fill(REPLY_TEMPLATES.bookingRequest.ar, vAr)}</Box>
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Reply to anything else (the patient goes on the call list)</h3>
        <Box lang="en">{fill(REPLY_TEMPLATES.holding.en, v)}</Box>
        <Box lang="ar">{fill(REPLY_TEMPLATES.holding.ar, vAr)}</Box>
      </section>
      <section className="mt-6" data-testid="opening-rules">
        <h3 className="text-lg font-semibold">The AI warm sentence (only when AI is switched on)</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Claude may add one short, warm sentence after the first line of a reply. Code throws it away and uses the fixed wording above
          if it breaks any of these rules. Approving this page approves these rules and the instructions below. Changing either needs a new approval.
        </p>
        <ul className="mt-2 list-disc pl-6 text-sm">
          {OPENING_CHECKS.map((c) => (
            <li key={c.name}>{c.description}</li>
          ))}
        </ul>
        <p className="mt-2 rounded bg-neutral-100 p-3 text-xs">{OPENING_PROMPT}</p>
      </section>
      <ApproveForm set="replies" error={error} errorSet={errorSet} />
    </main>
  );
}
