# dsh-e2e-dev-sdd

DeepSeek Harness Web 的五阶段 SDD（Specification-Driven Development）工作台。插件把需求讨论、原型输出、系统设计、规格设计、开发测试作为五个独立入口；五个阶段默认是可选能力而不是固定流水线，用户选择当前需求真正需要的来源和已接受交付件，与 DSH Agent 对话迭代并提交成果。

## 当前能力

- 项目看板汇总阶段完成度、需求与缺陷、追踪覆盖率、代码空间和测试结果，并提供五阶段状态分布、需求燃起图和可点击的需求交付热力图。
- 五个阶段一级菜单，共用同一套项目和交付件协议。
- 一个 DSH Workspace 对应一个可提交的 `.sdd/` 项目空间；主需求下的每个可独立交付子项拥有自己的工作单元。
- 业务适配器统一返回 `source-bundle@1`；单条来源就是 `items` 长度为 1 的需求包。
- 内置零配置手工来源：没有企业适配器时可直接填写标题、初始描述和可选子项，再由 AI 在需求讨论中逐步补齐。
- 再次同步同一主 ID 会预览新增、修改、移除和无变化项，用户确认后才应用。
- 需求变化保存新的来源快照，不覆盖历史；受影响阶段进入重新评审，外部移除不会自动删除本地成果。
- 自动发现和校验当前工作单元的来源及所有阶段 accepted 交付件；默认灵活模式可自由组合输入，也可在项目配置中启用严格依赖模式。
- 初始化生成 `.sdd/templates/<stage>/template.yaml` 与 `deliverable.md`；项目可编辑并提交，草稿会绑定创建时的模板快照。
- 同一份模板快照用于草稿生成、AI 输出约束和结构质量检查。
- 交付件是可包含正文、图表、原型和附件的多文件包；页面提供完整文件树、Markdown 预览/源码切换，并可通过 DSH Host 跨平台打开文件和目录；验收时冻结文件清单和整包哈希。
- 代码仓库是项目级目录，需求级“开发设置”在任意阶段都可选择仓库、基线并填写每仓具体开发目标；系统设计和规格设计可补充这些结论，但不是前置入口。OpenSpec 可选：插件检查 CLI 与配置目录，支持官方初始化、查看模板解析位置、Fork `spec-driven` 为项目内可编辑 Schema，以及为当前需求创建明确的 OpenSpec Change。
- 原型、系统设计、规格设计和开发测试可以按需求标记为“不适用”；看板单独统计，不创建空交付件。简单需求可以直接从原始来源进入开发测试。
- 页面可预览交付包、查看需求到五阶段的追踪矩阵；accepted 版本会先检查来源、上游交付件和模板哈希，再区分“处理上游变更”和“用户主动调整”。空变更不能创建或验收，旧会话只读，新变更会话包含类型与版本并关联历史运行；未验收草稿可安全移入 `.sdd/trash`。
- 将选中交付件整合为阶段输入，启动/复用原生 DSH Session。
- 人工接受交付件并冻结内容 SHA-256。
- 稳定内部 UUID、插件阶段编号、企业外部编号和显式关系的扩展契约。
- 可注册的需求/缺陷 Source Provider Cordis 服务。
- 内置无 shell 的命令型 Source Provider，支持项目自有 CLI 脚本。
- 企业通用 Connector 与适配器放在插件 `business/`，项目专用适配放在 `.sdd/business/`；两处格式完全一致，同名时项目配置覆盖插件配置。
- 每阶段独立 System Prompt、输入门禁、工具执行 Guard、结构质量检查和验收清单。
- 一个阶段运行固定绑定一个交付件和一个 DSH Session，支持恢复与逐轮质量刷新。
- 对话中确定结论必须同步到交付件，并提供显式“同步结论”操作。
- 开发测试阶段从选定基线创建 `sdd/...` 特性分支；AI 根据仓库与 CI 自主执行测试，插件记录真实退出码和代码指纹，证据过期或失败时阻止本地提交。
- `.sdd/events/*.jsonl` 记录可提交的项目活动，为看板趋势提供事实数据。
- 外层 SDD 项目仓库提供 Git 状态、Fetch、仅 Fast-forward 同步、按范围提交和显式 Push；分叉或冲突时停止自动操作。不同 UID 血缘发生交付件显示编号冲突时，只允许未绑定的草稿追加稳定短后缀，已验收冲突必须人工处理。

