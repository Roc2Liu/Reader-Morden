import type { Chapter } from "../types";

const worker = new Worker(new URL("../workers/parser.worker.ts", import.meta.url), { type: "module" });

export function parseBook(text: string): Promise<Chapter[]> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<{ chapters: Chapter[] }>) => {
      cleanup();
      resolve(event.data.chapters.map((x, i) => ({ ...x, id: `${i}-${x.title}` })));
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(event.error ?? new Error(event.message));
    };
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ text });
  });
}