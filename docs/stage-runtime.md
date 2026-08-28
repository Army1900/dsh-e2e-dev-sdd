# 阶段运行机制

## StageRun

一次阶段工作不是临时页面状态，而是 `.sdd/runs/<runUid>.yaml` 中可提交的 `dsh-sdd/run@1` 记录。它固定关联一个阶段、一个 draft/in-review 交付件、一个 DSH Session，以及本次选择的上游交付件和原始来源。恢复运行时插件重新读取这些记录，在原 Session 上重新安装阶段运行约束并加载当前文件状态。

## AI 运行

用户开始绑定对话后，Host 在对应 Agent scope 注册该阶段完整的 System Prompt。System Prompt 固定角色、阶段目标、交付件路径、完成清单、结论落盘规则和当前阶段 Markdown 模板；输入材料作为首轮动态上下文进入同一持久 Session。每轮结束后客户端触发 `sync-run`，Host 重新读取文件并计算质量报告。显式“同步结论”会要求原 Session 重新梳理已确认结论并更新绑定交付件。

五阶段模板在阶段页面通过“查看交付件模板”直接展示。页面预览、创建 `deliverable.md` 和 Agent System Prompt 使用 `protocol.ts` 中同一份定义，避免用户看到的格式与 AI 实际输出漂移。模板规定必填二级章节及填写说明，允许按项目增加三级章节、图表和附件引用。

## 工具策略

需求、原型、系统设计和规格设计阶段禁止 shell 与可写终端操作，`write`/`edit` 只能访问绑定交付件目录。开发测试阶段允许 macOS/Linux 的 `bash` 或 Windows 的 `pwsh`，但每次调用必须显式设置位于当前 `.sdd-workspaces` 绑定仓库内的 `workdir`；`write`/`edit` 只能访问绑定交付件或绑定代码目录。Guard 在工具执行前拒绝越权调用，提示词不是唯一约束。

## 输入门禁

开始对话前检查目标交付件阶段和状态、所选交付件是否 accepted、哈希是否有效，并要求工作单元至少选择一个当前来源或 accepted 交付件。默认 `workflow.mode: flexible` 不要求相邻阶段；用户可以把不需要的阶段标记为不适用。只有明确设置 `workflow.mode: strict` 时，才执行 `project.yaml` 中声明的 required 阶段门禁。

交付件属于需求工作单元时，输入还必须属于同一工作单元。需求再次同步发生变化后：需求讨论阶段必须引用最新子需求和需求包来源；后续阶段必须引用变更发生后重新接受的上游交付件。旧来源和旧 accepted 版本保留用于审计，但不能作为解除变更门禁的证据。外部已移除的工作单元在人工处理前禁止继续对话和验收。

## 质量与验收

每阶段定义必填 Markdown 二级章节和负责人验收清单。质量检查验证章节存在、剔除模板注释和三级标题后仍有实际内容、没有占位文本、必需输入追踪有效、Manifest 有效；开发测试阶段还要求隔离代码空间、独立提交、测试通过和干净工作区。验收清单必须由用户确认。所有门禁通过后才能把交付件标记为 accepted 并冻结内容哈希。

## 隔离开发空间

项目代码仓库目录与默认基线统一在“项目设置”维护。本地来源读取现有本地分支及 `origin` 远程跟踪分支，远程来源通过 `git ls-remote --symref` 读取远程分支和默认分支，再用下拉框选择基线。系统设计用 `repositoryScope` 确认可能涉及的仓库，规格设计用 `developmentTargets` 和 `developmentTargetDetails` 明确实际修改仓库及每仓具体目标；灵活流程跳过前置阶段时可在开发阶段补齐。隔离开发空间创建前可以切换基线或移除仓库；移除只修改 SDD 配置，不删除源代码。

本地仓库只有 `git init`、尚无任何提交时，页面可以在用户明确确认后自动创建 `chore: initialize repository` 空提交和初始分支。自动提交使用临时提交身份，不修改用户 Git 配置，也不会添加未跟踪文件；如果索引中已经存在暂存文件则拒绝执行，避免把用户文件意外纳入提交。空远程仓库涉及远程写入和认证，插件不自动 push，用户需要先显式初始化远程。

开发测试阶段不会直接在基线分支写代码。本地来源从所选基线提交创建 Git Worktree 和 `branchPattern` 定义的特性分支；远程来源在隔离目录克隆基线后创建同名特性分支。开发交付件的新修订继承同一工作单元的物理 Worktree 和特性分支，注册切换到新 artifact uid，旧测试证据因输入修订而失效。测试与提交都发生在特性分支，推送、创建合并请求以及合入基线是负责人显式执行的交付动作。

OpenSpec 是需求级可选增强，不是开发硬门禁。插件分别检查宿主机 CLI 和隔离 Worktree 中的配置目录；缺失时用户可以安装 CLI、执行官方 `openspec init --tools ...`，或关闭关联继续开发。初始化只准备 `openspec/config.yaml`、目录以及所选 AI 工具的 skills/commands，默认模板仍由 OpenSpec 安装包中的 `spec-driven` Schema 运行时解析，因此空的 `specs/` 与 `changes/` 是正常状态。初始化后插件展示 `openspec templates --json` 的解析位置；用户可执行 `openspec schema fork spec-driven <name>` 创建代码仓内可编辑、可提交的 Schema，并由插件执行校验。每个需求还需显式执行 `openspec new change <id> --schema <schema>` 创建 Change，之后 AI 才能维护 proposal/specs/design/tasks。插件不会自动提交或推送这些文件。

代码仓库在 `.sdd/project.yaml` 中配置：

```yaml
development:
  workspaceRoot: .sdd-workspaces
  branchPattern: sdd/{artifactKey}/{repositoryId}
  mergeStrategy: pull-request
  repositories:
    - id: web
      source: ../product-web
      baseBranch: main
```

`source` 指向本地 Git 仓库时使用 `git worktree add`；指向远程地址时使用单分支 clone。测试不在项目配置中枚举命令：用户点击“让 AI 验证”后，绑定开发会话读取规格、仓库构建文件和 CI 配置，自主选择并执行相关测试。正式测试调用必须使用 `SDD测试：` 描述标记；插件从真实 bash/pwsh 结果记录命令、退出码和当前代码指纹。代码变化会使旧证据过期，提交前必须存在当前通过证据；确实不适用时由用户填写原因跳过。提交操作只发生在隔离目录，执行前由用户确认；插件不 push、不创建 PR/MR、不合并。

开发页面只允许为当前工作单元 `developmentTargets` 中的仓库创建隔离空间。

## 看板事实源

看板是只读投影。交付状态来自 `.sdd/artifacts`，需求和缺陷来自 `.sdd/sources`，会话运行来自 `.sdd/runs`，代码与测试来自 `.sdd/development` 和 Git，活动历史来自 `.sdd/events/*.jsonl`。外部 Provider 可在 `tracking` 中提供标准状态、优先级、严重性、负责人和工作量；缺失工作量时看板只展示事项数量，不推断工作量。
