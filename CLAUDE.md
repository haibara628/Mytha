# Mytha — AI 小说创作系统

本地优先的 AI 辅助小说创作桌面应用：输入**背景 / 梗概 / 主要人物** → 自动生成**框架与提纲** → 逐章生成正文，全程保证**风格与逻辑一致**，所有设定/框架**可追溯、可调整**。

---

## 一、核心设计（目标形态，M0/M1/M2 已落地）

系统的本质难点：一本小说的信息量（世界观 + 人物 + 前情 + 伏笔 + 文风）远超模型上下文窗口。方案是**把创作状态外置为一份可查询、可版本化的「故事圣经 Story Bible」**，每次生成正文时只注入"当下需要的那部分"上下文。

三个子系统：

| 子系统 | 解决什么 | 手段 | 状态 |
|---|---|---|---|
| **状态层**（故事圣经） | 创作信息放哪 | 结构化 JSON 文件 + git 版本化 | ✅ |
| **组装层**（上下文引擎） | 每次生成给模型看什么 | 检索注入 + 分层摘要链 + 状态快照 | ✅ M2 |
| **校验层**（一致性守护） | 生成后不漂移 | 结构化规则（✅ M2）+ LLM-as-judge（待 M3）+ 修订/传播 | 部分 |

**一致性保障的关键机制**（实现进度）：

