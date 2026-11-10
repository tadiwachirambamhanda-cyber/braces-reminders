import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ApprovalError, approve, fileStore, isApproved, memoryStore } from "../src/lib/approval";
import { TEMPLATES, buildReminder, wordingHash } from "../src/lib/wording";

describe("F3 approval gate", () => {
  it("B4: with no record the wording is not approved and no reminder can be built", () => {
    const store = memoryStore();
    expect(isApproved(store, wordingHash())).toBe(false);
    expect(() => buildReminder({ firstName: "Sara", reminderNumber: 1, visitDate: "2026-11-06" }, store)).toThrow(ApprovalError);
  });

  it("B4: with a valid record a reminder can be built", () => {
    const store = memoryStore();
    approve(store, "Receptionist", wordingHash());
    expect(isApproved(store, wordingHash())).toBe(true);
    const r = buildReminder({ firstName: "Sara", reminderNumber: 1, visitDate: "2026-11-06" }, store);
    expect(r.ok).toBe(true);
  });

  it("B4: if the wording changes, the old approval no longer works", () => {
    const store = memoryStore({ approvedBy: "Receptionist", approvedAt: "2026-11-10T10:00:00Z", hash: "hash-of-older-wording" });
    expect(isApproved(store, wordingHash())).toBe(false);
    expect(() => buildReminder({ firstName: "Sara", reminderNumber: 2, visitDate: "2026-11-06" }, store)).toThrow(ApprovalError);
  });

  it("the hash changes when any template text changes", () => {
    const before = wordingHash();
    const original = TEMPLATES[1].en;
    TEMPLATES[1].en = original + " ";
    const after = wordingHash();
    TEMPLATES[1].en = original;
    expect(after).not.toBe(before);
    expect(wordingHash()).toBe(before);
  });

  it("a name is needed to approve", () => {
    const store = memoryStore();
    expect(() => approve(store, "   ", wordingHash())).toThrow(ApprovalError);
    expect(store.read()).toBeNull();
  });

  it("records who approved and when", () => {
    const store = memoryStore();
    const record = approve(store, "  Receptionist  ", wordingHash(), new Date("2026-11-10T10:00:00Z"));
    expect(record).toEqual({ approvedBy: "Receptionist", approvedAt: "2026-11-10T10:00:00.000Z", hash: wordingHash() });
    expect(store.read()).toEqual(record);
  });

  it("a file store keeps the approval, and a missing or damaged file means not approved", () => {
    const dir = mkdtempSync(join(tmpdir(), "braces-approval-"));
    try {
      const path = join(dir, "nested", "approval.json");
      const store = fileStore(path);
      expect(store.read()).toBeNull(); // missing file
      approve(store, "Receptionist", wordingHash());
      expect(fileStore(path).read()?.approvedBy).toBe("Receptionist");
      writeFileSync(path, "{ not json");
      expect(fileStore(path).read()).toBeNull(); // damaged file
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
