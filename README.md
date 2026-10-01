# Reader Modern

基于 `Roc2Liu/reader` 的现代化 Web 重构版。

## 与原项目的关系

原项目是一个原生 HTML/CSS/JS TXT 阅读器，包含 TXT 导入、章节解析、阅读进度、IndexedDB、字体/排版设置等功能。

这个版本不再修改原项目文件，而是将这些核心能力重新实现为：

- React 19
- TypeScript
- Vite
- Zustand
- Dexie / IndexedDB
- Web Worker 章节解析
- 窗口化正文渲染
- 响应式 UI
- 本地数据导入/导出
- 自定义字体
- 纸白 / 暖纸 / 深色 / OLED 主题

## 启动

需要 Node.js 20+。

```bash
npm install
npm run dev
```

浏览器打开终端显示的地址。

生产构建：

```bash
npm run build
npm run preview
```

## 目录

- `src/components/Reader.tsx`：正文阅读与窗口化渲染
- `src/components/Toolbar.tsx`：顶部/底部阅读控制
- `src/components/SidePanels.tsx`：书架、目录、设置
- `src/workers/parser.worker.ts`：章节解析 Worker
- `src/services/importer.ts`：TXT 文件读取与编码处理
- `src/db.ts`：Dexie / IndexedDB
- `src/store.ts`：Zustand 阅读状态

## 下一阶段建议

1. 增加 EPUB.js / 原生 EPUB 渲染
2. 增加全文搜索 Worker + 索引
3. 增加书签与笔记
4. 增加真正的段落虚拟列表（目前采用轻量窗口化）
5. 增加 PWA / 离线安装
6. 增加拖拽排序书架

### 沉浸式控制栏
顶部和底部控制栏默认隐藏；鼠标靠近屏幕边缘、或点击正文可呼出。滚动时自动隐藏，控制栏出现时预留底部安全空间，避免遮挡正文。

### v3 细腻化阅读
本版重点不是增加 UI，而是降低 UI 存在感：控制栏更轻、滚动时隐藏、阅读区上下留白随视口变化、提供无衬线/衬线两种正文风格，并降低高对比度、阴影和边框。

### v4 滚动手感
这一版把“滚动帧”和“阅读进度状态”解耦：滚动时不再每一帧触发 React 状态更新；阅读位置按段落阈值同步、进度按时间间隔保存。新进入视口的段落使用 IntersectionObserver 做一次轻微渐显，避免整页同时动画。

### v8 排版系统
优化中文字体、阅读宽度、字号与行距联动，降低网页感，增强长时间阅读舒适度。

### v9 章节连续体验
优化章节切换的连续感：章节进入使用轻量过渡，并提前触达相邻章节内容，减少切换时的断层感。
