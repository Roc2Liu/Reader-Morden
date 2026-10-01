import { useEffect } from "react";
import { useReaderStore } from "./store";
import { Reader } from "./components/Reader";
import { Toolbar } from "./components/Toolbar";
import { SidePanels } from "./components/SidePanels";

export default function App() {
  const { bootstrap, loading, settings, customFontUrl, toast } = useReaderStore();

  useEffect(() => { void bootstrap(); }, [bootstrap]);

  useEffect(() => {
    if (customFontUrl) {
      const style = document.createElement("style");
      style.textContent = `@font-face{font-family:ReaderCustom;src:url("${customFontUrl}") format("truetype");font-display:swap}`;
      document.head.appendChild(style);
      return () => style.remove();
    }
  }, [customFontUrl]);

  if (loading) return <div className="boot">正在初始化阅读器…</div>;

  return (
    <div className={`app theme-${settings.theme} font-${settings.fontStyle}`}>
      <Toolbar />
      <Reader />
      <SidePanels />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}