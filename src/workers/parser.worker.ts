interface Input { text: string; }
interface Output { chapters: Array<{ title: string; content: string; paragraphs: string[] }>; }

const patterns = [
  /^第[0-9０-９一二三四五六七八九十百千万两零〇]+[章节回卷部集篇].*$/i,
  /^Chapter\s+\d+.*$/i,
  /^\d{1,5}[.、:：\s]+.+$/,
  /^卷[一二三四五六七八九十百千万0-9]+\s+.*$/i,
];

function isChapter(line: string) {
  const value = line.trim();
  return value.length > 0 && patterns.some(p => p.test(value));
}

function parse(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const chapters: Array<{ title: string; content: string; paragraphs: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (isChapter(line)) {
      if (current) {
        const content = current.lines.join("\n").trim();
        chapters.push({ title: current.title, content, paragraphs: content.split(/\n+/).map(x => x.trim()).filter(Boolean) });
      }
      current = { title: line.trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    const content = current.lines.join("\n").trim();
    chapters.push({ title: current.title, content, paragraphs: content.split(/\n+/).map(x => x.trim()).filter(Boolean) });
  }

  if (!chapters.length) {
    const content = normalized.trim();
    chapters.push({
      title: "全文",
      content,
      paragraphs: content.split(/\n+/).map(x => x.trim()).filter(Boolean),
    });
  }

  return chapters;
}

self.onmessage = (event: MessageEvent<Input>) => {
  const chapters = parse(event.data.text);
  self.postMessage({ chapters } satisfies Output);
};
