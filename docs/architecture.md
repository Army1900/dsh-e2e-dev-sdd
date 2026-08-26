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

一个 DSH Workspace 对应一个 Git 仓库。可审计状态全部位于 `.sdd/`：

```text
.sdd/
├── project.yaml
├── artifacts/<stage>/<artifact>/
│   ├── manifest.yaml
│   └── deliverable.md
├── sources/
├── business/
│   ├── README.md
│   ├── connectors/
│   └── adapters/
├── runs/
├── development/
└── events/
```

Host 通过 DSH Workspace registry 校验 `workspaceId`，浏览器不能直接指定任意宿主路径。浏览器只发送 Workspace ID 和领域动作。

## 身份与编号

每个交付件的 `uid` 是不可变内部身份。`key` 是项目显示编号，可以由模板、人工、外部系统或脚本提供。父子关系和追踪关系必须引用 UID 或带命名空间的外部引用，禁止从 `1.2.3`、`REQ-001` 等显示字符串推导领域关系。

Git-only 的并行分支无法安全分配全局连续序号，所以模板序号只是便捷显示值；冲突由校验器拒绝，内部 UUID 不受影响。

## 来源归一化

所有对话、文件、CLI、MCP 和外部系统内容先转换成 `dsh-sdd/source@1`：

```text
source provider -> Source Envelope -> schema validation -> AI synthesis -> draft artifact -> human acceptance
```

Connector 只提供来源，不直接创建 accepted 交付件。命令型 Connector 使用 stdin JSON / stdout JSON，命令以 argv 数组存储，凭证只从声明的环境变量读取。

项目级业务代码和配置统一位于 `.sdd/business/`。Connector 配置放入 `connectors/`，被调用的脚本及其项目内模块放入 `adapters/`；不得再散落到 `.sdd/scripts/`、仓库根目录或其他 SDD 状态目录。

## 阶段对话

Client 根据用户选择的 accepted 交付件向 Host 请求阶段输入。Host 读取固定版本内容并生成阶段提示；Client 通过 `ctx.workspaces.connectWorkspace()` 连接原生 Session，再调用 Session 的 `prompt()`。`StageRun` 固定绑定 Session 和目标交付件，Agent scope 安装阶段 System Prompt 和工具 Guard；每轮完成重新计算质量。对话历史用于协作，仓库交付件才是正式结果。

## 交付件生命周期

```text
draft -> in-review -> accepted -> superseded
```

Agent 可以创建和修改 draft；接受动作必须由用户从阶段页面触发。接受时 Host 校验 manifest 和入口文件，并记录内容哈希。accepted 版本需要修订时创建新版本，不能原地覆写。

## 需求开发空间

开发测试阶段在 `.sdd-workspaces/<artifact-key>/` 创建隔离 checkout，该目录加入 `.gitignore`：

- 当前代码仓库使用 Git Worktree。
- 外部代码仓库使用独立 clone。
- 一个开发单元可以包含多个仓库。
- Agent Session 保持项目空间 cwd；代码工具的 `workdir` 被 Guard 限定到绑定的隔离 checkout。
- 代码提交到目标仓库；SDD 仓库只保存 commit、PR、merge commit 和测试证据。

合并策略支持 `pull-request`、`local-merge` 和 `manual`，默认 `pull-request`。

## UI 兼容性

DSH 当前侧边栏没有第三方多入口导航 slot。插件采用 dsh-web 已验证的 DOM 注入和独立中央面板模式，集中管理五个入口。所有 DOM 写入都有插件属性标识并随 Cordis effect 卸载。后续 DSH 提供正式导航 slot 时，应迁移到 slot，而不改变领域协议。

## 已实现的运行层

- `StageRun` 持久绑定阶段、交付件、输入和 DSH Session。
- Agent scope System Prompt 和工具执行 Guard。
- 阶段输入门禁、结构质量报告、人工验收清单和 accepted 哈希冻结。
- 开发阶段 Worktree/clone、Git 状态、配置化测试与本地提交。
- 项目看板与 append-only 事件日志。

## 后续边界

- Git push、PR/MR 与 merge gate 需要独立的、带用户确认的远程写能力。
- MCP Source Provider 和可写外部系统能力。
- 交付件升级、superseded 关系和变更影响分析。
- 基于事件日志的按日趋势图和周期时间统计。
