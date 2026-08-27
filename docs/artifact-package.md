# 多文件交付件包

一个阶段交付件是一个目录，不只是单个 Markdown 文件：

```text
<artifact>/
├── manifest.yaml
├── deliverable.md
├── .template/
│   ├── template.yaml
│   └── deliverable.md
├── diagrams/
├── prototype/
└── attachments/
```

`manifest.yaml.entry` 指向主文档。`.template/` 保存创建该版本时的模板和规则快照，因此项目模板后续变化不会改变历史交付件的 AI 约束和质量门禁。主文档必须使用快照声明的必填二级章节；图片、原型、决策记录、接口样例和其他附件可以放在同一目录的任意子目录，并从主文档使用相对路径引用。符号链接不会进入交付包，防止内容越出交付件目录。

## 文件清单与冻结

草稿阶段由系统实时扫描交付件目录。验收时，插件把除 `manifest.yaml` 外的全部普通文件按相对路径排序，为每个文件记录：

- `path`
- `size`
- `contentHash`
- `kind`：`markdown`、`text`、`image` 或 `binary`

上述清单写入 `manifest.yaml.files`，随后以“路径 + 大小 + 文件哈希”的稳定序列计算整个交付包的 `contentHash`。accepted 之后任意正文或附件变化都会使文件清单或整包哈希校验失败。

## 修订关系

accepted 交付件可以从页面创建新修订。新修订复制整个交付包，保留同一显示编号，版本号从 `x.y.z` 升为 `x.(y+1).0`，并用 `supersedes` 固定指向旧版本。新修订通过质量门禁和人工验收后，旧版本自动进入 `superseded`；旧文件仍保留用于审计。

页面将该动作显示为“发起变更（新修订）”。draft 或 in-review 交付件可以删除，但插件不做永久删除：交付包及其阶段运行记录会移入 `.sdd/trash/`，已验收版本不受影响。已经创建隔离代码开发空间的开发交付件不能删除，避免代码工作区成为无主数据。

## 页面和 AI

“查看交付包”使用左侧文件树展示 `manifest.yaml`、模板快照、正文和全部附件。Markdown 支持渲染预览与源码切换，文本和图片可直接预览，二进制文件可交给系统默认应用打开；文件夹也可在 Finder、Windows 资源管理器或 Linux 桌面中打开。所有打开操作都通过 DSH Host，并在 Host 端验证路径仍位于当前交付包内。

AI 可以在绑定交付件目录中维护主文档与附件，但不得写到其他交付件；对话恢复时仍绑定同一个目录、版本和模板快照。
