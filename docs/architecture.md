# DSH E2E Dev SDD 架构

## 产品边界

插件提供五个独立阶段工作台，不提供自动跑完全流程的流水线。每次运行只处理一个阶段：选择输入、对话迭代、生成交付件、人工接受、Git 提交。

| 阶段 | 默认必选输入 | 默认可选输入 | 标准输出 |
| --- | --- | --- | --- |
| 需求讨论 | 无 | 对话、文件、外部来源 | `requirement-spec` |
| 原型输出 | 需求 | 外部设计资料 | `prototype-spec` |
| 系统设计 | 需求 | 原型 | `architecture-spec` |
| 规格设计 | 需求、系统设计 | 原型 | `implementation-spec` |
| 开发测试 | 规格设计 | 需求、原型、系统设计 | `development-delivery`、代码、测试证据 |

依赖规则是项目配置，不写死在 Client 页面。

## 项目真源

一个 DSH Workspace 对应一个项目 Git 仓库。一个主业务编号形成需求包，每个可独立交付的子需求形成工作单元；工作单元共享项目配置，但拥有独立五阶段交付件和开发空间。可审计状态全部位于 `.sdd/`：

```text
.sdd/
├── project.yaml
├── templates/<stage>/
│   ├── template.yaml
│   └── deliverable.md
├── artifacts/<stage>/<artifact>/
│   ├── manifest.yaml
│   ├── deliverable.md
│   └── .template/              # 创建交付件时固定的模板快照
├── sources/
├── imports/pending/<preview>.yaml
├── work-items/<uid>/
│   ├── work-item.yaml
│   └── artifacts/<stage>/<artifact>/
├── business/
│   ├── README.md
│   ├── connectors/
│   └── adapters/
├── runs/
├── development/
└── events/
```

Host 通过 DSH Workspace registry 校验 `workspaceId`，浏览器不能直接指定任意宿主路径。浏览器只发送 Workspace ID 和领域动作。

## SDD 项目仓库协作

外层 Workspace Git 仓库负责共享 `.sdd/`、模板和交付状态，与开发阶段绑定的目标代码仓库相互独立。`project.yaml` 的 `collaboration` 配置 remote、协作基线、同步策略和提交范围。页面读取本地分支、upstream、ahead/behind、暂存、未跟踪和冲突文件；Fetch 可以直接执行，自动同步只使用干净工作区上的 `merge --ff-only`。分支分叉和 Git 冲突不会被自动合并。项目提交默认只暂存 `.sdd/` 与 `.gitignore`，Push 必须由用户显式确认。

交付件关系始终使用 UUID，`REQ/UX/ARCH/SPEC/DEV` key 只是显示编号。并行分支合并后若不同 UID 血缘使用同一 key，项目状态会报告编号冲突：尚未绑定会话、开发空间或修订血缘的草稿可以保留原前缀并追加 UID 短后缀；任何已验收血缘冲突都需要人工决定，不能静默重编号。

## 身份与编号

编号分为三层，不能相互替代：

- `uid` 是插件生成的不可变技术身份。
- 交付件 `key` 是插件生成的阶段编号，固定采用 `REQ/UX/ARCH/SPEC/DEV` 前缀和项目内四位递增序号。
- 企业需求号、子需求号、缺陷号是 Source/Work Item 的外部编号，由人工录入或 Source Provider 原样返回。

企业编号通过来源引用和追踪关系关联到工作单元及交付件，不参与交付件编号分配。父子关系和追踪关系必须引用 UID 或带命名空间的外部引用，禁止从编号字符串推导领域关系。`project.key` 只是当前本地 SDD 工作空间的标识，初始化时默认取目录名，也不是企业需求编号。

Git-only 的并行分支无法安全分配全局连续序号，所以模板序号只是便捷显示值；冲突由校验器拒绝，内部 UUID 不受影响。

## 来源归一化

所有对话、文件、CLI、MCP 和外部系统内容统一转换成 `dsh-sdd/source-bundle@1`，其中 `items` 至少包含一个 `source@1`：

```text
manual/CLI/MCP provider -> Source/Bundle -> change preview -> work item -> AI synthesis -> draft artifact -> human acceptance
```

Connector 只提供来源，不直接创建 accepted 交付件。命令型 Connector 使用 stdin JSON / stdout JSON，命令以 argv 数组存储，凭证只从声明的环境变量读取。统一目录解析器合并插件 `business/` 与项目 `.sdd/business/`，两处使用相同 Connector 和 Adapter 文件格式；项目同名配置覆盖插件配置，并在页面标明来源。

内置 `manual` Provider 不需要 Connector。用户只填写标题、初始描述和可选的多行子项，Provider 将其归一化为同一个 `source-bundle@1` 协议；信息不完整是允许的，需求讨论阶段的 Agent 负责追问并把确认结论写入正式交付件。

再次导入同一需求包即为同步。核心按 `provider + kind + externalKey` 匹配工作单元，比较来源内容、标题、状态和版本，预览新增、修改、移除、无变化四类结果。应用变更会新增来源快照而不覆盖历史版本；已有 accepted 交付件保持冻结，工作单元进入 `change-pending`，相关阶段必须使用最新来源和重新接受的上游交付件完成评审。外部移除进入 `removed-pending`，负责人可以保留本地继续推进或归档工作单元；两种操作都不会删除历史文件。

