// Saved state as a list of records. The real version is a JSON file; tests use memory.
// `update` reads, checks and writes in ONE synchronous step, so two quick presses can never
// both pass a check before either one saves.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import type { ZodType } from "zod";

export interface JsonStore<T> {
  read(): T[];
  // fn gets a copy of the records. Return `items` to save a new list, and `result` for the caller.
  update<R>(fn: (items: T[]) => { items?: T[]; result: R }): R;
}

export function memoryJsonStore<T>(initial: T[] = []): JsonStore<T> {
  let items = [...initial];
  return {
    read: () => [...items],
    update(fn) {
      const out = fn([...items]);
      if (out.items) items = [...out.items];
      return out.result;
    },
  };
}

// Thrown when a saved file exists but cannot be read. We stop instead of starting over, because
// forgetting which reminders were sent could mean duplicate reminders or a third one.
export class StoreError extends Error {}

// A file that does not exist yet is empty. A file that exists but is damaged is an error.
export function fileJsonStore<T>(path: string, schema: ZodType<T[]>): JsonStore<T> {
  const read = (): T[] => {
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new StoreError(`The saved file ${basename(path)} could not be read. Nothing was changed.`);
    }
    try {
      return schema.parse(JSON.parse(raw));
    } catch {
      throw new StoreError(`The saved file ${basename(path)} is damaged. Nothing was changed; restore it before continuing.`);
    }
  };
  return {
    read,
    update(fn) {
      const out = fn(read()); // throws on a damaged file, so a bad file is never overwritten
      if (out.items) {
        mkdirSync(dirname(path), { recursive: true });
        // Write a temporary file and rename it, so a crash never leaves a half-written file.
        const temp = `${path}.tmp`;
        writeFileSync(temp, JSON.stringify(out.items, null, 2) + "\n");
        renameSync(temp, path);
      }
      return out.result;
    },
  };
}