1. **分层摘要链**（滚动压缩）：场景摘要 → 章节摘要 → 全书主线摘要。✅ 已实现（`summaries/chapters.json`、`summaries/book.json`）。
2. **状态快照回写**：人物卡分 `static`（不变）与 `dynamic`（每章更新）。✅ 已实现——位置/持有物/已知信息/情绪/**人物关系**（`state/applyChanges.ts`）。
3. **伏笔台账**：每条伏笔状态机 `planted → advanced → revealed → resolved`。✅ 已实现——场景卡声明推进的伏笔，写完自动推进一格。
4. **文风卡 + 角色语声**：✅ 已实现注入——上下文组装器每次生成注入文风卡与出场人物卡（含 `voice` 字段）。
5. **上下文组装器 + 检索注入**：✅ 已实现（M2）——`context/assembler.ts` 组装：场景卡 + 出场人物状态快照 + 相关伏笔 + 检索命中的名词（`context/retrieve.ts` 关键词检索）+ 世界观/文风 + 上一章摘要 + 全书摘要。
6. **一致性校验**：✅ 结构化规则（M2，`review/consistency.ts`：引用完整性 / 状态变更引用 / 伏笔状态机合法）；语义级 LLM-as-judge 待 M3。
7. **引用图 + 版本化**：版本化已就绪（git）；引用图待 M3。

**人工确认点（human-in-the-loop）**：每个生成阶段后 UI 展示结果、用户可编辑，再进入下一阶段；阶段可重跑覆盖。

---

## 二、技术栈与关键决策

- **外壳**：Electron + electron-vite + React + TypeScript（环境无 Rust，排除 Tauri）。
- **核心引擎**：`src/core/` 纯 TS，**不依赖 Electron**，可被 vitest 单独测试、可被 `vite-node` 无 GUI 运行。
- **存储**：文件系统优先（人可读 JSON，按实体拆分），版本化 = **每项目一个 git 仓库自动 commit**（依赖系统 git）。
- **模型接入**：`LLMProvider` 接口 + `MockProvider`（确定性，无 API key 也可跑通，兼作测试 oracle）。真实 Anthropic provider 尚未实现（M3）。
- **校验**：`zod`（schema 与类型同源，`types.ts` 由 `schemas.ts` 经 `z.infer` 派生，避免漂移）。

---

## 三、目录结构（当前实际）

```
Mytha/
├── package.json / electron.vite.config.ts / tsconfig.json / vitest.config.ts
├── src/
│   ├── core/                       # 纯 TS 引擎（无 Electron 依赖）
│   │   ├── model/schemas.ts        #   zod schema（唯一真相源，含全部实体）
│   │   ├── model/types.ts          #   z.infer 派生的类型
│   │   ├── storage/projectStore.ts #   文件系统读写 + git 版本（bible/framework/outline/manuscript/summaries）
│   │   ├── storage/versioner.ts    #   git 封装（init/commit/log）
│   │   ├── llm/provider.ts         #   LLMProvider 接口（4 个领域方法）
│   │   ├── llm/deterministic.ts    #   确定性生成器（mock 参考实现 + 测试 oracle）
│   │   ├── llm/mock.ts             #   MockProvider
│   │   ├── llm/index.ts            #   getProvider() 工厂
│   │   ├── context/assembler.ts    #   上下文组装器（ChapterContext + assembleChapterContext）
│   │   ├── context/retrieve.ts     #   关键词检索（retrieveGlossary）
│   │   ├── review/consistency.ts   #   一致性校验（checkChapterConsistency → Finding[]）
│   │   ├── state/applyChanges.ts   #   状态快照回写（applyChapterStateChanges）
│   │   └── pipeline/workflow.ts    #   seed→world→framework→outline→manuscript 状态机
│   ├── main/index.ts               # Electron 窗口
│   ├── main/ipc.ts                 # IPC handlers（项目 CRUD + 4 阶段触发）
│   ├── preload/index.ts            # contextBridge 暴露 window.api
│   ├── shared/ipc.ts               # 跨进程通道名 + Api 类型（main/preload/renderer 共用）
│   └── renderer/src/               # React 三栏 UI
│       ├── App.tsx                 #   顶层状态（含 revision 触发章节视图刷新）
│       ├── components/Sidebar.tsx  #   左栏：项目树
│       ├── components/Wizard.tsx   #   右栏：新建项目 / 四阶段生成向导
│       ├── components/EditorPane.tsx # 中栏：实体编辑器（Selection 类型在此定义）
│       └── components/fields.tsx   #   通用表单字段
├── scripts/demo.ts                 # 无 GUI 端到端演示（vite-node 运行）
└── tests/                          # vitest：deterministic / storage / workflow / m1 / m2
```

---

## 四、数据模型（完整见 `src/core/model/schemas.ts`）

- **Project**：`{ id, name, slug, path, seed, createdAt, updatedAt }`
- **Seed**（用户输入）：`{ premise 背景, synopsis 梗概, characterSeeds: [{name, role?, description?}] }`
- **Bible**（故事圣经）：`{ world, characters[], plotThreads[], glossary[], style, locations[], factions[], items[], timeline[] }`
  - **World**：`{ era, rules[], powerSystem, geography, tone, background? }`
  - **Character**：`{ id, name, aliases[], static{role,traits[],background,goal,flaw}, dynamic{location,inventory[],relationships[],knowledge[],emotionalState}, arc{stage,nextBeat}, voice }`
  - **PlotThread**：`{ id, title, description, status, relatedCharacterIds[] }`
  - **StyleCard**：`{ pov, tense, tone, sentenceStyle, dialogueStyle, prohibitions[] }`
- **Framework**：`{ acts[], arcs[] }`
- **Outline**（提纲）：`{ chapters[]: { id, index, title, goal, summary, scenes[] } }`
  - **SceneCard**：`{ id, index, goal, conflict, turningPoint, characterIds[], plotThreadIds[], summary }`
- **ChapterManuscript**（正文）：`{ chapterId, scenes[]: {sceneId, content, summary}, stateChanges, findings[] }`
  - **ChapterStateChanges**：`{ characters[]: {characterId, location?, inventoryGained/Lost?, knowledgeGained?, emotionalState?, relationshipUpserts?[]}, plotThreads[]: {plotThreadId, status} }`
  - **Finding**（校验发现）：`{ severity: 'error'|'warning', rule, message, chapterId?, sceneId?, characterId?, plotThreadId? }`
- **ChapterContext**（非持久化，组装产物）：`{ chapter, characters, plotThreads, glossary, world, style, previousChapterSummary, bookSummary }`
- **ChapterSummary** / **BookSummary**（分层摘要链）

**存储布局**（`projects/<slug>/`，每实体一文件）：

```
project.json
bible/world.json
bible/characters/<id>.json
bible/plot_threads.json
bible/glossary.json
bible/style.json
bible/extras.json
framework/acts.json
framework/arcs.json
outline/outline.json
manuscript/<chapterId>.json        # 每章一文件（正文 + 状态变更 + 校验发现）
summaries/chapters.json            # 章节摘要数组
summaries/book.json                # 全书主线摘要
.git/                              # 自动 commit 的版本历史
```

---

## 五、当前状态（M0 + M1 + M2 已完成，2026-10-09）

**M0（地基）**：工程骨架、故事圣经数据模型、文件系统存储 + git 版本化、MockProvider、pipeline（world/framework）、三栏 UI。

**M1（内容生成）**：阶段2 提纲、阶段3 逐章正文、状态快照回写、分层摘要链、伏笔状态推进。

**M2（上下文组装 + 一致性）**：
- ✅ 上下文组装器 + 关键词检索（`context/assembler.ts` + `context/retrieve.ts`），`generateChapter` 改为接收组装后的 `ChapterContext`
- ✅ 一致性校验引擎（`review/consistency.ts`）：引用完整性 / 状态变更引用 / 伏笔状态机合法性，产出 `Finding[]`，随正文落盘
- ✅ **relationships 回写**：人物关系随正文生成回写圣经
- ✅ 伏笔面板状态汇总（埋下/推进中/揭晓/回收 + 「埋了未挖」提示）、章节校验结果展示、人物关系展示

**验证**：**测试 15/15 通过**、`typecheck` 通过、`build` 通过、端到端 demo（上下文注入「承接上章」+ 关系回写 + 一致性校验 + 12 次 git 提交）通过。

**M2 尚未做（诚实标注）**：
- 语义级 LLM-as-judge 校验未实现（当前仅确定性结构化规则；真实模型接入后补充）。
- 检索是关键词匹配，非向量检索（当前圣经体量下够用）。
- 正文仍是结构化标记（真实文笔需 M3 真实模型）。

**运行命令**：
- `npm test` — 核心引擎单测（无 GUI，无需 electron 二进制）
- `npx vite-node scripts/demo.ts` — 无 GUI 端到端演示
- `npm run typecheck` / `npm run build` — 类型检查 / 构建
- `npm install && npm run dev` — 完整安装（含 electron 二进制）后启动 GUI

---

## 六、待办路线图

### M3 — 追溯传播 + 语义校验 + 真实模型（下一步）
- **引用图 + 影响传播**：场景记录引用的设定 ID，改设定 → 反查受影响场景 → 标红 → 局部重写；按修改层级（专名/人物设定/框架/文风）决定重写范围。
- **LLM-as-judge 语义校验**：真实模型接入后，对比新正文 vs 圣经 + 前情摘要，产出语义级矛盾清单（时间线/地点/道具/设定违反）。
- **接入 Anthropic provider**：实现 `LLMProvider` 真实实现（结构化输出 + prompt 模板），工厂按 `ANTHROPIC_API_KEY` 切换；正文改为真实文笔。
- （可选）向量检索替代关键词检索；正文编辑器（CodeMirror）。

---

## 七、开发约定

- **类型只从 schema 派生**：新增实体先在 `schemas.ts` 加 zod schema，再在 `types.ts` 加 `z.infer` 导出，不要手写重复 interface。
- **core 层零 Electron 依赖**：引擎代码不得 `import 'electron'`；跨进程类型走 `src/shared/ipc.ts`。
- **存储以文件为真相源**：所有持久化经 `ProjectStore`，写入后调 git commit；不要绕过 store 直接写文件。
- **Mock 保持确定性**：`deterministic.ts` 内的函数不得引入 `Math.random`/`Date.now`（可作测试 oracle）。
- **状态回写是纯函数**：`applyChanges.ts` 不修改入参，返回新 Bible；业务逻辑放 core、不进 provider。
- **上下文组装与校验是纯函数**：`assembler.ts`/`consistency.ts` 无副作用，便于单测。
- **每阶段有确认点**：pipeline 阶段产出结构化结果落盘后返回给 UI 展示，不自动串联下游。
- **新增 IPC**：通道名加到 `shared/ipc.ts` 的 `IPC` 常量 + `Api` 接口，main/preload/renderer 三处同步。
