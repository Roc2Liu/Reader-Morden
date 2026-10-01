import { create } from "zustand";
import { db, loadFont, loadSettings, saveSettings } from "./db";
import { DEFAULT_SETTINGS, type Book, type Progress, type ReaderSettings } from "./types";

interface ReaderState {
  books: Book[];
  currentBook: Book | null;
  chapterIndex: number;
  paragraphIndex: number;
  progress: Progress | null;
  settings: ReaderSettings;
  settingsOpen: boolean;
  chaptersOpen: boolean;
  libraryOpen: boolean;
  loading: boolean;
  toast: string | null;
  customFontUrl: string | null;
  chromeVisible: boolean;
  navigationVersion: number;
  chapterEndVisible: boolean;

  bootstrap: () => Promise<void>;
  setToast: (message: string | null) => void;
  setSettings: (patch: Partial<ReaderSettings>) => void;
  toggleSettings: () => void;
  toggleChapters: () => void;
  toggleLibrary: () => void;
  openBook: (book: Book) => Promise<void>;
  setChapter: (index: number) => Promise<void>;
  setParagraph: (index: number) => void;
  saveCurrentProgress: (ratio?: number) => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  resetSettings: () => Promise<void>;
  installFont: (name: string, buffer: ArrayBuffer) => Promise<void>;
  resetFont: () => Promise<void>;
  setFontStyle: (style: ReaderSettings["fontStyle"]) => void;
  setChromeVisible: (visible: boolean) => void;
  toggleChrome: () => void;
  setChapterEndVisible: (visible: boolean) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  books: [],
  currentBook: null,
  chapterIndex: 0,
  paragraphIndex: 0,
  progress: null,
  settings: DEFAULT_SETTINGS,
  settingsOpen: false,
  chaptersOpen: false,
  libraryOpen: false,
  loading: true,
  toast: null,
  customFontUrl: null,
  chromeVisible: false,
  navigationVersion: 0,
  chapterEndVisible: false,

  bootstrap: async () => {
    const [books, settings, font, progressRows] = await Promise.all([
      db.books.orderBy("updatedAt").reverse().toArray(),
      loadSettings(),
      loadFont(),
      db.progress.orderBy("updatedAt").reverse().toArray(),
    ]);
    const s = settings ?? DEFAULT_SETTINGS;
    let fontUrl: string | null = null;
    if (font?.buffer) fontUrl = URL.createObjectURL(new Blob([font.buffer]));
    const first = books[0] ?? null;
    const p = first ? progressRows.find(x => x.bookId === first.id) ?? null : null;
    set({
      books,
      settings: s,
      customFontUrl: fontUrl,
      currentBook: first,
      progress: p,
      chapterIndex: p?.chapterIndex ?? 0,
      paragraphIndex: p?.paragraphIndex ?? 0,
      navigationVersion: 1,
      loading: false,
    });
  },

  setChromeVisible: (visible) => set({ chromeVisible: visible }),
  toggleChrome: () => set(s => ({ chromeVisible: !s.chromeVisible })),
  setChapterEndVisible: (visible) => set({ chapterEndVisible: visible }),

  setToast: (message) => {
    set({ toast: message });
    if (message) window.setTimeout(() => set({ toast: null }), 2400);
  },

  setSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    void saveSettings(next);
  },

  toggleSettings: () => set(s => ({ settingsOpen: !s.settingsOpen, chaptersOpen: false, libraryOpen: false })),
  toggleChapters: () => set(s => ({ chaptersOpen: !s.chaptersOpen, settingsOpen: false, libraryOpen: false })),
  toggleLibrary: () => set(s => ({ libraryOpen: !s.libraryOpen, settingsOpen: false, chaptersOpen: false })),

  openBook: async (book) => {
    const progress = await db.progress.get(book.id);
    set({
      currentBook: book,
      progress: progress ?? null,
      chapterIndex: progress?.chapterIndex ?? 0,
      paragraphIndex: progress?.paragraphIndex ?? 0,
      navigationVersion: get().navigationVersion + 1,
      chapterEndVisible: false,
      libraryOpen: false,
    });
  },

  setChapter: async (index) => {
    const { currentBook } = get();
    if (!currentBook || index < 0 || index >= currentBook.chapters.length) return;
    set(s => ({ chapterIndex: index, paragraphIndex: 0, navigationVersion: s.navigationVersion + 1, chaptersOpen: false, chapterEndVisible: false }));
    await get().saveCurrentProgress(0);
  },

  setParagraph: (index) => set({ paragraphIndex: index }),

  saveCurrentProgress: async (ratio = 0) => {
    const { currentBook, chapterIndex, paragraphIndex } = get();
    if (!currentBook) return;
    const progress: Progress = {
      bookId: currentBook.id,
      chapterIndex,
      paragraphIndex,
      scrollRatio: ratio,
      updatedAt: Date.now(),
    };
    await db.progress.put(progress);
    await db.books.update(currentBook.id, { updatedAt: Date.now() });
    set({ progress });
  },

  addBook: async (book) => {
    await db.books.put(book);
    const books = await db.books.orderBy("updatedAt").reverse().toArray();
    set(s => ({ books, currentBook: book, chapterIndex: 0, paragraphIndex: 0, progress: null, navigationVersion: s.navigationVersion + 1, chapterEndVisible: false }));
  },

  deleteBook: async (id) => {
    await db.books.delete(id);
    await db.progress.delete(id);
    const books = await db.books.orderBy("updatedAt").reverse().toArray();
    const current = get().currentBook?.id === id ? (books[0] ?? null) : get().currentBook;
    const progress = current ? await db.progress.get(current.id) : null;
    set({
      books,
      currentBook: current,
      progress: progress ?? null,
      chapterIndex: progress?.chapterIndex ?? 0,
      paragraphIndex: progress?.paragraphIndex ?? 0,
      navigationVersion: get().navigationVersion + 1,
      chapterEndVisible: false,
    });
  },

  setFontStyle: (style) => {
    const next = { ...get().settings, fontStyle: style };
    set({ settings: next });
    void saveSettings(next);
  },

  resetSettings: async () => {
    await saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },

  installFont: async (name, buffer) => {
    await db.meta.put({ key: "font", value: { name, buffer } });
    const url = URL.createObjectURL(new Blob([buffer]));
    set({ customFontUrl: url, settings: { ...get().settings, fontFamily: `"ReaderCustom", ${DEFAULT_SETTINGS.fontFamily}` } });
  },

  resetFont: async () => {
    await db.meta.delete("font");
    const { customFontUrl } = get();
    if (customFontUrl) URL.revokeObjectURL(customFontUrl);
    set({ customFontUrl: null, settings: { ...get().settings, fontFamily: DEFAULT_SETTINGS.fontFamily } });
  },
}));