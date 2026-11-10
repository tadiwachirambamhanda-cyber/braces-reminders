// Saved state as a list of records. The real version is a JSON file; tests use memory.
// `update` reads, checks and writes in ONE synchronous step, so two quick presses can never
// both pass a check before either one saves.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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

// A missing or damaged file counts as empty.
export function fileJsonStore<T>(path: string, schema: ZodType<T[]>): JsonStore<T> {
  const read = (): T[] => {
    try {
      return schema.parse(JSON.parse(readFileSync(path, "utf8")));
    } catch {
      return [];
    }
  };
  return {
    read,
    update(fn) {
      const out = fn(read());
      if (out.items) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(out.items, null, 2) + "\n");
      }
      return out.result;
    },
  };
}
