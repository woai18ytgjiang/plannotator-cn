# 来源、版权与许可声明 / Attribution, Copyright & Licensing

本仓库（下称“本分支”）是开源项目 **Plannotator** 的**非官方简体中文分支（fork）**，仅用于界面中文化，与上游项目及其作者无隶属或背书关系。

This repository is an **unofficial Simplified Chinese localization fork** of the open-source project **Plannotator**. It is not affiliated with, endorsed by, or sponsored by the upstream project or its authors.

---

## 1. 上游项目 / Upstream

| 项目 | 内容 |
|---|---|
| 名称 | Plannotator |
| 上游仓库 | https://github.com/backnotprop/plannotator |
| 本分支基点 commit | `a931eec265677682aaa33adf5b673ed69fa2f209`（上游 `main`，提交信息：`Merge pull request #3710 from backnotprop/feat/inbox-agent-status-marks`） |
| 上游版本 | `0.29.0` |
| 上游版权 | Copyright 2025-2026 **backnotprop** |
| 上游许可 | **MIT OR Apache-2.0**（二选一），见 [`LICENSE-MIT`](LICENSE-MIT) 与 [`LICENSE-APACHE`](LICENSE-APACHE)（两个文件均原样保留） |

本分支完整保留了上游的 Git 提交历史与作者署名，未改写历史、未删除版权声明。

## 2. 本分支的修改 / Changes in this fork

修改日期：**2026-11-19**。改动的完整清单、数量与逐包统计见 [`CHANGES.zh-CN.md`](CHANGES.zh-CN.md)；与上游的精确差异可用：

```bash
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD --stat
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD --name-only
```

摘要：

- **界面简体中文化**：把面向用户的英文界面文案就地改为简体中文（计划评审、文档批注、代码审查、收件箱、设置、通知/弹窗、CLI 提示等），不改变功能逻辑。
- **少量非文案改动**（均为中文化所需）：
  - `packages/core/product-feedback.ts` 新增导出常量 `FEEDBACK_MESSAGE_REQUIRED`，供 CLI 与服务端复用同一条中文提示（消除重复字符串）。
  - `packages/review-editor/components/treeLabels.ts` 新增文件：为第三方文件树组件 `@pierre/trees` 传入中文标签。
  - `apps/mobile/contract/words/words.json` 与 `.../generated/swift/Words.swift` 由仓库自带生成脚本 `bun scripts/mobile/words.ts` 重新生成。
  - `apps/hook/index.html`、`apps/review/index.html`、`apps/inbox/*.html`：`lang` 改为 `zh-CN`，页面标题中文化。
  - 新增中文文档与截图：`docs/zh-CN/`、本文件、`CHANGES.zh-CN.md`。
- **未修改**：上游的任何 `LICENSE*`、`NOTICE`、第三方许可文件；未修改测试文件；未提交构建产物（`dist/` 等已在 `.gitignore` 中）。

## 3. 许可适用（按目录） / License per directory

| 目录 / 范围 | 适用许可 | 说明 |
|---|---|---|
| 仓库根目录及其它未被下面列出的内容 | **MIT OR Apache-2.0**（与上游一致） | 本分支的修改与新增内容同样按此双许可发布，不添加额外限制。 |
| `packages/core/`、`packages/ui/` | **Apache-2.0** | 上游这些包 `package.json` 声明 `Apache-2.0`，各自附有 Apache-2.0 全文 `LICENSE`。本分支修改过的每个此类文件顶部均带 `Modified 2026-11-19 ... see ATTRIBUTION.md` 提示（满足 Apache-2.0 §4(b) 的“修改文件显著提示”要求）。 |
| `packages/references/`、`packages/system/` | **Apache-2.0** | 上游声明；本分支**未修改**，许可文件原样保留。 |
| `apps/vscode-extension/` | **MIT**，Copyright (c) 2025 **7tg** | 本分支**未修改**；其 `LICENSE` 原样保留。 |
| `packages/vendor-pierre-layouts/upstream/` | **Apache-2.0**，Copyright 2025 **Pierre Computer Company** | 第三方 `@pierre/layouts` 的未修改副本；见 `NOTICE` 与 `upstream/LICENSE.md`。 |
| `vendor/pierre-diffs/pierre-diffs-*.tgz` | **Apache-2.0**（Pierre） | `@pierre/diffs` 的定制构建，属第三方；来源、基点与改动见 `vendor/pierre-diffs/FORK.md`。 |
| `packages/inbox/assets/icon-sets/` | 各自条款：CC BY 3.0 / CC0 / OFL 与 Apache 待上游澄清 | **不属于**本仓库的 MIT/Apache 许可；见该目录 `NOTICE` 与各 `LICENSE.md`、`CREDITS.md`。本分支未修改。 |
| `packages/inbox/assets/rows-intro/` 中的第三方 logo | **商标**，不在本仓库许可范围内 | 仅作示例展示，不授予任何使用许可；见该目录 `NOTICE`。本分支未修改。 |
| `apps/marketing/public/fonts/paper-mono/` | **SIL OFL 1.1** | Paper Mono / Geist Mono 字体；见其 `LICENSE.txt`。本分支未修改。 |
| 第三方 npm 依赖（`node_modules/`） | 各自许可 | 不随本仓库提交（`node_modules/` 已被 `.gitignore` 忽略），安装后适用各包自身许可证。 |