导入预览正文按条目从 `.sdd/imports/pending/` 延迟读取，避免大需求包一次性进入浏览器响应。缺陷执行归属不由 Provider 推断：项目看板入口写入 `executionMode: standalone`；需求内入口写入 `executionMode: attached` 和 `parentWorkItemUid`。旧工作单元没有 `executionMode` 时按 `standalone` 读取，因此旧项目和旧适配器无需迁移。需求内缺陷仍拥有独立 Source 和 Work Item，用于外部编号、状态与再次同步，但不进入五阶段交付矩阵；其当前来源会自动加入父需求的候选输入和修订差异。

企业通用业务代码和配置统一位于插件 `business/`，项目专用代码和配置统一位于 `.sdd/business/`。两处都把 Connector YAML 放入 `connectors/`，被调用的脚本及其内部模块放入 `adapters/`；Connector 中的 `.sdd/business/adapters/` 是逻辑路径，运行时映射到实际生效范围。项目代码不得再散落到 `.sdd/scripts/`、仓库根目录或其他 SDD 状态目录。

## 阶段对话

Client 根据用户为当前工作单元自由选择的来源和 accepted 交付件向 Host 请求阶段输入。默认灵活模式把五个阶段视为可选能力，只有严格模式才应用项目声明的 required 依赖；不需要的阶段记录为 `not-applicable`，不生成占位交付件。Host 读取固定版本内容并生成阶段提示；`StageRun` 固定绑定 Session、目标交付件及实际依赖，Agent scope 安装阶段 System Prompt 和工具 Guard。

## 交付件生命周期

```text
draft -> in-review -> accepted -> superseded
```

交付件目录是一个多文件包。accepted 时冻结除 Manifest 外的全部文件清单和整包哈希；从 accepted 创建修订前先比较来源、上游交付件和模板的版本及哈希。上游无差异时必须提供用户主动调整原因，不能创建无证据修订。新修订复制完整目录，记录 `supersedes`、结构化 `revision` 和 `previousRunUid`；新版本验收后旧版本进入 superseded，引用旧上游哈希的下游版本自动进入待重审状态。详细规则见 `docs/artifact-package.md`。

Agent 可以创建和修改 draft；接受动作必须由用户从阶段页面触发。接受时 Host 校验 manifest 和入口文件，并记录内容哈希。accepted 版本需要修订时创建新版本，不能原地覆写。

## 需求开发空间

阶段代码目录统一收束在已加入 `.gitignore` 的 `.sdd-workspaces/`：

- `.repositories/<repository-id>.git` 保存远程仓库唯一一份 bare 对象缓存；本地仓库不复制对象。
- `.references/<repository-id>/<commit>/` 保存非开发阶段按需复用的 Detached 只读参考。
- `<artifact-key>/<repository-id>/` 保持现有开发目录，使用特性分支 Worktree。

需求、原型、系统设计和规格设计会话默认获得项目登记的全部仓库，不再逐阶段选择。每次运行在 `.sdd/runs` 固定记录仓库、基线 Commit、实际路径和可用状态；无仓库时不生成 `codeReferences`，旧项目运行逻辑不变。远程参考准备失败不会阻止非开发阶段，开发目标仓库不可用仍按开发门禁阻止。
- 一个开发单元可以包含多个仓库。
- Agent Session 保持项目空间 cwd；代码工具的 `workdir` 被 Guard 限定到绑定的隔离 checkout。
- 开发会话显式获得每个仓库的根目录和开发目标，并在修改前读取仓库内 `AGENTS.md`、构建/CI 配置及匹配的 `.agents/skills/*/SKILL.md`；嵌套 Skill 不依赖自动出现在外层会话目录。
- 同一工作单元的开发交付件修订复用物理 checkout 和特性分支，但创建新的 artifact 注册并使旧测试证据失效。
- 代码提交到目标仓库；SDD 仓库只保存 commit、PR、merge commit 和测试证据。

合并策略支持 `pull-request`、`local-merge` 和 `manual`，默认 `pull-request`。

## UI 兼容性

DSH 当前侧边栏没有第三方多入口导航 slot。插件采用 dsh-web 已验证的 DOM 注入和独立中央面板模式，集中管理项目看板、五阶段工作台和项目设置入口。所有 DOM 写入都有插件属性标识并随 Cordis effect 卸载。后续 DSH 提供正式导航 slot 时，应迁移到 slot，而不改变领域协议。

## 已实现的运行层

- `StageRun` 持久绑定阶段、交付件、输入和 DSH Session。
- Agent scope System Prompt 和工具执行 Guard。
- 阶段输入门禁、结构质量报告、人工验收清单和 accepted 哈希冻结。
- 开发阶段 Worktree/clone、AI 驱动测试、真实执行证据与本地提交门禁。
- 项目看板与 append-only 事件日志。
- 看板统计以独立交付工作单元为五阶段分母；需求内缺陷只进入父需求的缺陷覆盖指标。服务端按工作单元、阶段和来源建立内存索引，客户端对交付矩阵先筛选再限制为 200 行，避免项目规模增长后重复全表扫描和过量 DOM 渲染。

## 后续边界

- Git push、PR/MR 与 merge gate 需要独立的、带用户确认的远程写能力。
- MCP Source Provider 和可写外部系统能力。
- 交付件显式 superseded 关系和业务侧变更回写。
- 基于事件日志的按日趋势图和周期时间统计。
