# 阶段运行机制

## StageRun

一次阶段工作不是临时页面状态，而是 `.sdd/runs/<runUid>.yaml` 中可提交的 `dsh-sdd/run@1` 记录。它固定关联一个阶段、一个 draft/in-review 交付件、一个 DSH Session，以及本次选择的上游交付件和原始来源。恢复运行时插件重新读取这些记录，在原 Session 上重新安装阶段运行约束并加载当前文件状态。

## AI 运行

用户开始绑定对话后，Host 在对应 Agent scope 注册该阶段完整的 System Prompt。System Prompt 固定角色、阶段目标、交付件路径、完成清单和结论落盘规则；输入材料作为首轮动态上下文进入同一持久 Session。每轮结束后客户端触发 `sync-run`，Host 重新读取文件并计算质量报告。显式“同步结论”会要求原 Session 重新梳理已确认结论并更新绑定交付件。

## 工具策略

需求、原型、系统设计和规格设计阶段禁止 shell 与可写终端操作，`write`/`edit` 只能访问绑定交付件目录。开发测试阶段允许 `bash`，但每次调用必须显式设置位于当前 `.sdd-workspaces` 绑定仓库内的 `workdir`；`write`/`edit` 只能访问绑定交付件或绑定代码目录。Guard 在工具执行前拒绝越权调用，提示词不是唯一约束。

## 输入门禁

开始对话前检查目标交付件阶段和状态、所选上游交付件是否 accepted、哈希是否有效，以及 `project.yaml` 中声明的 required 阶段是否已选择。任何必需输入缺失都会阻止创建或恢复运行。

## 质量与验收

每阶段定义必填 Markdown 二级章节和负责人验收清单。质量检查验证章节存在、内容非空、没有占位文本、必需输入追踪有效、Manifest 有效；开发测试阶段还要求隔离代码空间、独立提交、测试通过和干净工作区。验收清单必须由用户确认。所有门禁通过后才能把交付件标记为 accepted 并冻结内容哈希。

## 隔离开发空间

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

## 看板事实源

看板是只读投影。交付状态来自 `.sdd/artifacts`，需求和缺陷来自 `.sdd/sources`，会话运行来自 `.sdd/runs`，代码与测试来自 `.sdd/development` 和 Git，活动历史来自 `.sdd/events/*.jsonl`。外部 Provider 可在 `tracking` 中提供标准状态、优先级、严重性、负责人和工作量；缺失工作量时看板只展示事项数量，不推断工作量。
