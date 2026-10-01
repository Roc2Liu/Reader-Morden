import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useReaderStore } from "../store";

const WINDOW_BEFORE = 60;
const WINDOW_AFTER = 100;
const SAVE_INTERVAL = 700;
const CHAPTER_PRELOAD_RANGE = 1;

export function Reader() {
  const { currentBook, chapterIndex, paragraphIndex, setParagraph, saveCurrentProgress, settings, toggleChrome, setChromeVisible, navigationVersion, setChapterEndVisible } = useReaderStore();
  const scroller = useRef<HTMLDivElement>(null);
  const restoringRef = useRef(false);
  const chapter = currentBook?.chapters[chapterIndex];

  // 章节数据通常已经在内存中，这里提前触达相邻章节，
  // 让浏览器提前完成文本布局相关准备，切章时保持连续感。
  useEffect(() => {
    if (!currentBook) return;
    for (let i = 1; i <= CHAPTER_PRELOAD_RANGE; i++) {
      currentBook.chapters[chapterIndex + i]?.paragraphs.slice(0, 3).join(" ");
      currentBook.chapters[chapterIndex - i]?.paragraphs.slice(0, 3).join(" ");
    }
  }, [currentBook, chapterIndex]);

  // TXT 段落高度不是固定值，所以这里使用一个保守的估算值作为窗口定位基准。
  // 真实 DOM 高度仍由浏览器决定；窗口会随着滚动位置持续向前移动。
  const estimatedRowHeight = Math.max(42, settings.fontSize * settings.lineHeight + settings.paragraphSpacing * settings.fontSize);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !chapter) return;

    let raf = 0;
    let lastProgressUpdate = 0;
    let lastIndex = paragraphIndex;

    const update = () => {
      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      const ratio = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
      // 到达章节底部时，自动把上一章 / 下一章导航露出来。
      // 离开底部后恢复沉浸式隐藏状态。
      setChapterEndVisible(el.scrollTop >= Math.max(0, maxScroll - 120));
      const estimatedIndex = Math.min(
        chapter.paragraphs.length - 1,
        Math.max(0, Math.round((el.scrollTop / Math.max(1, el.scrollHeight)) * chapter.paragraphs.length))
      );

      // 关键：滚动画面不再每一帧 setState。
      // 只有跨过明显的段落位置才同步阅读位置，避免 React 重渲染拖慢滚动。
      if (Math.abs(estimatedIndex - lastIndex) >= 3) {
        lastIndex = estimatedIndex;
        setParagraph(estimatedIndex);
      }

      const now = performance.now();
      if (now - lastProgressUpdate > SAVE_INTERVAL) {
        lastProgressUpdate = now;
        void saveCurrentProgress(ratio);
      }
    };

    const onScroll = () => {
      if (restoringRef.current) return;
      setChromeVisible(false);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [chapter?.id, chapter?.paragraphs.length, saveCurrentProgress, setParagraph, setChromeVisible, setChapterEndVisible]);

  const paragraphs = chapter?.paragraphs ?? [];
  const start = Math.max(0, paragraphIndex - WINDOW_BEFORE);
  const end = Math.min(paragraphs.length, paragraphIndex + WINDOW_AFTER);
  const visible = useMemo(() => paragraphs.slice(start, end), [paragraphs, start, end]);

  // 打开书/切章后，把阅读位置精确落到已保存的段落，而不是只依赖粗略的滚动比例。
  useEffect(() => {
    if (!chapter || !scroller.current) return;
    const el = scroller.current;
    setChapterEndVisible(false);
    restoringRef.current = true;
    let raf = 0;
    let attempts = 0;

    const restore = () => {
      const target = el.querySelector<HTMLElement>(`[data-paragraph="${Math.max(0, paragraphIndex)}"]`);
      if (target) {
        const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - el.clientHeight * 0.18;
        el.scrollTop = Math.max(0, top);
        requestAnimationFrame(() => {
          setChapterEndVisible(el.scrollTop >= Math.max(0, el.scrollHeight - el.clientHeight - 120));
          restoringRef.current = false;
        });
        return;
      }
      attempts += 1;
      if (attempts < 8) raf = requestAnimationFrame(restore);
      else {
        const ratio = Math.min(1, Math.max(0, useReaderStore.getState().progress?.scrollRatio ?? 0));
        el.scrollTop = ratio * Math.max(0, el.scrollHeight - el.clientHeight);
        requestAnimationFrame(() => {
          setChapterEndVisible(el.scrollTop >= Math.max(0, el.scrollHeight - el.clientHeight - 120));
          restoringRef.current = false;
        });
      }
    };

    raf = requestAnimationFrame(restore);
    return () => {
      cancelAnimationFrame(raf);
      restoringRef.current = false;
    };
  }, [chapter?.id, navigationVersion, setChapterEndVisible]);

  // 让新进入阅读区的段落做一次非常轻的渐显。
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        root: el,
        rootMargin: "80px 0px 120px",
        threshold: 0.01,
      }
    );

    const nodes = el.querySelectorAll<HTMLElement>("[data-reader-paragraph]");
    nodes.forEach(node => observer.observe(node));

    return () => observer.disconnect();
  }, [chapter?.id, start, end]);

  if (!currentBook) {
    return (
      <main className="empty-reader">
        <div className="empty-icon">书</div>
        <h1>开始阅读</h1>
        <p>导入一本 TXT 小说，阅读位置会自动保存。</p>
      </main>
    );
  }

  return (
    <main
      ref={scroller}
      className="reader-scroll"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("button,input,a")) toggleChrome();
      }}
    >
      <article
        className="reader-content chapter-enter"
        style={{
          maxWidth: `min(${settings.maxWidth}px, 72vw)`,
          fontSize: settings.fontSize,
          fontWeight: settings.fontWeight,
          letterSpacing: settings.letterSpacing,
          lineHeight: settings.lineHeight,
          fontFamily: settings.fontFamily,
          // 排版系统：字号变化时保持阅读密度稳定
          '--reading-size': `${settings.fontSize}px`,
        } as CSSProperties}
      >
        <div className="chapter-kicker">第 {chapterIndex + 1} 章 · 共 {currentBook.chapters.length} 章</div>
        <h1>{chapter?.title}</h1>

        <div
          className="paragraph-window"
          style={{ minHeight: Math.max(0, paragraphs.length * estimatedRowHeight) }}
        >
          <div style={{ paddingTop: start * estimatedRowHeight }}>
            {visible.map((paragraph, i) => {
              const index = start + i;
              return (
                <p
                  key={index}
                  data-paragraph={index}
                  data-reader-paragraph
                  style={{ marginBottom: `${settings.paragraphSpacing}em` }}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        <div className="chapter-end">— 本章完 —</div>
      </article>
    </main>
  );
}
