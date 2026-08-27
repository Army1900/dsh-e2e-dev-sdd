# 项目交付件模板

初始化 SDD 项目后，五个阶段的模板位于 `.sdd/templates/<stage>/`：

```text
requirements/
├── template.yaml
└── deliverable.md
```

`template.yaml` 定义模板版本、文档名称、维护说明和质量检查要求的 `requiredSections`。`deliverable.md` 是草稿正文模板，支持两个占位符：

- `{{artifactKey}}`：插件生成的阶段交付件编号。
- `{{artifactTitle}}`：创建草稿时填写的标题。

修改模板时必须同步维护 `requiredSections` 和正文中的 `##` 二级章节。插件在创建草稿前验证两者一致；配置错误时不会创建不完整交付件。

每个新交付件会把当时的模板复制到自身 `.template/`，并在 `manifest.yaml.template` 中记录版本、哈希、必填章节和快照路径。后续修改项目模板只影响新建草稿，不改变已有交付件及其质量门禁。新修订继续沿用原交付件的模板快照。

页面的“查看交付件模板”支持 Markdown 预览、源码查看，并可使用系统默认应用打开模板、规则文件或模板目录。
