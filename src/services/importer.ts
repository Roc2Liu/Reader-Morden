import type { Book } from "../types";
import { parseBook } from "./parser";

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}

export async function importTxt(file: File): Promise<Book> {
  if (!file.name.toLowerCase().endsWith(".txt")) throw new Error("请选择 TXT 文件");
  if (!file.size) throw new Error("文件为空");

  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      text = new TextDecoder("gb18030").decode(buffer);
    } catch {
      text = new TextDecoder().decode(buffer);
    }
  }

  const chapters = await parseBook(text);
  if (!chapters.length) throw new Error("无法识别正文");

  const now = Date.now();
  return {
    id: await hashFile(file),
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    chapters,
    createdAt: now,
    updatedAt: now,
  };
}