外层 SDD 项目仓库可以由用户显式 Push 当前协作分支；目标代码仓库仍不会自动 Push、创建 PR/MR 或合并，这些交付动作由负责人在检查本地提交后完成。MCP Provider 也尚未内置，可通过公开 Provider 接口继续扩展。

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
3. 在“项目设置”配置外层 SDD 项目仓库的 remote、协作基线、同步策略和提交范围。Fetch 只更新远程引用；自动同步仅允许干净工作区的 fast-forward；提交和 Push 都需要显式确认。
4. 点击“导入或同步需求包”。默认选择“手工录入”，填写最小标题和描述即可；有企业适配器时也可切换到对应 Connector。插件级 `business/` 适配器安装一次后供所有项目使用，项目级 `.sdd/business/` 可使用同一格式补充或覆盖。检查子项的新增、修改、移除预览并选择要应用的项目。
5. 从页面顶部选择当前需求工作单元；阶段页面只展示已选输入摘要，点击“选择/调整输入”在弹窗中选择当前来源和上游阶段最新 accepted 交付件。创建草稿后输入固定到 Manifest，变化时通过修订处理。无需某个阶段时直接标记“不适用”，以后仍可恢复。
6. 在“项目设置”添加本地或远程目标代码仓库并选择默认基线；系统设计确认当前需求的仓库范围，规格设计确认实际开发目标，跳过前置阶段时可在开发阶段补齐。刚执行 `git init`、尚无提交的本地仓库可以在明确确认后创建空初始提交；空远程仓库仍需先显式创建提交并 push。
7. 选择草稿并开始阶段对话；插件在对应 Session 安装阶段 System Prompt、仓库边界、可选 OpenSpec 位置和工具 Guard。
8. 与 Agent 迭代；Agent 必须按照页面所示模板输出，并把确定结论逐轮写入 `.sdd/work-items/<uid>/artifacts/<stage>/.../deliverable.md`。实际文档可以很长，也可以在交付件目录中增加图片和附件并从主文档引用。
9. 返回阶段页面查看交付包和结构质量、确认阶段验收清单并接受版本。需要修改 accepted 版本时点击“检查变更 / 提出调整”：插件先展示来源、上游交付件和模板的哈希差异；存在差异时处理上游变更，没有差异时必须填写主动调整原因。新修订使用新的变更会话，名称包含变更类型与版本，旧会话和旧交付件保持只读。不再需要的草稿可移入 `.sdd/trash`。
10. 在开发测试阶段只为已确认目标仓库创建隔离代码空间；本地仓库创建 Worktree，远程仓库 Clone，并从所选基线提交创建独立的 SDD 特性分支。开发交付件创建修订时沿用同一工作单元的 Worktree/分支，同时使旧测试证据过期。启用 OpenSpec 时先运行官方初始化；初始化只准备目录和 AI 工具集成，不会生成需求内容。随后选择官方或项目自定义 Schema，点击“创建当前需求 Change”，再让 AI 生成并维护其 proposal/specs/design/tasks。通过“让 AI 验证”运行相关测试；有效证据形成后才能提交。
11. 在项目看板检查五阶段流转、待处理变更、缺陷和测试状态；到“项目设置”Fetch 远程状态、提交 SDD 变更并显式 Push。出现分叉、文本冲突或已验收编号冲突时，插件停止自动同步并要求人工处理。

## 设计原则

- 不自动串行运行全部阶段；默认灵活模式允许跳过和自由组合输入，严格模式才执行项目声明的 required 依赖。
- Git 仓库文件是项目真源，浏览器状态不是。
- 已接受交付件不可被静默覆盖。
- 内部身份使用 UUID；交付件编号由插件按阶段固定生成；企业外部编号原样保留并显式关联。
- 层级和追踪关系显式记录，不从编号字符串推断。
- 外部材料必须先转换为 Source Envelope，再由 AI 整合为正式交付件。
- 每个需求的代码开发使用独立 Worktree 或 clone，不污染主项目空间。

完整的用户流程、角色分工和页面截图见 [五阶段 SDD 完整开发流程 Blog](docs/blog-sdd-end-to-end-workflow.md)。阶段运行机制见 [docs/stage-runtime.md](docs/stage-runtime.md)，项目模板定制见 [docs/templates.md](docs/templates.md)，多文件交付规范见 [docs/artifact-package.md](docs/artifact-package.md)，详细设计见 [docs/architecture.md](docs/architecture.md)，业务适配开发见 [docs/business-development-guide.md](docs/business-development-guide.md)，Cordis Provider 扩展见 [docs/extensions.md](docs/extensions.md)，规范文件位于 [schemas/](schemas/)。

## 开发验证

```sh
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
