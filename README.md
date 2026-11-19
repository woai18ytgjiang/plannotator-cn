<p align="center">
  <img src=".github/assets/banner.webp" alt="Plannotator" width="640" />
</p>



<p align="center">
  <strong>批注并随时掌握智能体动态所需的一切</strong><br/>
  <strong>收件箱界面 • 产物 • 代码审查</strong><br/>
  <sub>批注计划、规格、Markdown、HTML 和其他可交互产物。审查差异与 PR。一键把反馈发送给你的智能体。</sub>
</p>

<p align="center">
  <img src=".github/assets/icons/amp.svg" alt="Amp" title="Amp" height="28" />&nbsp;&nbsp;
  <img src=".github/assets/icons/claude.svg" alt="Claude Code" title="Claude Code" height="28" />&nbsp;&nbsp;
  <img src=".github/assets/icons/codex.png" alt="Codex" title="Codex" height="28" />&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/icons/copilot-dark.svg" />
    <img src=".github/assets/icons/copilot-light.svg" alt="Copilot CLI" title="Copilot CLI" height="28" />
  </picture>&nbsp;&nbsp;
  <img src=".github/assets/icons/droid.png" alt="Droid" title="Droid" height="28" />&nbsp;&nbsp;
  <img src=".github/assets/icons/gemini.png" alt="Gemini CLI" title="Gemini CLI" height="28" />&nbsp;&nbsp;
  <img src=".github/assets/icons/kiro.svg" alt="Kiro" title="Kiro" height="28" />&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/icons/opencode-dark.svg" />
    <img src=".github/assets/icons/opencode-light.svg" alt="OpenCode" title="OpenCode" height="28" />
  </picture>&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/icons/pi-dark.svg" />
    <img src=".github/assets/icons/pi-light.svg" alt="Pi" title="Pi" height="28" />
  </picture>
</p>

<p align="center">
  <a href="#plannotator-inbox">Plannotator 收件箱</a> · <a href="https://plannotator.ai/">官方网站</a> · <a href="https://plannotator.ai/code-review">代码审查</a> · <a href="https://github.com/plannotator/effective-html">可视化 HTML 技能</a> · <a href="#herdr-annotate-plannotator-in-the-terminal">Herdr Annotate</a> · <a href="https://www.youtube.com/watch?v=a_AT7cEN_9I">（旧版）计划模式</a>
</p>

# Plannotator

