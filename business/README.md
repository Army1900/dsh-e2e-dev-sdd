# 插件级业务适配

本目录用于企业基于源码维护、随插件安装一次并供所有 SDD 项目复用的业务适配器。

- `connectors/` 保存 `dsh-sdd/connector@1` YAML 启动配置。
- `adapters/` 保存从 stdin 接收请求、向 stdout 返回 `dsh-sdd/source-bundle@1` 的适配程序。

这里与项目工作空间中的 `.sdd/business/` 使用完全相同的目录结构和文件格式。项目中存在同名 Connector 时，项目配置覆盖插件配置。凭证值不得写入仓库；Connector 只能声明允许继承的环境变量名称。

完整说明见 `docs/business-development-guide.md`。

开始适配时，可将 `connectors/company-alm.yaml.example` 和 `adapters/fetch-company-alm.mjs.example` 分别复制为去掉 `.example` 后缀的文件，再替换接口和字段映射。示例后缀不会被运行时加载。
