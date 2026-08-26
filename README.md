# dsh-e2e-dev-sdd

DeepSeek Harness Web 的五阶段 SDD（Specification-Driven Development）工作台。插件把需求讨论、原型输出、系统设计、规格设计、开发测试作为五个独立入口；用户选择已接受的上游交付件，与 DSH Agent 对话迭代当前阶段，最后把标准化交付件和代码提交回 Git 仓库。

## 当前能力

- 项目看板汇总阶段完成度、需求与缺陷、追踪覆盖率、代码空间和测试结果。
- 五个阶段一级菜单，共用同一套项目和交付件协议。
- 一个 DSH Workspace 对应一个可提交的 `.sdd/` 项目空间。
- 自动发现、校验和选择已接受的上游交付件。
- 创建阶段草稿，并用阶段模板生成 `manifest.yaml` 与 `deliverable.md`。
- 将选中交付件整合为阶段输入，启动/复用原生 DSH Session。
- 人工接受交付件并冻结内容 SHA-256。
- 稳定内部 UUID、项目显示编号、外部编号和显式关系的扩展契约。
- 可注册的需求/缺陷 Source Provider 与编号 Provider Cordis 服务。
- 内置无 shell 的命令型 Source Provider，支持项目自有 CLI 脚本。
- 每阶段独立 System Prompt、输入门禁、工具执行 Guard、结构质量检查和验收清单。
- 一个阶段运行固定绑定一个交付件和一个 DSH Session，支持恢复与逐轮质量刷新。
- 对话中确定结论必须同步到交付件，并提供显式“同步结论”操作。
- 开发测试阶段支持 `.sdd-workspaces/` 隔离 Worktree/Clone、测试、Git 状态和本地提交。
- `.sdd/events/*.jsonl` 记录可提交的项目活动，为看板趋势提供事实数据。

当前版本不会执行 Git push、创建 PR/MR 或自动合并；这些外部写操作仍由用户在检查本地提交后完成。MCP Provider 也尚未内置，可通过公开 Provider 接口继续扩展。

## 安装

### npm

发布后安装到 Web profile：

```sh
dsh plugin --profile web add dsh-e2e-dev-sdd@latest
```

重启 `dsh web` 后，侧边栏会出现五个阶段入口。

### 本地开发

```sh
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

更新代码后重新构建并重启 DSH。可用下面的命令检查 bundle 层：

```sh
dsh --profile web --dump-config
```

### Git 安装

包提供 `prepare` 构建入口：

```sh
dsh plugin --profile web add github:Army1900/dsh-e2e-dev-sdd
```

pnpm 10 及以上会要求用户在 profile 的 `pnpm-workspace.yaml` 中明确允许该 Git 依赖执行构建脚本。只应对可信源码授权，并建议锁定 commit。

## 使用

1. 在 DSH 中打开一个 Git 仓库作为 Workspace。
2. 进入任一阶段菜单；首次使用点击“初始化”。
3. 勾选本次需要的已接受交付件，并选择一个本阶段草稿作为固定对话目标。
4. 开始绑定对话；插件在对应 Session 安装阶段 System Prompt 和工具 Guard。
5. 与 Agent 迭代，确定结论逐轮写入 `.sdd/artifacts/<stage>/...`。
6. 返回阶段页面查看结构质量、确认阶段验收清单并接受版本。
7. 在开发测试阶段创建隔离代码空间、运行配置测试并形成代码提交。
8. 在项目看板检查进度、追踪覆盖率、缺陷和测试状态，然后提交 `.sdd/` 变更。

## 设计原则

- 不自动串行运行全部阶段。
- Git 仓库文件是项目真源，浏览器状态不是。
- 已接受交付件不可被静默覆盖。
- 内部身份统一；项目编号可配置；外部编号原样保留。
- 层级和追踪关系显式记录，不从编号字符串推断。
- 外部材料必须先转换为 Source Envelope，再由 AI 整合为正式交付件。
- 每个需求的代码开发使用独立 Worktree 或 clone，不污染主项目空间。

阶段运行机制见 [docs/stage-runtime.md](docs/stage-runtime.md)，详细设计见 [docs/architecture.md](docs/architecture.md)，扩展开发见 [docs/extensions.md](docs/extensions.md)，规范文件位于 [schemas/](schemas/)。

## 开发验证

```sh
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
