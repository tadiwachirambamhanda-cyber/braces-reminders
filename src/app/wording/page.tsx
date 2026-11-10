import Link from "next/link";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ApprovalError, approve, fileStore, isApproved } from "@/lib/approval";
import { renderTemplate, wordingHash, type ReminderNumber } from "@/lib/wording";

const APPROVAL_FILE = join(process.cwd(), "data", "wording-approval.json");
const SAMPLE_NAME = "Sara";
const SAMPLE_DATE = "2026-11-06";

async function approveAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "");
  try {
    approve(fileStore(APPROVAL_FILE), name, wordingHash());
  } catch (error) {
    redirect(error instanceof ApprovalError ? "/wording?error=name" : "/wording?error=save");
  }
  redirect("/wording");
}

export default async function WordingPage(props: PageProps<"/wording">) {
  await connection(); // read the approval file on every visit, never cached
  const params = await props.searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const record = fileStore(APPROVAL_FILE).read();
  const approved = isApproved(fileStore(APPROVAL_FILE), wordingHash());

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <p className="text-sm">
        <Link href="/" className="underline">Patients</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Reminder wording</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Read the wording below (a sample name and date are shown). Once you approve it, reminders can be built from it.
        If the wording is ever changed, it needs approving again.
      </p>

      <section className="mt-4 rounded border border-neutral-300 p-4" data-testid="approval-status">
        {approved && record ? (
          <p>
            <strong>Approved</strong> by {record.approvedBy} on {record.approvedAt.slice(0, 16).replace("T", " ")} UTC.
          </p>
        ) : record ? (
          <p><strong>Not approved.</strong> The wording has changed since it was last approved, so it needs approving again.</p>
        ) : (
          <p><strong>Not approved yet.</strong> No reminders can be built until it is approved.</p>
        )}
      </section>

      {([1, 2] as ReminderNumber[]).map((n) => (
        <section key={n} className="mt-6">
          <h2 className="text-lg font-semibold">{n === 1 ? "First reminder" : "Second reminder"}</h2>
          <p className="mt-2 whitespace-pre-wrap rounded bg-neutral-100 p-3 text-sm" lang="en" data-testid={`wording-${n}-en`}>
            {renderTemplate(n, "en", SAMPLE_NAME, SAMPLE_DATE)}
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded bg-neutral-100 p-3 text-sm" lang="ar" dir="rtl" data-testid={`wording-${n}-ar`}>
            {renderTemplate(n, "ar", SAMPLE_NAME, SAMPLE_DATE)}
          </p>
        </section>
      ))}

      <form action={approveAction} className="mt-8 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Your name
          <input
            name="name"
            required
            className="mt-1 block rounded border border-neutral-300 px-2 py-1"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">Approve this wording</button>
      </form>
      {error === "name" ? <p className="mt-3 text-red-700" role="alert">Please type your name to approve.</p> : null}
      {error === "save" ? (
        <p className="mt-3 text-red-700" role="alert">The approval could not be saved here (the folder may be read-only). Nothing was approved.</p>
      ) : null}
    </main>
  );
}