## 4. 本分支修改/新增内容的许可 / License of this fork's changes

- `packages/core/`、`packages/ui/` 内被修改的文件：**Apache-2.0**（作为上游 Apache-2.0 作品的衍生修改）。
- 其余被修改的文件与新增文件（含 `docs/zh-CN/`、`ATTRIBUTION.md`、`CHANGES.zh-CN.md`、`packages/review-editor/components/treeLabels.ts`）：**MIT OR Apache-2.0**，与上游双许可一致，可由接收方二选一。
- 本分支未对上游作品增加任何与 MIT / Apache-2.0 冲突的额外限制（Apache-2.0 §4(f)）。

## 5. 第三方组件与例外 / Third-party components and exceptions

本仓库包含若干不属于仓库自身 MIT/Apache 许可的第三方材料，其许可与出处均在对应目录内保留（本分支未修改、未删除）：

- `packages/inbox/assets/icon-sets/NOTICE` 与各 `LICENSE.md`：game-icons（CC BY 3.0）、Tiny Creatures（CC0）、Dungeon Crawl（CC0）、Noto Emoji 3D（上游许可状态见 `noto-3d/LICENSE.md`）。
- `packages/inbox/assets/rows-intro/NOTICE`：第三方项目 logo 为各自商标，不随仓库许可授权。
- `packages/vendor-pierre-layouts/NOTICE` + `upstream/LICENSE.md`：Apache-2.0（Pierre）。
- `vendor/pierre-diffs/FORK.md`：`@pierre/diffs` 定制构建，Apache-2.0（Pierre）。
- `apps/marketing/public/fonts/paper-mono/LICENSE.txt`：SIL OFL 1.1。
- `apps/vscode-extension/LICENSE`：MIT，Copyright (c) 2025 7tg。
- 根 `patches/`：上游对第三方依赖的补丁（补丁内容属仓库自身许可；被补丁的依赖适用其自身许可）。

## 6. 商标与非官方声明 / Trademarks and unofficial status

- **Plannotator** 的名称、标识与相关品牌资产归其权利人（backnotprop）所有。MIT / Apache-2.0 许可**不授予商标权**（Apache-2.0 §6）。本分支仅为社区汉化，**不是官方版本**，请勿以官方名义宣传或暗示背书。
- 上游 README 与界面中出现的第三方名称、图标（Claude Code、GitHub、VS Code、Obsidian、Notion 等）为各自权利人的商标，仅作事实性引用。
- 本仓库文档中的界面截图展示的是本分支运行时的界面，其中第三方商标仍归各自权利人。

## 7. 再分发检查清单 / Redistribution checklist

如果你再分发本分支（源码或构建产物），请保持：

1. [`LICENSE-MIT`](LICENSE-MIT)、[`LICENSE-APACHE`](LICENSE-APACHE) 及所有子包 `LICENSE` 原文；
2. 本 `ATTRIBUTION.md` 与 [`CHANGES.zh-CN.md`](CHANGES.zh-CN.md)；
3. 各第三方 `NOTICE` / `LICENSE` / `CREDITS` 文件；
4. `packages/core/`、`packages/ui/` 中修改文件的 `Modified ...` 文件头提示（继续修改这些文件时，保留并更新提示）；
5. 上游版权声明（`Copyright 2025-2026 backnotprop` 等）不得删除或改写为他人所有。

## 8. 上游与联系 / Upstream and contact

- 上游源码与问题反馈：https://github.com/backnotprop/plannotator
- 本分支仅处理中文化相关问题；如涉及上游功能、安全或许可，请以上游仓库为准。
