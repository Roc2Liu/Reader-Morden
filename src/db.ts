import Dexie, { type Table } from "dexie";
import type { Book, Progress, ReaderSettings } from "./types";

class ReaderDB extends Dexie {
  books!: Table<Book, string>;
  progress!: Table<Progress, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("ReaderModernDB");
    this.version(1).stores({
      books: "id, name, updatedAt",
      progress: "bookId, updatedAt",
      meta: "key",
    });
  }
}

export const db = new ReaderDB();

export async function saveSettings(settings: ReaderSettings) {
  await db.meta.put({ key: "settings", value: settings });
}

export async function loadSettings() {
  const row = await db.meta.get("settings");
  return row?.value as ReaderSettings | undefined;
}

export async function saveFont(name: string, buffer: ArrayBuffer) {
  await db.meta.put({ key: "font", value: { name, buffer } });
}

export async function loadFont() {
  const row = await db.meta.get("font");
  return row?.value as { name: string; buffer: ArrayBuffer } | undefined;
}

export async function clearAllData() {
  await Promise.all([db.books.clear(), db.progress.clear(), db.meta.clear()]);
}

export async function storageEstimate() {
  const estimate = await navigator.storage?.estimate?.();
  return {
    usage: estimate?.usage ?? 0,
    quota: estimate?.quota ?? 0,
  };
}