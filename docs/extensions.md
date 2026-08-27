# Provider 扩展开发

插件公开 Cordis 服务 `ctx.dshSddSources`，用于管理企业需求、缺陷和问题来源。第三方插件只依赖 `dsh-e2e-dev-sdd/extensions` 的接口，不需要修改核心包。

## Source Provider

Provider 可以是 class 或满足结构类型的普通对象：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {
  SddSourceProvider,
  SourceGetRequest,
} from 'dsh-e2e-dev-sdd/extensions'

class CompanyAlmProvider implements SddSourceProvider {
  readonly name = 'company-alm'
  readonly kinds = ['requirement', 'defect']

  async get(request: SourceGetRequest) {
    const item = await companyAlm.get(request.kind, request.key, request.signal)
    const source = {
      schema: 'dsh-sdd/source@1' as const, uid: `${this.name}:${request.kind}:${item.key}`,
      provider: this.name, kind: request.kind, externalKey: item.key, title: item.title,
      status: item.status, fetchedAt: new Date().toISOString(), revision: item.revision,
      content: { description: item.description, acceptanceCriteria: item.acceptanceCriteria }, links: item.links,
    }
    return {
      schema: 'dsh-sdd/source-bundle@1' as const, uid: `${this.name}:bundle:${request.key}`,
      provider: this.name, kind: request.kind, externalKey: request.key, title: source.title,
      fetchedAt: new Date().toISOString(), items: [source], relations: [],
    }
  }
}

export const inject = ['dshSddSources']

export function apply(ctx: Context) {
  ctx.dshSddSources.register(new CompanyAlmProvider())
}
```

注册返回 Cordis effect disposer；提供方插件卸载时注册会自动消失。Provider 名称同层重复会加载失败，`kinds` 控制可处理的来源类型。`get()` 统一返回包含 `items` 和 `relations` 的 `dsh-sdd/source-bundle@1`，`items` 至少一项；单条来源就是长度为 1 的数组。公共主需求背景可放入可选的 `root`。核心会验证输出、生成同步预览，并把用户确认的版本快照写入 `.sdd/sources/`。

项目可以为来源类型指定默认 Provider：

```yaml
sources:
  requirement:
    provider: company-alm
  defect:
    provider: company-alm
```

读取接口必须响应 `request.signal`。创建、修改外部单据属于另一个具有用户确认的写能力，不应塞入只读 Source Provider。

## 企业编号的处理方式

企业需求号、子需求号、缺陷号由 Source Provider 填入 `externalKey`，并在 `relations` 中返回父子或其他业务关系。核心会把这些编号保存到 Source/Work Item，并与 SDD 交付件建立追踪关系。企业适配器不分配或改写插件的 `REQ/UX/ARCH/SPEC/DEV` 交付件编号。

## 命令型 Connector

无需发布 Cordis 插件时，可以在项目中提供命令适配器：

```yaml
# .sdd/business/connectors/company-alm.yaml
schema: dsh-sdd/connector@1
id: company-alm
type: command
command:
  - node
  - .sdd/business/adapters/fetch-company-alm.mjs
timeoutMs: 30000
environment:
  - COMPANY_ALM_TOKEN
```

核心使用 `shell: false` 启动 argv 命令，以 Workspace 为 cwd。stdin 为：

```json
{"operation":"get","kind":"requirement","key":"PAY-381"}
```

stdout 必须只包含一个符合 `dsh-sdd/source-bundle@1` 的 JSON 对象。stderr 用于诊断；stdout 上限为 2 MiB。子进程只继承平台启动变量和 `environment` 中显式列出的变量。

项目可设置默认绑定：

```yaml
sources:
  requirement:
    provider: command
    connector: company-alm
```
