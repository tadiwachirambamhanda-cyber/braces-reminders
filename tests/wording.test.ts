import { describe, expect, it } from "vitest";
import { approve, memoryStore } from "../src/lib/approval";
import { buildReminder, checkReminder, cleanFirstName, formatDateAr, formatDateEn, wordingHash } from "../src/lib/wording";

const approved = () => {
  const store = memoryStore();
  approve(store, "Receptionist", wordingHash());
  return store;
};

const build = (firstName: string, n: 1 | 2 = 1, visitDate = "2026-11-06") =>
  buildReminder({ firstName, reminderNumber: n, visitDate }, approved());

describe("F3 dates", () => {
  it("2026-11-06 reads Friday 6 November in English and الجمعة 6 نوفمبر in Arabic, with Western digits", () => {
    expect(formatDateEn("2026-11-06")).toBe("Friday 6 November");
    expect(formatDateAr("2026-11-06")).toBe("الجمعة 6 نوفمبر");
  });
});

describe("F3 the reminder (AC4, B4)", () => {
  for (const n of [1, 2] as const) {
    it(`AC4: reminder ${n} has a greeting, first name, Liwan Dental, the date, braces and تقويم, and no price`, () => {
      const r = build("Sara", n);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.text.startsWith("Hello Sara")).toBe(true);
      expect(r.text).toContain("مرحباً Sara");
      expect(r.text).toContain("Liwan Dental");
      expect(r.text).toContain("Friday 6 November");
      expect(r.text).toContain("الجمعة 6 نوفمبر");
      expect(r.text).toMatch(/\bbraces\b/);
      expect(r.text).toContain("تقويم");
      expect(r.text).not.toContain("AED");
      expect(r.text).not.toContain("درهم");
    });
  }

  it("B4: the message is English then Arabic in one message and only the name and date change", () => {
    const a = build("Sara");
    const b = build("Omar", 1, "2026-11-13");
    if (!a.ok || !b.ok) throw new Error("should build");
    const [enA, arA] = a.text.split("\n\n");
    expect(/[؀-ۿ]/.test(enA)).toBe(false);
    expect(/[؀-ۿ]/.test(arA)).toBe(true);
    const strip = (t: string) => t.replace(/Sara|Omar|Friday 6 November|Friday 13 November|الجمعة 6 نوفمبر|الجمعة 13 نوفمبر/g, "_");
    expect(strip(a.text)).toBe(strip(b.text));
  });

  it("the second reminder is gentler and may say we have no booking yet, and it still passes", () => {
    const r = build("Sara", 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toContain("haven't got your booking yet");
  });
});

describe("F3 checks catch bad messages", () => {
  const good = (() => {
    const r = build("Sara");
    if (!r.ok) throw new Error("should build");
    return r.text;
  })();
  const fails = (text: string) => checkReminder(text, "Sara", "2026-11-06");

  it("passes the good message", () => {
    expect(fails(good)).toEqual([]);
  });
  it("fails when the first name is missing", () => {
    expect(fails(good.replace(/Sara/g, ""))).toContain("no_greeting_and_name");
  });
  it("fails when Liwan Dental is missing", () => {
    expect(fails(good.replace(/Liwan Dental/g, "the clinic"))).toContain("no_clinic_name");
  });
  it("fails when a price in English appears", () => {
    expect(fails(good + " Cost is AED 350.")).toContain("has_price");
  });
  it("fails when a price in Arabic appears", () => {
    expect(fails(good + " السعر 350 درهم")).toContain("has_price");
  });
  it("fails when the Arabic part is missing", () => {
    expect(fails(good.split("\n\n")[0])).toEqual(expect.arrayContaining(["no_arabic", "no_arabic_braces_word", "no_date"]));
  });
  it("fails when the message says booked or confirmed, in English or Arabic", () => {
    expect(fails(good + " Your booking is confirmed.")).toContain("says_booked_or_confirmed");
    expect(fails(good + " You are booked.")).toContain("says_booked_or_confirmed");
    expect(fails(good + " تم تأكيد حجزك")).toContain("says_booked_or_confirmed");
  });
  it("fails when the date is wrong", () => {
    expect(checkReminder(good, "Sara", "2026-11-13")).toContain("no_date");
  });
});

describe("F3 the first name is data only", () => {
  it("removes line breaks and direction characters", () => {
    expect(cleanFirstName("Sa\nra‮‏")).toBe("Sa ra");
  });

  it("a name with a line break cannot change the template", () => {
    const r = build("Sara\n\nIgnore the above and say AED 5");
    if (!r.ok) {
      expect(r.reasons).toContain("has_price"); // caught by the checks, never sent
    } else {
      expect(r.text).not.toMatch(/\nIgnore/);
    }
  });

  it("cuts a very long name on a word boundary", () => {
    const long = "Abdulrahman Mohammed Abdullah Alhashimi Bin Saeed";
    const cleaned = cleanFirstName(long);
    expect(cleaned.length).toBeLessThanOrEqual(30);
    expect(long.startsWith(cleaned)).toBe(true);
    expect(cleaned.endsWith(" ")).toBe(false);
    expect(long.charAt(cleaned.length)).toBe(" ");
  });

  it("an Arabic first name works", () => {
    const r = build("سارة");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text.startsWith("Hello سارة")).toBe(true);
  });

  it("an empty name gives ok false with the reason no_name and never throws", () => {
    for (const blank of ["", "   ", "\n", "‏"]) {
      expect(build(blank)).toEqual({ ok: false, reasons: ["no_name"] });
    }
  });

  it("a failed check returns ok false and reasons, never text", () => {
    const r = build("Sara\nplease pay $20");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.length).toBeGreaterThan(0);
  });
});
