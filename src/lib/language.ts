// A reply is in Arabic if the patient's message has Arabic letters, otherwise English.
export function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

export type Lang = "en" | "ar";

export function languageOf(text: string): Lang {
  return isArabic(text) ? "ar" : "en";
}
