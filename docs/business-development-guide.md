# 业务适配开发指南

本文面向需要把企业需求、缺陷或问题系统接入 DSH SDD 项目的业务开发人员。目标是让业务代码只负责“读取外部事实并归一化”，由 SDD 阶段 Agent 负责把事实整合成当前架构要求的交付件。

## 目录边界

项目级业务自定义文件必须统一放在 `.sdd/business/`：

```text
.sdd/business/
├── README.md
├── connectors/
│   └── company-alm.yaml
└── adapters/
    ├── fetch-company-alm.mjs
    └── lib/
        └── status-map.mjs
```

- `connectors/` 只放 Connector YAML 配置。
- `adapters/` 放可执行适配器及其项目内模块。
- Token、Cookie、私钥和本地凭证不得放入该目录或提交到 Git。
- `.sdd/sources/` 是插件生成的只读来源快照，不放业务代码。
- 通用的 Cordis Provider 应开发为独立 DSH 插件，不复制到项目目录。

## 最小接入流程

1. 在 `adapters/` 编写读取企业系统的脚本。
2. 在 `connectors/` 声明启动命令、超时和允许继承的环境变量。
3. 在 `.sdd/project.yaml` 为 `requirement`、`defect` 等来源类型配置默认 Connector。
4. 在命令行完成协议测试。
5. 启动 DSH，在阶段页面按外部编号导入并检查生成的 `.sdd/sources/*.yaml`。

## Connector 配置

`.sdd/business/connectors/company-alm.yaml`：

```yaml
schema: dsh-sdd/connector@1
id: company-alm
type: command
command:
  - node
  - .sdd/business/adapters/fetch-company-alm.mjs
timeoutMs: 30000
environment:
  - COMPANY_ALM_URL
  - COMPANY_ALM_TOKEN
```

约束如下：

- `id` 使用 kebab-case，并与文件名一致。
- `command` 是 argv 数组，不经过 shell。
- 相对路径以项目 Workspace 根目录为基准。
- 子进程只继承基础启动变量和 `environment` 显式声明的变量。
- 默认超时 30 秒，可配置范围为 100 毫秒到 5 分钟。
- stdout 最大 2 MiB。

## 适配器输入协议

插件向 stdin 写入一个 JSON 对象：

```json
{"operation":"get","kind":"requirement","key":"PAY-381"}
```

字段含义：

| 字段 | 含义 |
| --- | --- |
| `operation` | 当前固定为 `get` |
| `kind` | 来源类型，例如 `requirement`、`defect` |
| `key` | 用户输入的外部业务编号 |

适配器必须只把一个 JSON 对象写到 stdout。调试日志和诊断信息写到 stderr；退出码非零表示获取失败。

## 适配器输出协议

输出必须符合 `dsh-sdd/source@1`：

```json
{
  "schema": "dsh-sdd/source@1",
  "uid": "company-alm:requirement:PAY-381:42",
  "provider": "company-alm",
  "kind": "requirement",
  "externalKey": "PAY-381",
  "title": "支持订单部分退款",
  "status": "研发中",
  "revision": "42",
  "fetchedAt": "2026-08-26T09:00:00.000Z",
  "tracking": {
    "status": "研发中",
    "normalizedStatus": "in-progress",
    "priority": "P1",
    "assignees": ["zhangsan"],
    "estimate": { "value": 5, "unit": "point" }
  },
  "content": {
    "description": "允许针对订单中的部分商品退款。",
    "acceptanceCriteria": ["退款金额不能超过可退金额"]
  },
  "links": [{ "url": "https://alm.example/requirements/PAY-381" }]
}
```

核心字段：

- `uid` 是这份外部记录的稳定身份，建议包含系统、类型、编号和版本。
- `externalKey` 保留业务系统原始单号。
- `revision` 用于识别外部版本变化。
- `content` 保留 AI 整合交付件所需的原始事实，不要在适配器里生成 SDD 结论。
- `tracking.status` 保留企业原始状态；`normalizedStatus` 映射到 `todo`、`in-progress`、`resolved`、`done`、`cancelled` 或 `blocked`。
- `fetchedAt` 表示本次读取时间，不是业务单创建时间。

