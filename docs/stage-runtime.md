# 阶段运行机制

## StageRun

一次阶段工作不是临时页面状态，而是 `.sdd/runs/<runUid>.yaml` 中可提交的 `dsh-sdd/run@1` 记录。它固定关联一个阶段、一个 draft/in-review 交付件、一个 DSH Session，以及本次选择的上游交付件和原始来源。恢复运行时插件重新读取这些记录，在原 Session 上重新安装阶段运行约束并加载当前文件状态。

## AI 运行

用户开始绑定对话后，Host 在对应 Agent scope 注册该阶段完整的 System Prompt。System Prompt 固定角色、阶段目标、交付件路径、完成清单、结论落盘规则和当前阶段 Markdown 模板；输入材料作为首轮动态上下文进入同一持久 Session。每轮结束后客户端触发 `sync-run`，Host 重新读取文件并计算质量报告。显式“同步结论”会要求原 Session 重新梳理已确认结论并更新绑定交付件。

五阶段模板在阶段页面通过“查看交付件模板”直接展示。页面预览、创建 `deliverable.md` 和 Agent System Prompt 使用 `protocol.ts` 中同一份定义，避免用户看到的格式与 AI 实际输出漂移。模板规定必填二级章节及填写说明，允许按项目增加三级章节、图表和附件引用。

## 工具策略

需求、原型、系统设计和规格设计阶段禁止 shell 与可写终端操作，`write`/`edit` 只能访问绑定交付件目录。开发测试阶段允许 macOS/Linux 的 `bash` 或 Windows 的 `pwsh`，但每次调用必须显式设置位于当前 `.sdd-workspaces` 绑定仓库内的 `workdir`；`write`/`edit` 只能访问绑定交付件或绑定代码目录。Guard 在工具执行前拒绝越权调用，提示词不是唯一约束。

## 输入门禁

开始对话前检查目标交付件阶段和状态、所选上游交付件是否 accepted、哈希是否有效，以及 `project.yaml` 中声明的 required 阶段是否已选择。任何必需输入缺失都会阻止创建或恢复运行。

交付件属于需求工作单元时，输入还必须属于同一工作单元。需求再次同步发生变化后：需求讨论阶段必须引用最新子需求和需求包来源；后续阶段必须引用变更发生后重新接受的上游交付件。旧来源和旧 accepted 版本保留用于审计，但不能作为解除变更门禁的证据。外部已移除的工作单元在人工处理前禁止继续对话和验收。

## 质量与验收

每阶段定义必填 Markdown 二级章节和负责人验收清单。质量检查验证章节存在、剔除模板注释和三级标题后仍有实际内容、没有占位文本、必需输入追踪有效、Manifest 有效；开发测试阶段还要求隔离代码空间、独立提交、测试通过和干净工作区。验收清单必须由用户确认。所有门禁通过后才能把交付件标记为 accepted 并冻结内容哈希。

## 隔离开发空间

系统设计负责人可以先在页面把本地路径或 Git 地址登记到项目代码仓库目录，再为当前工作单元确认 `repositoryScope`；规格设计负责人从该范围中确认 `developmentTargets`。规格设计还可以启用 OpenSpec，并记录其目标仓库和仓库内相对路径。OpenSpec 仍由代码仓独立维护，插件只把该位置作为规格和开发会话的明确上下文，不会自动改变五阶段交付结构。仓库范围或开发目标缺失时，相关阶段不能开始对话或验收。

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
      testCommands:
        - id: unit
          label: 单元测试
          argv: [pnpm, test]
        - id: typecheck
          label: 类型检查
          argv: [pnpm, typecheck]
```

`source` 指向本地 Git 仓库时使用 `git worktree add`；指向远程地址时使用单分支 clone。测试只能从 `testCommands` 中选择，使用 argv 且不经过 shell。提交操作只发生在隔离目录，执行前由用户确认；插件不 push、不创建 PR/MR、不合并。

开发页面只允许为当前工作单元 `developmentTargets` 中的仓库创建隔离空间。

## 看板事实源

看板是只读投影。交付状态来自 `.sdd/artifacts`，需求和缺陷来自 `.sdd/sources`，会话运行来自 `.sdd/runs`，代码与测试来自 `.sdd/development` 和 Git，活动历史来自 `.sdd/events/*.jsonl`。外部 Provider 可在 `tracking` 中提供标准状态、优先级、严重性、负责人和工作量；缺失工作量时看板只展示事项数量，不推断工作量。
