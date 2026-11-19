# 本分支改动说明 / Changes in this fork

- 改动日期：**2026-11-19**
- 上游基点：`a931eec265677682aaa33adf5b673ed69fa2f209`（上游 `main`，Plannotator `0.29.0`）
- 上游仓库：https://github.com/backnotprop/plannotator
- 许可与来源声明：见 [`ATTRIBUTION.md`](ATTRIBUTION.md)

## 1. 改动范围与规模

相对上游基点：

- 修改 **669** 个已跟踪文件，**新增 4 个文件/条目**（`docs/zh-CN/`、`packages/review-editor/components/treeLabels.ts`、`ATTRIBUTION.md`、`CHANGES.zh-CN.md`，以及 `docs/zh-CN/screenshots/` 下的截图）。
- 代码行变化（不含新增文件）：**+8,457 / −8,208**。
- 绝大多数改动是**面向用户界面文案的替换**（英文 → 简体中文），不改变功能逻辑。

按目录统计（已修改的已跟踪文件）：

| 目录 | 文件数 | 主要内容 |
|---|---:|---|
| `packages/inbox/` | 261 | 收件箱窗口：侧栏、列表、话题、撰写框、设置、决策/看板/PR/搜索/导览等 |
| `packages/ui/` | 149 | 共享 UI：阅读器、批注面板/工具栏、评论、设置、弹窗、通知、文件树/差异组件等 |
| `packages/review-editor/` | 144 | 代码审查界面：工具栏、文件树、差异视图、提交对话框、PR 面板、空状态等 |
| `packages/shared/` | 26 | 共享逻辑中的用户提示（回环探测、批注目标、浏览器意图、端口占用、更新提醒、差异标签等） |
| `apps/hook/` | 25 | CLI 与服务端用户提示（计划/审查/批注/收件箱命令、会话列表、更新、卸载等） |
| `packages/server/` | 21 | 本地服务端会显示在界面的错误/提示文案 |
| `packages/editor/` | 19 | 计划评审外壳与组件、快捷键、文档标题模板等 |
| `packages/core/` | 17 | 收件箱类型/投递行/行动项/卡片列/问题词表等展示文案 |
| `apps/inbox/` | 3 | 收件箱页面外壳（`lang`、标题） |
| `apps/mobile/` | 2 | 移动端词表生成产物（由仓库自带脚本生成） |
| `apps/review/` | 2 | 代码审查页面外壳（`lang`、标题） |

## 2. 非“纯文案”的改动（全部为中文化所需）

1. `packages/core/product-feedback.ts`：新增导出常量 `FEEDBACK_MESSAGE_REQUIRED`（内容为一条中文提示），`feedbackInputError()` 与 CLI/服务端改为引用它，避免同一条文案在多份实现中漂移。
2. `packages/review-editor/components/treeLabels.ts`（新增）：为第三方文件树组件 `@pierre/trees` 传入中文标签（搜索框、右键菜单、Git 状态提示等）。
3. `apps/mobile/contract/words/words.json`、`apps/mobile/contract/generated/swift/Words.swift`：用仓库自带脚本 `bun scripts/mobile/words.ts` 重新生成（因上游常量被中文化）。
4. `apps/hook/index.html`、`apps/review/index.html`、`apps/inbox/index.html`、`apps/inbox/surface.html`、`apps/inbox/shape.html`：`<html lang>` 改为 `zh-CN`；`<title>` 中文化。
5. 新增 `docs/zh-CN/`：本地部署与汉化说明、术语表、翻译规范、界面截图。
6. `packages/core/` 与 `packages/ui/` 中每个被修改的文件顶部新增一行 `Modified 2026-11-19 ... see ATTRIBUTION.md` 提示（Apache-2.0 §4(b) 要求；不改变代码行为）。

## 3. 未包含在提交中的内容

- 构建产物（`apps/hook/dist/`、`apps/review/dist/`、`apps/*/dist/` 等，均被 `.gitignore` 忽略）。
- 本机部署产生的外部文件：`%LOCALAPPDATA%\plannotator\plannotator.exe`（编译的 CLI）、`~/.plannotator/`（运行数据）、DSH profile 配置（`~/.dsh/profiles/...`）等，均不在仓库内。
- 未修改任何测试文件；未修改上游 `LICENSE*`、`NOTICE`、第三方许可文件。

## 4. 验证情况

- 类型检查：`packages/ui`、`packages/inbox`、`packages/core`、`packages/shared`、`apps/hook/tsconfig.server.json` 均为 **0 错误**；`packages/review-editor` 保持在改动前基线（120 条预存在错误，无新增）。
- 构建：`bun run --cwd apps/review build`、`bun run build:hook` 均成功（Windows，Bun 1.3.14，需 `NODE_OPTIONS=--max-old-space-size=8192`）。
- 实际运行验证：计划评审、代码审查、文档批注、收件箱、DSH 插件调用 `plannotator dsh-plan` 的完整链路均通过。
- 测试：上游测试中**断言英文界面文案**的用例会失败，这是中文化的预期结果（功能逻辑与类型/构建不受影响）。上游测试文件本身未被修改。
- 版本号：保持上游 `0.29.0` 未改动，以便与上游对比；如需把自己发布的包与上游区分，可自行调整 `version`。

## 5. 如何查看逐文件差异

```bash
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD --stat
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD --name-only
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD -- packages/core packages/ui
```