插件会校验输出并计算 `contentHash`，然后冻结为 `.sdd/sources/*.yaml`。

## Node.js 示例

`.sdd/business/adapters/fetch-company-alm.mjs`：

```js
import { createHash } from 'node:crypto'

let input = ''
for await (const chunk of process.stdin) input += chunk

const request = JSON.parse(input)
if (request.operation !== 'get') throw new Error('unsupported operation')
if (!['requirement', 'defect'].includes(request.kind)) throw new Error('unsupported kind')

const baseUrl = process.env.COMPANY_ALM_URL
const token = process.env.COMPANY_ALM_TOKEN
if (!baseUrl || !token) throw new Error('missing COMPANY_ALM_URL or COMPANY_ALM_TOKEN')

const response = await fetch(`${baseUrl}/api/items/${encodeURIComponent(request.key)}`, {
  headers: { authorization: `Bearer ${token}` },
})
if (!response.ok) throw new Error(`ALM returned ${response.status}`)
const item = await response.json()

const normalizedStatus = {
  新建: 'todo',
  研发中: 'in-progress',
  已解决: 'resolved',
  已关闭: 'done',
}[item.status]

const revision = String(item.version ?? item.updatedAt)
const stableRevision = createHash('sha256').update(revision).digest('hex').slice(0, 12)

process.stdout.write(JSON.stringify({
  schema: 'dsh-sdd/source@1',
  uid: `company-alm:${request.kind}:${item.key}:${stableRevision}`,
  provider: 'company-alm',
  kind: request.kind,
  externalKey: item.key,
  title: item.title,
  status: item.status,
  revision,
  fetchedAt: new Date().toISOString(),
  tracking: {
    status: item.status,
    normalizedStatus,
    priority: item.priority,
    severity: item.severity,
    assignees: item.assignees ?? [],
    estimate: item.storyPoints == null ? undefined : { value: item.storyPoints, unit: 'point' },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolvedAt: item.resolvedAt,
  },
  content: {
    description: item.description,
    acceptanceCriteria: item.acceptanceCriteria,
    businessRules: item.businessRules,
    attachments: item.attachments,
  },
  links: item.url ? [{ url: item.url }] : [],
}))
```

## 项目绑定

在 `.sdd/project.yaml` 中配置默认来源：

```yaml
sources:
  requirement:
    provider: command
    connector: company-alm
  defect:
    provider: command
    connector: company-alm
```

Provider 使用内置的 `command`，Connector 指向 `.sdd/business/connectors/company-alm.yaml`。

## 本地调试

先直接运行适配器：

```sh
printf '%s' '{"operation":"get","kind":"requirement","key":"PAY-381"}' \
  | node .sdd/business/adapters/fetch-company-alm.mjs \
  | jq .
```

检查以下内容：

- stdout 能被解析为单个 JSON 对象。
- `schema`、`uid`、`provider`、`kind`、`title`、`fetchedAt` 和 `content` 存在。
- `provider` 与 Connector ID 一致，或暂时填写 `command`。
- `kind` 与请求完全一致。
- 错误场景使用非零退出码，且 stdout 不混入日志。
- 同一外部版本能生成相同的稳定 `uid`。

随后从 DSH 页面执行一次导入，确认 `.sdd/sources/` 中生成快照且 `validationErrors` 为空。

## 安全要求

- 凭证只通过环境变量或企业凭证服务注入。
- 不在 Connector 的 `command` 中拼接用户输入。
- 不启用 shell，不执行外部系统写操作。
- 对外部响应设置字段和大小限制，避免把无关敏感数据带入项目仓库。
- `content` 中如包含个人信息或密钥，必须在适配器中脱敏。
- 业务适配器默认只读；创建、修改、关闭外部单据应设计成另一套需要用户确认的写能力。

## 何时开发独立 Provider 插件

项目内命令适配器适合单项目接入和快速试用。出现以下情况时，应按照 `docs/extensions.md` 开发独立 Cordis Provider：

- 多个项目复用同一系统接入。
- 需要统一认证、连接池、缓存或审计。
- 需要搜索、批量读取或父子项查询。
- 需要由平台团队统一升级和治理。

无论采用哪种方式，外部数据都必须先转换为 Source Envelope，不能由适配器直接创建 accepted 交付件。
