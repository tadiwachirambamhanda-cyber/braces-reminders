// The approval record: a person approves the wording once, and the code checks it every time.
// The store is passed in, so tests use a temporary store and the real gate is never switched off.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

export const ApprovalRecordSchema = z.object({
  approvedBy: z.string().min(1),
  approvedAt: z.string().min(1),
  hash: z.string().min(1),
});

export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

export interface ApprovalStore {
  read(): ApprovalRecord | null; // null when nothing is approved yet
  write(record: ApprovalRecord): void; // throws if it cannot be saved
}

export class ApprovalError extends Error {}

export function memoryStore(initial: ApprovalRecord | null = null): ApprovalStore {
  let record = initial;
  return {
    read: () => record,
    write: (r) => {
      record = r;
    },
  };
}

// A missing, unreadable or damaged file counts as "not approved".
export function fileStore(path: string): ApprovalStore {
  return {
    read() {
      try {
        return ApprovalRecordSchema.parse(JSON.parse(readFileSync(path, "utf8")));
      } catch {
        return null;
      }
    },
    write(record) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
    },
  };
}

export function isApproved(store: ApprovalStore, hash: string): boolean {
  return store.read()?.hash === hash;
}

export function approve(store: ApprovalStore, approvedBy: string, hash: string, now: Date = new Date()): ApprovalRecord {
  const name = approvedBy.replace(/\s+/g, " ").trim();
  if (name === "") throw new ApprovalError("A name is needed to approve the wording");
  const record = { approvedBy: name, approvedAt: now.toISOString(), hash };
  store.write(record);
  return record;
}
