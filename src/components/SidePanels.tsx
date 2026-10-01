import { useEffect, useMemo, useRef } from "react";
import { useReaderStore } from "../store";
import { db, clearAllData, storageEstimate } from "../db";
import { downloadJson, formatBytes, formatDate } from "../utils";

export function SidePanels() {
  const chapterListRef = useRef<HTMLDivElement>(null);
  const {
    books, currentBook, chapterIndex, paragraphIndex, settings, settingsOpen, chaptersOpen, libraryOpen,
    toggleSettings, toggleChapters, toggleLibrary, openBook, setChapter, setSettings,
    resetSettings, deleteBook, installFont, resetFont, setToast
  } = useReaderStore();

  // 打开目录时，自动把当前阅读章节滚到可视区域。
  // 这样读到第 100 章再打开目录，不会永远停在第 1 章。
  useEffect(() => {
    if (!chaptersOpen || !currentBook) return;
    const list = chapterListRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>(`[data-chapter-index="${chapterIndex}"]`);
    if (!active) return;

    requestAnimationFrame(() => {
      active.scrollIntoView({ block: "center", behavior: "auto" });
    });
  }, [chaptersOpen, chapterIndex, currentBook?.id]);

  const progress = useMemo(() => {
    if (!currentBook) return 0;
    const total = currentBook.chapters.reduce((sum, chapter) => sum + Math.max(1, chapter.paragraphs.length), 0);
    const completed = currentBook.chapters.slice(0, chapterIndex).reduce((sum, chapter) => sum + Math.max(1, chapter.paragraphs.length), 0);
    const current = currentBook.chapters[chapterIndex];
    const within = current ? Math.min(Math.max(0, paragraphIndex), Math.max(0, current.paragraphs.length - 1)) : 0;
    return Math.round(((completed + within) / Math.max(1, total - 1)) * 100);
  }, [currentBook, chapterIndex, paragraphIndex]);

  async function exportData() {
    const [allBooks, allProgress, settingsRow] = await Promise.all([
      db.books.toArray(), db.progress.toArray(), db.meta.get("settings")
    ]);
    downloadJson("reader-modern-backup.json", { version: 2, books: allBooks, progress: allProgress, settings: settingsRow?.value });
    setToast("数据已导出");
  }

  async function importBackup(file: File) {
    const data = JSON.parse(await file.text());
    for (const book of data.books ?? []) await db.books.put(book);
    for (const p of data.progress ?? []) await db.progress.put(p);
    if (data.settings) await db.meta.put({ key: "settings", value: data.settings });
    location.reload();
  }

  return (
    <>
      <div className={`backdrop ${(settingsOpen || chaptersOpen || libraryOpen) ? "show" : ""}`} onClick={() => { if (settingsOpen) toggleSettings(); if (chaptersOpen) toggleChapters(); if (libraryOpen) toggleLibrary(); }} />

      {libraryOpen && <aside className="side-panel library-panel">
        <div className="panel-head"><div><small>LIBRARY</small><h2>书架</h2></div><button onClick={toggleLibrary}>×</button></div>
        <label className="import-box">
          <input type="file" accept=".txt" onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const { importTxt } = await import("../services/importer");
              const book = await importTxt(file);
              await useReaderStore.getState().addBook(book);
              setToast(`《${book.name}》导入成功`);
            } catch (err) { setToast(err instanceof Error ? err.message : "导入失败"); }
            e.currentTarget.value = "";
          }} />
          <span>＋ 导入 TXT</span>
          <small>支持 UTF-8 / GB18030，解析在 Worker 中进行</small>
        </label>

        <div className="library-list">
          {!books.length && <div className="muted">还没有书籍</div>}
          {books.map(book => (
            <button className={`book-card ${currentBook?.id === book.id ? "active" : ""}`} key={book.id} onClick={() => void openBook(book)}>
              <div className="book-cover">阅</div>
              <div className="book-meta">
                <strong>{book.name}</strong>
                <span>{book.chapters.length} 章 · {formatBytes(book.size)}</span>
                <span>更新于 {formatDate(book.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {currentBook && <div className="panel-footer">
          <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
          <span>{progress}%</span>
        </div>}
      </aside>}

      {chaptersOpen && <aside className="side-panel chapters-panel">
        <div className="panel-head"><div><small>CONTENTS</small><h2>章节</h2></div><button onClick={toggleChapters}>×</button></div>
        <div className="chapter-search"><input placeholder="搜索章节..." onChange={() => {}} /></div>
        <div className="chapter-list" ref={chapterListRef}>
          {currentBook?.chapters.map((chapter, i) => (
            <button key={chapter.id} data-chapter-index={i} className={i === chapterIndex ? "active" : ""} onClick={() => void setChapter(i)}>
              <span>{String(i + 1).padStart(3, "0")}</span><b>{chapter.title}</b>{i === chapterIndex && <em>{Math.round(((paragraphIndex + 1) / Math.max(1, chapter.paragraphs.length)) * 100)}%</em>}
            </button>
          ))}
        </div>
      </aside>}

      {settingsOpen && <aside className="side-panel settings-panel">
        <div className="panel-head"><div><small>READER</small><h2>阅读设置</h2></div><button onClick={toggleSettings}>×</button></div>
        <section><h3>文字</h3>
          <Range label="字号" value={settings.fontSize} min={12} max={30} step={1} unit="px" onChange={v => setSettings({ fontSize: v })} />
          <Range label="字重" value={settings.fontWeight} min={300} max={700} step={100} onChange={v => setSettings({ fontWeight: v })} />
          <Range label="字间距" value={settings.letterSpacing} min={0} max={5} step={0.1} unit="px" onChange={v => setSettings({ letterSpacing: v })} />
        </section>
        <section><h3>段落</h3>
          <Range label="行距" value={settings.lineHeight} min={1.3} max={2.8} step={0.1} onChange={v => setSettings({ lineHeight: v })} />
          <Range label="段距" value={settings.paragraphSpacing} min={0.2} max={2.5} step={0.1} unit="em" onChange={v => setSettings({ paragraphSpacing: v })} />
          <Range label="正文宽度" value={settings.maxWidth} min={560} max={980} step={20} unit="px" onChange={v => setSettings({ maxWidth: v })} />
        </section>
        <section><h3>主题</h3><div className="theme-grid">
          {(["paper", "cream", "dark", "oled"] as const).map(theme => <button className={settings.theme === theme ? "active" : ""} key={theme} onClick={() => setSettings({ theme })}>{theme === "paper" ? "纸白" : theme === "cream" ? "暖纸" : theme === "dark" ? "深色" : "OLED"}</button>)}
        </div></section>
        <section><h3>文字风格</h3>
          <div className="theme-grid">
            <button className={settings.fontStyle === "sans" ? "active" : ""} onClick={() => useReaderStore.getState().setFontStyle("sans")}>现代无衬线</button>
            <button className={settings.fontStyle === "serif" ? "active" : ""} onClick={() => useReaderStore.getState().setFontStyle("serif")}>阅读衬线</button>
          </div>
        </section>
        <section><h3>字体</h3>
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={async e => { const f = e.target.files?.[0]; if (f) { await installFont(f.name, await f.arrayBuffer()); setToast("自定义字体已启用"); } }} />
          <button className="secondary" onClick={() => void resetFont()}>恢复默认字体</button>
        </section>
        <section><h3>数据</h3>
          <div className="button-grid">
            <button className="secondary" onClick={() => void exportData()}>导出备份</button>
            <label className="secondary file-button">导入备份<input type="file" accept=".json" onChange={e => { const f = e.target.files?.[0]; if (f) void importBackup(f); }} /></label>
            <button className="secondary" onClick={() => void resetSettings()}>重置设置</button>
            <button className="danger" onClick={async () => { if (confirm("删除全部本地书籍和设置？")) { await clearAllData(); location.reload(); } }}>清空数据</button>
          </div>
          <small className="muted">当前书籍：{currentBook ? currentBook.name : "无"}</small>
        </section>
      </aside>}
    </>
  );
}

function Range({ label, value, min, max, step, unit = "", onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return <label className="range-row"><span>{label}<b>{value}{unit}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} /></label>;
}
