# dsh-e2e-dev-sdd

DeepSeek Harness Web 的五阶段 SDD（Specification-Driven Development）工作台。插件把需求讨论、原型输出、系统设计、规格设计、开发测试作为五个独立入口；用户选择已接受的上游交付件，与 DSH Agent 对话迭代当前阶段，最后把标准化交付件和代码提交回 Git 仓库。

## 当前能力

- 项目看板汇总阶段完成度、需求与缺陷、追踪覆盖率、代码空间和测试结果。
- 五个阶段一级菜单，共用同一套项目和交付件协议。
- 一个 DSH Workspace 对应一个可提交的 `.sdd/` 项目空间；主需求下的每个可独立交付子项拥有自己的工作单元。
- 业务适配器统一返回 `source-bundle@1`；单条来源就是 `items` 长度为 1 的需求包。
- 再次同步同一主 ID 会预览新增、修改、移除和无变化项，用户确认后才应用。
- 需求变化保存新的来源快照，不覆盖历史；受影响阶段进入重新评审，外部移除不会自动删除本地成果。
- 自动发现、校验和选择已接受的上游交付件。
- 页面可查看五阶段详细 Markdown 模板；同一份模板用于草稿生成、AI 输出约束和结构质量检查。
- 交付件是可包含正文、图表、原型和附件的多文件包；验收时冻结文件清单和整包哈希。
- 系统设计在页面确认仓库范围，规格设计确认具体开发目标及可选 OpenSpec 仓库路径；未确认时阻止阶段对话和验收。
- 页面可预览交付包、查看需求到五阶段的追踪矩阵，并从 accepted 版本创建显式 supersedes 修订。
- 将选中交付件整合为阶段输入，启动/复用原生 DSH Session。
- 人工接受交付件并冻结内容 SHA-256。
- 稳定内部 UUID、项目显示编号、外部编号和显式关系的扩展契约。
- 可注册的需求/缺陷 Source Provider 与编号 Provider Cordis 服务。
- 内置无 shell 的命令型 Source Provider，支持项目自有 CLI 脚本。
- 项目级业务 Connector 与适配器统一收束在 `.sdd/business/`。
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

macOS/Linux：

```sh
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

Windows PowerShell：

```powershell
pnpm install
pnpm build
dsh plugin --profile web add "link:$($PWD.Path)"
```

构建、测试和运行时脚本均通过 Node.js 启动，不依赖 `rm`、`bash` 等 POSIX 命令。

更新代码后重新构建并重启 DSH。可用下面的命令检查 bundle 层：

```sh
dsh --profile web --dump-config
```

### Git 安装

仓库已包含跨平台构建产物，macOS、Linux 和 Windows 使用同一条命令，不需要配置 pnpm 构建白名单：

```sh
dsh plugin --profile web add github:Army1900/dsh-e2e-dev-sdd
```

确认安装层已经挂载：

```sh
dsh --profile web --dump-config
```

输出中应包含 `# == dsh-e2e-dev-sdd` 和 `id: e2e-dev-sdd`。随后必须结束旧的 `dsh web` 进程并重新启动；只刷新浏览器不会加载新插件。

Windows PowerShell 中可以用下面的命令检查实际 DSH Home 和安装结果：

```powershell
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$ProfileDir = Join-Path $DshHome 'profiles\web'
Get-Content (Join-Path $ProfileDir 'package.json')
dsh --profile web --dump-config
```

安装成功后，profile 的 `package.json` dependencies 中应包含 `dsh-e2e-dev-sdd`。只应安装可信源码，并建议在生产环境锁定 commit。

## 使用

1. 在 DSH 中打开一个 Git 仓库作为 Workspace。
2. 进入任一阶段菜单；插件会检查 `.sdd/project.yaml`。未初始化时点击“初始化项目”；配置不合法时会显示字段级错误，可修复后重新检查，或备份旧配置后重新生成默认配置。
3. 点击“导入或同步需求包”，输入主业务编号，检查子项的新增、修改、移除预览并选择要应用的项目。
4. 从页面顶部选择当前需求工作单元，勾选它的最新来源和已接受上游交付件；可先点“查看交付件模板”，再创建本阶段草稿。
5. 系统设计阶段可在页面登记项目代码仓库并确认可能涉及的仓库范围；规格设计阶段从该范围中确认实际开发目标，并可记录目标仓库中的 OpenSpec 相对路径。
6. 选择草稿并开始阶段对话；插件在对应 Session 安装阶段 System Prompt、仓库边界、可选 OpenSpec 位置和工具 Guard。
7. 与 Agent 迭代；Agent 必须按照页面所示模板输出，并把确定结论逐轮写入 `.sdd/work-items/<uid>/artifacts/<stage>/.../deliverable.md`。实际文档可以很长，也可以在交付件目录中增加图片和附件并从主文档引用。
8. 返回阶段页面查看交付包和结构质量、确认阶段验收清单并接受版本。存在外部变更时，可从 accepted 版本创建新修订并依次重新评审。
9. 在开发测试阶段只为规格确认的目标仓库创建隔离代码空间、运行配置测试并形成代码提交。
10. 在项目看板检查追踪矩阵、进度、待处理变更、缺陷和测试状态，然后提交 `.sdd/` 变更。

## 设计原则

- 不自动串行运行全部阶段。
- Git 仓库文件是项目真源，浏览器状态不是。
- 已接受交付件不可被静默覆盖。
- 内部身份统一；项目编号可配置；外部编号原样保留。
- 层级和追踪关系显式记录，不从编号字符串推断。
- 外部材料必须先转换为 Source Envelope，再由 AI 整合为正式交付件。
- 每个需求的代码开发使用独立 Worktree 或 clone，不污染主项目空间。

阶段运行机制见 [docs/stage-runtime.md](docs/stage-runtime.md)，多文件交付规范见 [docs/artifact-package.md](docs/artifact-package.md)，详细设计见 [docs/architecture.md](docs/architecture.md)，业务适配开发见 [docs/business-development-guide.md](docs/business-development-guide.md)，Cordis Provider 扩展见 [docs/extensions.md](docs/extensions.md)，规范文件位于 [schemas/](schemas/)。

## 开发验证

```sh
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
