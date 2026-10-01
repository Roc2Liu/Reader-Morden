import { useEffect } from "react";
import { useReaderStore } from "../store";

export function Toolbar() {
  const {
    currentBook, chapterIndex, toggleChapters, toggleSettings, toggleLibrary,
    setChapter, chromeVisible, chapterEndVisible, setChromeVisible
  } = useReaderStore();

  useEffect(() => {
    let timer = 0;
    const hideLater = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChromeVisible(false), 1700);
    };
    const onPointerMove = (event: PointerEvent) => {
      const h = window.innerHeight;
      if (event.clientY < 72 || event.clientY > h - 72) {
        setChromeVisible(true);
        hideLater();
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [setChromeVisible]);

  return (
    <div className={`reader-chrome ${chromeVisible ? "visible" : ""} ${chapterEndVisible ? "chapter-end-visible" : ""}`}>
      <header className="topbar">
        <button className="icon-btn" onClick={toggleLibrary} aria-label="书架">☰</button>
        <div className="book-title">{currentBook?.name ?? "Reader Modern"}</div>
        <div className="top-actions">
          <button className="icon-btn" onClick={toggleChapters}>目录</button>
          <button className="icon-btn" onClick={toggleSettings}>Aa</button>
        </div>
      </header>

      <footer className="bottombar">
        <button onClick={() => void setChapter(chapterIndex - 1)} disabled={!currentBook || chapterIndex <= 0}>‹</button>
        <button className="chapter-pill" onClick={toggleChapters}>
          {currentBook ? `${chapterIndex + 1} / ${currentBook.chapters.length}` : "未打开书籍"}
        </button>
        <button onClick={() => void setChapter(chapterIndex + 1)} disabled={!currentBook || chapterIndex >= (currentBook?.chapters.length ?? 1) - 1}>›</button>
      </footer>
    </div>
  );
}
