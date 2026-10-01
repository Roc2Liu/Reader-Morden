export type Theme = "paper" | "cream" | "dark" | "oled";

export interface Chapter {
  id: string;
  title: string;
  content: string;
  paragraphs: string[];
}

export interface Book {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  chapters: Chapter[];
  createdAt: number;
  updatedAt: number;
}

export interface Progress {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
  scrollRatio: number;
  updatedAt: number;
}

export interface ReaderSettings {
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  fontFamily: string;
  fontStyle: "sans" | "serif";
  theme: Theme;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontWeight: 400,
  letterSpacing: 0,
  lineHeight: 1.9,
  paragraphSpacing: 1,
  maxWidth: 760,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  fontStyle: "sans",
  theme: "paper",
};