> **本仓库是社区维护的非官方简体中文分支（unofficial Simplified Chinese fork）**
>
> - 上游项目：[backnotprop/plannotator](https://github.com/backnotprop/plannotator)，本分支基点 commit `a931eec265677682aaa33adf5b673ed69fa2f209`（Plannotator `0.29.0`）。
> - 许可与版权：沿用上游许可（仓库根 MIT OR Apache-2.0；`packages/core`、`packages/ui` 等发布包为 Apache-2.0；第三方组件见各自 NOTICE），上游版权归原作者所有。完整说明见 [`ATTRIBUTION.md`](ATTRIBUTION.md)。
> - 本分支只做简体中文汉化（界面 + 文档），改动清单见 [`CHANGES.zh-CN.md`](CHANGES.zh-CN.md)，本地部署与汉化说明见 [`docs/zh-CN/本地部署与汉化说明.md`](docs/zh-CN/本地部署与汉化说明.md)。
> - **本 README 是上游 README 的完整中文翻译（结构保持一致）；中文化范围、已知问题与特定用法见下文 [「中文化说明（本分支）」](#zh-cn-notes)。**
> - 非官方版本，不代表上游项目或作者背书；Plannotator 名称与标识的权利归其权利人。

**⭐️ 新功能：** [Plannotator 收件箱](https://plannotator.ai/inbox/) 是你与多智能体协作之间缺失的评审层。它把决策、原型、变体、计划，以及你需要掌握的一切呈现出来。适用于所有编码智能体和个人助手。

Plannotator 是面向 AI 编码智能体的本地浏览器评审界面：Claude Code、Codex、Copilot CLI、Gemini CLI、OpenCode、Kiro、Droid、Amp、DeepSeek Harness 和 Pi。Plannotator 收件箱同样适用于个人助手（Grok Bot、Muse、Hermes、OpenClaw）。

**它通过插件、hook 和命令直接接入你的智能体。** 当智能体提出一个决策、计划、HTML，或完成工作时，应用会在你的浏览器中打开，你可以标注、评论，并直接把反馈发送给智能体去执行。

<table>
<tr>
<td width="40%" valign="middle">

### 评审文档、计划和智能体消息

批注计划、规格、消息、HTML，然后把反馈发送给智能体。

</td>
<td width="60%">

<img src=".github/assets/annotate.webp" alt="带行内批注的 Annotate 界面" width="100%" />

</td>
</tr>
<tr>
<td width="40%" valign="middle">

### 代码审查

审查本地改动或远程 PR。对差异评论、建议代码。你的评论会回到智能体。支持 Git、GitButler、Jujutsu（`jj`）、Perforce（`p4`）、GitHub 和 GitLab。

改动很大时，可以启动[引导式审查](https://plannotator.ai/code-review#guided-review)：由智能体把差异按章节整理，最重要的排在最前。

</td>
<td width="60%">

<img src=".github/assets/review.webp" alt="带文件树和并排差异的代码审查" width="100%" />

</td>
</tr>
</table>

<a id="plannotator-inbox"></a>

## Plannotator 收件箱

<p align="center">
  <a href="https://plannotator.ai/inbox/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/inbox-dark.webp" />
      <img src=".github/assets/inbox-light.webp" alt="桌面和手机上的 Plannotator 收件箱：来自多个智能体的话题按各自需要什么分组，列表旁边打开着一个带图片选项的问题，手机上还有一个带图表的附件问题" width="720" />
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://plannotator.ai/assets/inbox-film.mp4"><strong>观看演示</strong></a> · <a href="https://plannotator.ai/inbox/">收件箱更多介绍</a> · <a href="https://plannotator.ai/docs/reference/inbox/">文档</a>
</p>

Plannotator 收件箱是一个本地窗口：智能体继续工作的同时，把消息、问题、文件和引导式审查留在这里。点一下就能回答问题、批注文件，有空时按「发送」。整个过程不会挂住任何智能体会话，你的回复会回到最初提问的那个会话。

```
plannotator inbox
```

Claude Code、Pi 和 OpenCode 通过 Plannotator 的插件接入，你的回复会作为它们的下一轮输入到达。其他任何智能体都可以通过 MCP 使用 `plannotator inbox mcp` 接入，而 `plannotator inbox --help` 就是智能体阅读的说明。

<a id="herdr-annotate-plannotator-in-the-terminal"></a>

## Herdr Annotate：终端里的 Plannotator

<p align="center">
  <a href="https://github.com/plannotator/herdr-annotate">
    <img src=".github/assets/herdr-annotate-banner.svg" alt="Herdr Annotate" width="300" align="middle" />
  </a>
  &nbsp;&nbsp;
  <img src=".github/assets/herdr-annotate.png" alt="Plannotator TUI 在终端里批注一个 Markdown 文件夹" width="480" align="middle" />
</p>

[Herdr Annotate](https://github.com/plannotator/herdr-annotate) 把 Plannotator 风格的评审带到终端：在 [Herdr](https://herdr.dev) 里批注终端文本、审查整份 Markdown 文档和编码智能体的回复，并把反馈直接作为下一条消息发回给智能体。支持 Claude Code、Codex、Pi、Copilot CLI 和 Droid 的回复。批注保存在 Plannotator 数据目录中，因此终端评审与应用评审会相互累积。

```
herdr plugin install plannotator/herdr-annotate
```

更喜欢独立使用？[Plannotator TUI](https://github.com/plannotator/plannotator-tui) 提供文档评审能力，无需 Herdr 也能运行：`brew install plannotator/tap/plannotator-tui`。

## HTML 产物、实时站点与引导式审查

<table>
<tr>
<td width="40%" valign="middle">

### 批注 HTML 产物和实时站点

批注渲染后的 HTML 文件，或任何在本机运行的站点。本地地址会通过本地代理实时打开你的应用：你在真实页面上评论，热更新照常工作。

`plannotator annotate http://localhost:5173`

</td>
<td width="60%">

<img src=".github/assets/html.webp" alt="批注渲染后的 HTML 产物" width="100%" />

</td>
</tr>
<tr>
<td width="40%" valign="middle">

### 引导式审查

在代码审查中按 **Guide**（或 `Cmd/Ctrl+Shift+G`），智能体会把差异整理成章节：先讲改动的核心，再讲影响，最后讲衔接部分。每一章都会在实际差异旁边给出简短概览。你在那里留下的评论会和其余审查反馈一起回到智能体。[了解引导式审查](https://plannotator.ai/code-review#guided-review)

</td>
<td width="60%">

<img src=".github/assets/guided-review.webp" alt="一个引导式审查章节：左侧是改动概览，右侧是可批注的差异" width="100%" />

</td>
</tr>
</table>

---

## 命令

<sub>在 Codex 上，把斜杠命令换成 `!plannotator …`（例如 `!plannotator review`）或 `$plannotator-*` 技能。</sub>

### 批注

```
/plannotator-annotate README.md                  # 本地 Markdown 文件
/plannotator-annotate src/                       # 浏览并批注文件夹中的文件
/plannotator-annotate https://docs.rs/…          # 抓取并批注任意 URL
/plannotator-annotate report.html --render-html  # 按原样渲染 HTML 而不是转换
/plannotator-last                                # 批注智能体最后一条消息
```

想要一份贴近真实的文档来试试？把[产品需求文档模板与填写示例](https://docs.plannotator.ai/templates/product-requirements-document)复制为 Markdown。

### 代码审查

```
/plannotator-review                    # 审查未提交的改动
/plannotator-review <github-pr-url>    # 审查 GitHub 拉取请求
/plannotator-review <gitlab-mr-url>    # 审查 GitLab 合并请求
plannotator review --gitbutler         # 审查一个活动的 GitButler 工作区
plannotator review --patch-file reading.diff # 审查调用方提供的静态 unified diff
```

GitButler 用户可以审查整个工作区、单个技术栈（stack）或单个分支层。见 [GitButler 工作流指南](https://docs.plannotator.ai/open-source/workflows/gitbutler)。

### 计划模式

不需要任何命令。计划模式通过各宿主（harness）的 hook 接入。智能体每次生成计划时，Markdown 评审界面都会自动为你打开。

### CLI

```
plannotator sessions                   # 列出活动的 Plannotator 会话
plannotator sessions --open 1          # 在浏览器中重新打开某个会话
plannotator archive                    # 只读浏览已保存的计划决策
```

---

## 内置 AI

对你正在评审的任何内容向 AI 提问，或发起 AI 审查让它把评论直接发到差异上。

---

## 分享

把计划作为一个链接发出去。队友批注后，你导入他们的反馈给你的智能体。

小型分享内容直接放在链接里。较大的分享会在上传前加密，并在 7 天后过期。任何拿到完整链接的人都能读取。用 `PLANNOTATOR_SHARE=disabled` 关闭分享。[分享的工作方式](https://docs.plannotator.ai/open-source/workflows/sharing)

<p align="center">
  <a href="https://plannotator.ai/workspaces">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/workspaces-dark.png" />
      <img src=".github/assets/workspaces-light.png" alt="Plannotator Workspaces：多个光标在同一个共享空间中协作" width="720" />
    </picture>
  </a>
</p>

<p align="center">
  面向团队：<a href="https://plannotator.ai/workspaces"><strong>加入 Workspaces 候补名单</strong></a>
</p>

---

## 安装

一个安装器几乎覆盖所有智能体。它会安装 `plannotator` 二进制、自动检测你已安装的智能体，并为每个智能体配置 hook、技能和斜杠命令：

```bash
# macOS / Linux / WSL
curl -fsSL https://plannotator.ai/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://plannotator.ai/install.ps1 | iex
```

安装器会从 GitHub Releases 下载二进制。完整安装还可能访问 GitHub 以解析 release 和智能体文件，以及 npm 来安装 Pi、选定的额外技能或受管的智能体终端运行时。固定 `--version` 只会跳过 GitHub API 的 release 解析，不会跳过 release 下载。完整的网络边界见[隐私政策](https://plannotator.ai/privacy)。

只想要二进制、不要其他东西？传 `--minimal`（或导出 `PLANNOTATOR_MINIMAL=1`），只把 `plannotator` 二进制安装到 `~/.local/bin`，跳过所有技能、hook、斜杠命令和按智能体区分的配置：

```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --minimal
```

然后完成你这个智能体对应的步骤：

| 智能体 | 安装器之后 | 详情 |
|---|---|---|
| **Amp** | 把 [`plannotator.ts`](apps/amp-plugin/plannotator.ts) 复制到 `~/.config/amp/plugins/`，然后执行 `plugins: reload`。工作流在命令面板里。 | [README](apps/amp-plugin/README.md) |
| **Claude Code** | `/plugin marketplace add backnotprop/plannotator`，然后 `/plugin install plannotator@plannotator`。重启 Claude Code。 | [README](apps/hook/README.md) |
| **Codex** | 无需操作。计划评审会通过 Codex 实验性的 `Stop` hook 自动启用（macOS/Linux/WSL；在原生 Windows 上，Codex hook 仍属实验性，安装器会打印手动配置步骤）。已包含 `$plannotator-review`、`$plannotator-annotate` 和 `$plannotator-last` 技能。 | [README](apps/codex/README.md) |
| **Copilot CLI** | `/plugin marketplace add backnotprop/plannotator`，然后 `/plugin install plannotator-copilot@plannotator`。重启。计划评审会在计划模式（`Shift+Tab`）下激活。 | [README](apps/copilot/README.md) |
| **DeepSeek Harness** | 在 DSH 的 Plugins 页面添加 `@plannotator/dsh`，或运行 `dsh plugin --profile <profile> add @plannotator/dsh`。计划评审在 `exit_plan_mode` 时打开。该插件会添加 `/plannotator-review`、`/plannotator-annotate` 和 `/plannotator-last`，打开时不阻塞会话。 | [README](apps/dsh-plugin/README.md) |
| **Droid** | `droid plugin marketplace add https://github.com/backnotprop/plannotator`，然后 `droid plugin install plannotator@plannotator`。仅支持命令，暂不支持计划拦截。 | [README](apps/droid-plugin/README.md) |
| **Gemini CLI** | 无需操作。hook、策略和斜杠命令会自动配置。需要 Gemini CLI 0.36.0+。 | [README](apps/gemini/README.md) |
| **Kiro CLI** | 无需操作。技能和示例智能体会自动安装。试试 `kiro-cli chat --agent plannotator`。 | [README](apps/kiro-cli/README.md) |
| **OpenCode** | 在 `opencode.json` 中添加 `"plugin": ["@plannotator/opencode@latest"]`。重启 OpenCode。 | [README](apps/opencode-plugin/README.md) |
| **Pi** | 跳过安装器。直接 `pi install npm:@plannotator/pi-extension`。以 `--plan` 启动 Pi，或用 `/plannotator-plan-mode` 切换。 | [README](apps/pi-extension/README.md) |
| **T3 Code** | 针对 T3 中的 Claude 话题：运行 `plannotator t3 --help` 并按其中的两步操作（先登录一次 T3，再添加 `--t3` MCP 条目）。之后你的收件箱回复会作为新一轮输入到达该话题。 | [README](packages/t3-code/README.md) |

**更新：** 重新运行安装器即可更新二进制和斜杠命令。当 `claude` 命令在 PATH 中时，它还会更新已安装的 Claude Code 插件（用 `--skip-claude-plugin` 跳过）；否则依次运行 `claude plugin marketplace update plannotator`、`claude plugin update plannotator@plannotator`，然后重启 Claude Code（只刷新 marketplace 不会更新插件）。Pi：用 `pi update --extensions`（只运行 `pi update` 只会更新 Pi 本身）。

在 Claude Code 2.1.287 或更新版本上，计划评审、代码审查和批注不会让 Claude 等待：Claude 结束本轮，你的决定稍后作为消息到达。设置 `PLANNOTATOR_CLAUDE_MOD=0` 可以回到经典流程。

完整演练见[安装文档](https://docs.plannotator.ai/open-source/start/installation)。

### 卸载

安全的默认行为会移除已被识别、由 Plannotator 安装的组件，同时保留你的本地计划、历史、草稿、引导（guide）和设置：

```bash
plannotator uninstall
```

用 `--purge` 可以同时完整移除已知的本地 Plannotator 数据：

```bash
plannotator uninstall --purge
```

<details>
<summary>卸载会移除什么、保留什么，以及什么时候会停下</summary>

`--purge` 要求在提示符处输入 `purge`，并会说明这些数据只存在本机：它不存储在 Plannotator 服务器上，也无法恢复。用于自动化时传 `--yes`（或 `-y`）；不带该参数的非交互式移除会拒绝运行。可用 `--dry-run` 预览将被处理的内容而不做任何改动。宿主集成始终是卸载的一部分。如果某个损坏或不可用的宿主妨碍了安全清理，命令会指明阻塞的插件管理器或配置，给出精确的手动清理步骤，并在删除二进制之前停止。完成清理后重新运行卸载即可。

在某个智能体的配置文件无法读取（其他工具的文件同理），或者一个并非由它安装的 hook 仍在运行 Plannotator 时，它也会保留二进制。错误信息会指出文件、工具以及该做什么。由你自己添加的 `plannotator-inbox` 条目，或为某个项目安装的 Claude Code / Droid 插件，会被列出并说明如何移除，且不会因此保留二进制。

这些机制让常规确认默认是否定的，让不可逆的结果需要更强的明确措辞，同时仍为包管理器和脚本提供符合惯例的非交互式开关。

该命令覆盖 macOS、Linux、WSL 和 Windows 的常规二进制位置；受管的 `sem` sidecar 和智能体终端运行时；安装器写入的技能、命令、hook、策略、缓存和可识别的 Amp/Kiro 文件；以及通过各宿主 CLI 检测到的 Claude Code、Copilot CLI、Droid、Pi 和 VS Code 安装。共享的 JSONC 设置会以最小改动方式编辑，而严格 JSON 更新会保留文件的缩进、行尾和末尾换行风格。自定义或无法识别的文件、单独安装的可选技能、项目本地集成、外部计划保存位置和无效配置会被保留（格式错误的宿主配置会触发安全失败）。如果清理报告错误，CLI 仍可安全重试；在可能的情况下，它的 Windows PATH 条目会被保留或恢复。如果 PATH 恢复本身失败，输出会给出完整的 CLI 路径供重试，并要求手动修复 PATH。

出于安全考虑，purge 会拒绝文件系统根目录、主目录、共享临时目录、符号链接的数据目录以及非目录的数据路径。现有路径按文件系统身份比较，因此大小写别名、符号链接、硬链接和绑定挂载都无法绕过根目录/主目录/祖先目录检查。该身份与每一项包含性保护都会在等待宿主命令之后、同步数据删除块之前重新校验；被替换的数据目录会被拒绝，旧数据和新数据都不会被触碰。如果你的专用数据目录是符号链接，请把 `PLANNOTATOR_DATA_DIR` 指向其解析后的目标再重试。

</details>

如果你只安装了独立的 Pi 扩展而没有 `plannotator` CLI，请使用 `pi remove npm:@plannotator/pi-extension`。

<details>
<summary>Claude Code：手动配置 hook（不使用插件系统）</summary>

添加到 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "plannotator",
            "timeout": 345600
          }
        ]
      }
    ]
  }
}
```

</details>

<details>
<summary>固定到特定版本</summary>

```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --version vX.Y.Z
```

```powershell
& ([scriptblock]::Create((irm https://plannotator.ai/install.ps1))) -Version vX.Y.Z
```

</details>

### 试一试

了解 Plannotator 能做什么最快的方式，就是现在就通过你的智能体亲自调用它：

```
/plannotator-last                   # 批注智能体的最后一条回复
/plannotator-review                 # 以 PR 风格审查你当前的差异
/plannotator-annotate report.html   # 批注任意文件、文件夹或 URL
```

（大多数智能体里是斜杠命令；Codex 里是 `$plannotator-*` 技能，Amp 里是命令面板。）

计划评审完全不需要命令。下次你的智能体提出计划时，它会自动在浏览器中打开。

---

## 工作原理

### 计划评审

```
智能体调用 ExitPlanMode
  -> 触发 PermissionRequest hook
  -> 本地服务从 hook 输入中读取计划
  -> 浏览器打开评审界面
  -> 你批注并批准/拒绝
  -> 批准：智能体继续执行
  -> 拒绝：结构化反馈发送给智能体
  -> 智能体修改后，计划差异展示改了什么
```

### 代码审查

```
你运行 /plannotator-review
  -> git diff 捕获改动（或通过 URL 抓取 PR）
  -> 浏览器打开差异查看器
  -> 批注行、暂存/取消暂存文件
  -> 发送反馈：返回到智能体会话
  -> 批准：发送 "LGTM"
```

---

## 集成

**VS Code**：在编辑器标签页中打开计划、内联查看差异、从编辑器行号栏添加批注。从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=backnotprop.plannotator-webview) 安装。

**Obsidian**：把已批准的计划自动保存到仓库（vault），带 YAML frontmatter、来自计划标题的标签，以及用于图谱连接的 backlinks（反向链接）。在 Plannotator 的设置面板中配置。

**Bear**：把计划保存为 Bear 笔记，带嵌套标签和项目元数据。

**Notion**：把计划保存为共享 Notion 页面下的 Markdown 子页面。在启动 Plannotator 的环境中设置 `NOTION_TOKEN`，然后在设置中配置父页面。

**GitHub / GitLab**：把任意 PR 或 MR URL 传给 `/plannotator-review`，即可用完整的差异查看器、批注和文件树来审查它。

---

## 远程 / SSH / devcontainer

Plannotator 会自动检测 SSH 会话，并切换到固定端口 `19432`。如需其他端口，或在 devcontainer / Docker 中：

```bash
export PLANNOTATOR_REMOTE=1
export PLANNOTATOR_PORT=9999  # 转发这个端口
```

VS Code devcontainer 会自动转发端口（见 Ports 标签页）。对于裸 SSH，在 `~/.ssh/config` 中添加以下内容；如果你设置了 `PLANNOTATOR_PORT`，请使用你的端口值：

```
Host your-server
    LocalForward 19432 localhost:19432
```

在远程模式下，服务器会监听所有网络接口（`0.0.0.0`）且不需要登录，因此只要能访问该端口的人都能使用它，即使用 SSH 隧道也是如此。请不要把该端口暴露给你不信任的网络。

---

## 安全

每个发布的二进制都附带 SHA256 校验文件。自 v0.17.2 起提供 [SLSA provenance](https://slsa.dev/) 证明。当前的 release 工作流还会附带 CycloneDX JSON SBOM，在任何内容被证明或发布前用全新的 Grype 数据库评估它，并为发布的二进制和 npm tarball 创建 GitHub/Sigstore SBOM 证明。

SBOM 被有意标注为对整个 monorepo 锁定构建输入与依赖的 release 级 Syft 清单，而不是逐二进制的精确运行时清单：Bun 独立可执行文件不会向 Syft 暴露其打包的 JavaScript 包元数据。规范的[安装与验证文档](https://docs.plannotator.ai/open-source/start/installation#pin-or-verify-a-release)覆盖了现有的安装器路径；下面给出的准确的新 SBOM 命令必须复制到那个 Mintlify 页面，然后才能进行第一次启用 SBOM 的发布。

发布门禁会拒绝扫描器侧被忽略的匹配项，并在评估 CISA KEV 和可修复的 Critical 发现时，把未知适用性保守地视为运行时。其明确的 Grype 配置、完整 JSON 结果、数据库状态和仓库策略决定都会作为工作流证据保留。

要直接验证已发布的 Linux x64 二进制、其现有 provenance 以及新的 SBOM 证据：

```bash
tag=vX.Y.Z
version="${tag#v}"
mkdir -p /tmp/plannotator-release-verify
gh release download "$tag" --repo backnotprop/plannotator \
  --pattern 'plannotator-linux-x64*' \
  --pattern "plannotator-${version}-release-sbom.cdx.json*" \
  --dir /tmp/plannotator-release-verify

(cd /tmp/plannotator-release-verify && sha256sum --check plannotator-linux-x64.sha256)
(cd /tmp/plannotator-release-verify && sha256sum --check "plannotator-${version}-release-sbom.cdx.json.sha256")

gh attestation verify /tmp/plannotator-release-verify/plannotator-linux-x64 \
  --repo backnotprop/plannotator --source-ref "refs/tags/$tag" \
  --signer-workflow backnotprop/plannotator/.github/workflows/release.yml \
  --predicate-type https://slsa.dev/provenance/v1

gh attestation verify /tmp/plannotator-release-verify/plannotator-linux-x64 \
  --repo backnotprop/plannotator --source-ref "refs/tags/$tag" \
  --signer-workflow backnotprop/plannotator/.github/workflows/release.yml \
  --predicate-type https://cyclonedx.org/bom
```

这些是针对同一产物摘要的独立声明：provenance 标识其构建者/源码/工作流，而 CycloneDX 断言描述整个 release 的清单。发布 runbook 还会用 `jq -S` 规范化下载的 SBOM 与已证明的断言，并比较两者。

安装时验证：

```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --verify-attestation
```

这需要 `gh` CLI，但不需要登录：安装器从 GitHub 公开的 attestations API 获取证明包，并用 `gh attestation verify --bundle` 验证它（提取过程需要 PATH 中有 node、python3 或 jq；gh 的认证获取是兜底方案）。也可以在 `~/.plannotator/config.json` 中持久设置：

```json
{ "verifyAttestation": true }
```

安装器验证仍然是可选项，验证的是 SLSA 构建来源；常规安装不需要 `gh`。详见[安装文档](https://docs.plannotator.ai/open-source/start/installation#pin-or-verify-a-release)。

---

## 配置

设置保存在 cookie（而非 localStorage）中，因为每次 hook 调用都运行在随机端口上。你也可以通过环境变量或 `~/.plannotator/config.json` 设置选项。

### 可选的 Vim 控制

计划和批注界面在 **设置 → Vim** 下提供一个默认关闭的 **Vim 控制**配置。启用后，把焦点放到文档上，用 `j` / `k` 一次移动一个渲染块。用 `l` 细化到语义层级后，`j` / `k` 在同级行、单元格或行内目标之间移动；`h` 回到包含它的上级目标。细化到最深目标之后再往里就进入文本。`v` 开始按字符的 Visual 选择，`V` 选择整块。`Space` 打开常规批注工具栏；`c`、`d`、`m`、`t` 分别选择评论、删改（redline）、标注（markup）和标签动作。同一套语义目标图同时驱动指针 Pinpoint 和键盘导航。在文档中按 `?` 查看上下文键位参考。输入框、对话框、编辑器、`Tab` 以及所有指针交互都保留原生行为。当页面没有其他焦点时，文档会自动获得焦点；在应用外壳中按 `Escape` 即可回到文档，无需点击。

在 Vim 控制下方还有一个默认关闭的 **Vim HUD** 开关。它使用产品演示风格的实时目标准星和导航上下文。其右下角的 **按键面板** 可以单独隐藏而准星保持活动；`?` 仍然可以按需打开完整键位表。面板显示最近处理过的按键、当前块/行/词/Visual 阶段，以及命令含义，同时不会捕获你在评论或其他控件中输入的文本。

交互契约与实现架构见 [Vim 控制](docs/vim-controls.md)。

| 变量 | 说明 |
|---|---|
| `PLANNOTATOR_REMOTE` | `1`/`true` 为远程模式，`0`/`false` 为本地，未设置时自动检测 SSH |
| `PLANNOTATOR_PORT` | 固定端口（默认：本地随机，远程为 `19432`） |
| `PLANNOTATOR_BROWSER` | 用于打开计划的自定义浏览器。`none`（以及 `false`、`0`、`off`、`no`、`true`、`1`、`:`）完全不打开浏览器；会话 URL 始终会打印。 |
| `PLANNOTATOR_AI` | 设为 `disabled` 可禁用 Ask AI、Review Agents 和引导式审查；批注的智能体终端是独立开关 |
| `PLANNOTATOR_SHARE` | 设为 `disabled` 可关闭 URL 分享 |
| `PLANNOTATOR_SHARE_URL` | 分享链接的自定义基础 URL（自托管 portal） |
| `PLANNOTATOR_PASTE_URL` | paste 服务 API 的基础 URL |
| `PLANNOTATOR_ORIGIN` | 覆盖智能体检测：`claude-code`、`amp`、`droid`、`opencode`、`codex`、`copilot-cli`、`gemini-cli`、`kiro-cli`、`pi` |
| `PLANNOTATOR_JINA` | `0`/`false` 可禁用用于 URL 批注的 Jina Reader |
| `JINA_API_KEY` | Jina Reader API key，用于更高的速率限制 |
| `PLANNOTATOR_DATA_DIR` | Plannotator 管理文件（计划、历史、草稿、`config.json`）的基础目录。默认：`~/.plannotator`；如果该目录不存在且 `$XDG_DATA_HOME` 被设为绝对路径，则改用 `$XDG_DATA_HOME/plannotator`（当 `~/.plannotator` 不含任何 Plannotator 数据而 XDG 目录有时，也如此）。`plannotator data-dir` 会打印当前使用的目录 |

Plannotator 管理的文件默认位于 `~/.plannotator` 下。部分 UI 偏好保存在功能性浏览器 cookie 中。要迁移这些文件（例如为了符合 XDG 规范的 home 目录）：

```bash
export PLANNOTATOR_DATA_DIR=~/.local/share/plannotator
```

---

## 开发

```bash
bun install

bun run dev:hook       # 计划评审服务
bun run dev:review     # 代码审查编辑器
bun run dev:marketing  # 营销站点（plannotator.ai）
bun run dev:vscode     # VS Code 扩展（watch 模式）
```

### 构建

```bash
bun run build          # 主要目标（hook + opencode + dsh）
bun run build:hook     # hook 服务的单文件 HTML
bun run build:review   # 代码审查编辑器
bun run build:opencode # OpenCode 插件
bun run build:dsh      # DeepSeek Harness 插件
bun run build:vscode   # VS Code 扩展
```

构建顺序很重要。hook 构建会复制 `apps/review/dist/` 中已构建好的 HTML。如果你修改了 `packages/ui/`、`packages/editor/` 或 `packages/review-editor/` 中的 UI 代码，请先重新构建 review 应用：

```bash
bun run --cwd apps/review build && bun run build:hook
```

在本地测试插件：

```bash
claude --plugin-dir ./apps/hook
```

完整二进制构建：

```bash
bun run --cwd apps/review build && bun run build:hook && \
  bun build apps/hook/server/index.ts --compile --outfile ~/.local/bin/plannotator
```

---

<a id="zh-cn-notes"></a>

## 中文化说明（本分支）

> 本节只属于本中文分支，上游 README 没有对应内容。中文化覆盖范围、已知问题与特定用法都集中在这里；更详细的本地部署步骤见 [`docs/zh-CN/本地部署与汉化说明.md`](docs/zh-CN/本地部署与汉化说明.md)，逐文件改动见 [`CHANGES.zh-CN.md`](CHANGES.zh-CN.md)，许可与来源见 [`ATTRIBUTION.md`](ATTRIBUTION.md)。

### 中文化范围

- **界面**：计划评审、文档批注、代码审查、Plannotator 收件箱、设置面板、首次进入的公告弹窗、toast 通知、错误提示、空状态、键盘快捷键说明等，均已改为简体中文。
- **CLI / 服务端**：终端里用户可见的启动提示、错误、会话列表、端口占用、浏览器打开失败、更新/卸载提示等已中文化（机器可解析的契约串除外，见下）。
- **文档**：本 README（上游 README 的完整中文翻译，结构保持一致）、`docs/zh-CN/` 下的部署说明、术语表、翻译规范，以及 `ATTRIBUTION.md` / `CHANGES.zh-CN.md`。
- **规模**：相对上游基点修改约 670 个源码文件、8,000+ 行中文文案（估算 4,500–5,000 条）；`packages/core` 与 `packages/ui` 中每个被改文件顶部均带 `Modified 2026-11-19 … see ATTRIBUTION.md` 提示。

### 已知问题与风险

1. **上游测试会失败（预期）**：上游有大量测试断言英文界面文案（按钮、toast、aria 等），中文化后这些「文案断言」用例必然失败。功能逻辑、类型检查、构建不受影响；本分支**没有修改任何测试文件**。如果你要向上游提 PR，需要就测试策略与上游维护者沟通。
2. **有意保留英文的内容**：`--help` / usage 大段帮助文本（面向智能体的用法文档）；传给智能体的提示词、反馈模板、hook 注入文本；品牌名与技术标识（Plannotator、Claude Code、GitHub、MCP、API、Markdown 等）；代码、路径、命令、环境变量、URL、模型名、按键名；计划/评论/差异等用户数据；产品演示录屏与示例内容；日期时间格式（仍为 en-US，如 `Oct 3`、`8:22 AM`）。
3. **机器契约必须保持英文**：例如 `SESSION_READY_LINE_PREFIX`（`Plannotator session ready:`）、JSON 字段、`status`/`kind`/`type` 等逻辑值、与浏览器交互的值（`Files`、`historyUndo`、`toolName`）。这些一旦被翻译会破坏 hook、插件或 DSH 集成；升级上游合并时尤其要检查。
4. **少量深层 UI 仍有英文（不影响主流程）**：例如收件箱的 Cloudflare 设置表单、Combine 对话框、少数屏幕阅读器 aria 文案；代码审查里仍有 `sem` 这类紧凑徽章。欢迎提 PR 继续补。
5. **合并上游的冲突风险**：中文化改了大量文案文件，`git merge upstream/main` 可能产生大量冲突，且未来上游改同一批文案时冲突更明显。建议以「保留中文」为原则逐文件合并，合并后重跑构建与类型检查。
6. **编译二进制的 Bun 版本**：上游建议用 Bun ≥ 1.4.4 编译发布二进制（涉及 TLS 信任链）；本分支本地编译用的是 Bun 1.3.14，仅用于本机环回场景，不代表可发布的构建产物。要发布二进制请先升级 Bun 再编译。
7. **版本号未改**：仍为上游 `0.29.0`，便于对比；如果你要发布自己的 npm 包，请自行升版本号并确认包名/命名空间。
8. **GitHub 语言统计与搜索**：中文化会改变仓库语言占比和代码搜索命中（大量中文字面量），属正常现象。

### 特定使用方法（本分支）

**构建与运行**

```powershell
# 构建（顺序不能反；Windows 上 build:hook 需要更大堆）
$env:NODE_OPTIONS = "--max-old-space-size=8192"
bun run --cwd apps/review build
bun run build:hook

# 全局命令（源码运行，改完即生效）
bun link
plannotator --help

# 或直接运行源码入口
bun bin/plannotator.js review
```

- 开发预览：`bun run dev:hook`（计划评审，端口 3000）与 `bun run dev:review`（代码审查，端口 3001），使用内置演示数据，适合先看界面。
- 生产使用：先构建（上面两步），再运行 `plannotator` 命令；hook/插件会话读取的是构建产物。
- Windows 上 `build:hook` 内存不足（`JavaScript heap out of memory` / exit 134）时，务必先设 `NODE_OPTIONS`。

**DeepSeek Harness（DSH）集成**

```powershell
# 1) 构建并本地安装插件
bun run build:dsh
dsh plugin --profile desktop add link:<仓库路径>/apps/dsh-plugin

# 2) 编译独立 CLI（不依赖 bun 在 PATH）
bun build apps/hook/server/index.ts --compile --outfile "$env:LOCALAPPDATA\plannotator\plannotator.exe"
```

- 在 DSH profile 的 `cordis.patch.yml` 中把 `id: plannotator` 的 `binary` 指向上面的 exe，并确保 `planReview: true`；计划评审需要 DSH 的 `plan-mode` 插件启用（否则不会有 `exit_plan_mode`）。
- 打开 DSH 收件箱工具（可选，会让每次请求多一个工具定义）：`~/.plannotator/config.json` 写入 `{ "inboxTool": { "dsh": true } }`，**重启 DSH 后生效**。
- 验证插件链路：`{"plan":"# 测试计划"} | plannotator dsh-plan`，在打开的页面点「批准」，CLI 会输出 `{"approved":true,...}`。

**收件箱首次运行的副作用**

`plannotator inbox` 首次运行会把收件箱接入本机已安装的编码智能体（例如改写 Codex / Gemini CLI / Cursor / Qwen Code 的 MCP 配置），输出里会列出连接了哪些。如果不想这样，启动前设置 `PLANNOTATOR_INBOX_CONNECT=0`；需要清理时运行 `plannotator uninstall`（先加 `--dry-run` 预览）。

**恢复英文 / 对照上游**

```bash
# 查看某个文件的上游原文
git show a931eec265677682aaa33adf5b673ed69fa2f209:packages/ui/components/Viewer.tsx

# 把某个文件恢复成上游英文版
git checkout a931eec265677682aaa33adf5b673ed69fa2f209 -- <文件路径>

# 查看全部中文化改动
git diff a931eec265677682aaa33adf5b673ed69fa2f209..HEAD --stat
```

---

## 许可证

Copyright 2025-2026 backnotprop

根据你的选择，在 [Apache 2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 下双许可发布。

除非你明确另行声明，贡献同样按上述条款双许可。
