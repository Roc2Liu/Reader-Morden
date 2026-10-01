# 从 Roc2Liu/reader 迁移

原项目的 3 个文件保持不动；本项目是独立重构。

功能对应关系：
- TXT 导入 -> `src/services/importer.ts`
- 章节识别 -> `src/workers/parser.worker.ts`
- 阅读进度 -> `src/db.ts` + `src/store.ts`
- 字体/排版 -> `src/components/SidePanels.tsx`
- 章节导航 -> `src/components/SidePanels.tsx`
- 阅读渲染 -> `src/components/Reader.tsx`
- 数据备份 -> `src/components/SidePanels.tsx`

注意：原项目已有 IndexedDB 数据不能直接当作 Dexie 数据库使用；如果需要无损迁移旧数据，可以在下一版增加专用 migration。
