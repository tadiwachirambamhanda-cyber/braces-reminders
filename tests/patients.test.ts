import { describe, expect, it } from "vitest";
import { PatientSchema } from "../src/lib/patients";

const valid = {
  id: "P001",
  firstName: "Sara",
  phone: "+971 50 000 0001",
  treatment: "braces",
  dueDate: "2026-11-06",
  bookedSlotId: null,
};

describe("F1 patient shape", () => {
  it("accepts a valid patient", () => {
    expect(PatientSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a patient with no id", () => {
    const { id: _id, ...noId } = valid;
    void _id;
    expect(PatientSchema.safeParse(noId).success).toBe(false);
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(PatientSchema.safeParse({ ...valid, dueDate: "6 Nov" }).success).toBe(false);
  });

  it("allows an empty phone, because those patients go to the call list later", () => {
    expect(PatientSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });
});
