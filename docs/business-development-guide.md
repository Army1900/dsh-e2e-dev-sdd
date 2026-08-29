# 业务适配开发指南

本文面向需要把企业需求、缺陷或问题系统接入 DSH SDD 项目的业务开发人员。目标是让业务代码只负责“读取外部事实并归一化”，由 SDD 阶段 Agent 负责把事实整合成当前架构要求的交付件。

企业适配不是插件运行的前置条件。未开发适配器的项目可直接使用内置“手工录入”来源，填写标题、描述和可选子项；只有需要自动读取企业系统时才需要本指南中的 Connector 和 Adapter。

## 目录边界

Connector 和 Adapter 只有一套文件格式，可以按复用范围放在两个位置：

```text
# 插件源码级：随插件安装一次，所有项目可用
business/
├── connectors/
│   └── company-alm.yaml
└── adapters/
    ├── fetch-company-alm.mjs
    └── lib/
        └── status-map.mjs
```

```text
# 项目级：只供当前项目使用
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
- `adapters/` 放可执行适配器及其内部模块。
- 项目存在同名 Connector 时覆盖插件 Connector，页面会显示“项目覆盖”。
- Token、Cookie、私钥和本地凭证不得放入该目录或提交到 Git。
- `.sdd/sources/` 是插件生成的只读来源快照，不放业务代码。

## 最小接入流程

1. 决定复用范围：企业通用适配放插件 `business/`，项目专用适配放 `.sdd/business/`。
2. 在对应 `adapters/` 编写读取企业系统的脚本。
3. 在同一范围的 `connectors/` 声明启动命令、超时和允许继承的环境变量。
4. 在 `.sdd/project.yaml` 为 `requirement`、`defect` 等来源类型配置默认 Connector。
5. 在命令行完成协议测试。
6. 启动 DSH，在阶段页面按主业务编号导入，检查变更预览和生成的工作单元。

## Connector 配置

`business/connectors/company-alm.yaml` 或 `.sdd/business/connectors/company-alm.yaml`：

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
- `.sdd/business/adapters/` 是统一逻辑路径：插件 Connector 映射到插件 `business/adapters/`，项目 Connector 映射到项目 `.sdd/business/adapters/`。
- Adapter 子进程仍以项目 Workspace 根目录为工作目录。
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

适配器必须只把一个 `dsh-sdd/source-bundle@1` JSON 对象写到 stdout。`items` 至少包含一项，单条来源就是长度为 1 的数组。调试日志和诊断信息写到 stderr；退出码非零表示获取失败。

## 适配器输出协议

输出统一符合 `dsh-sdd/source-bundle@1`。下面是只有一条来源的示例：

```json
{
  "schema": "dsh-sdd/source-bundle@1",
  "uid": "company-alm:bundle:PAY-381",
  "provider": "company-alm",
  "kind": "requirement",
  "externalKey": "PAY-381",
  "title": "支持订单部分退款",
  "fetchedAt": "2026-08-26T09:00:00.000Z",
  "items": [{
    "schema": "dsh-sdd/source@1",
    "uid": "company-alm:requirement:PAY-381",
    "provider": "company-alm",
    "kind": "requirement",
    "externalKey": "PAY-381",
    "title": "支持订单部分退款",
    "revision": "42",
    "fetchedAt": "2026-08-26T09:00:00.000Z",
    "content": { "description": "允许针对订单中的部分商品退款。" }
  }],
  "relations": []
}
```

核心字段：

- `uid` 是这份外部记录的稳定身份，建议包含系统、类型和编号，不要包含版本或随机值。
- `externalKey` 保留业务系统原始单号。
- `revision` 用于识别外部版本变化。
- `content` 保留 AI 整合交付件所需的原始事实，不要在适配器里生成 SDD 结论。
- `tracking.status` 保留企业原始状态；`normalizedStatus` 映射到 `todo`、`in-progress`、`resolved`、`done`、`cancelled` 或 `blocked`。
- `fetchedAt` 表示本次读取时间，不是业务单创建时间。

插件会校验输出并计算 `contentHash`，然后冻结为 `.sdd/sources/*.yaml`。

### 一个主 ID 返回多个子需求

子需求可独立设计、开发和验收时，在同一个 `items` 数组返回多项：

```json
{
  "schema": "dsh-sdd/source-bundle@1",
  "uid": "company-alm:bundle:EPIC-100",
  "provider": "company-alm",
  "kind": "requirement",
  "externalKey": "EPIC-100",
  "title": "支付能力升级",
  "fetchedAt": "2026-08-26T09:00:00.000Z",
  "root": { "schema": "dsh-sdd/source@1", "uid": "company-alm:requirement:EPIC-100", "provider": "company-alm", "kind": "requirement", "externalKey": "EPIC-100", "title": "支付能力升级", "fetchedAt": "2026-08-26T09:00:00.000Z", "content": { "goal": "统一支付能力" } },
  "items": [
    { "schema": "dsh-sdd/source@1", "uid": "company-alm:requirement:REQ-101", "provider": "company-alm", "kind": "requirement", "externalKey": "REQ-101", "title": "微信支付", "fetchedAt": "2026-08-26T09:00:00.000Z", "content": { "description": "..." } },
    { "schema": "dsh-sdd/source@1", "uid": "company-alm:requirement:REQ-102", "provider": "company-alm", "kind": "requirement", "externalKey": "REQ-102", "title": "支付宝", "fetchedAt": "2026-08-26T09:00:00.000Z", "content": { "description": "..." } }
  ],
  "relations": [
    { "from": "REQ-101", "to": "EPIC-100", "type": "child-of" },
    { "from": "REQ-102", "to": "EPIC-100", "type": "child-of" }
  ]
}
```

`root` 是可选的公共业务背景；`items` 中每一项的执行归属由页面入口决定：从项目看板导入时形成独立 SDD 工作单元，从当前需求内导入缺陷时保留独立来源记录、但挂到该需求的交付流程。适配器不需要返回 `BUG -> REQ` 关系，也不应自行决定归属。适配器每次同步必须返回主 ID 当前完整的子项集合，这样核心才能识别已从外部删除的子项。

再次输入同一个主 ID 会生成同步预览：

- `added`：新建工作单元。
- `modified`：保存新来源快照并标记受影响阶段重新评审。
- `removed`：标记为外部已移除，负责人再选择保留本地继续推进或归档；禁止静默删除本地成果。
- `unchanged`：不写文件。

稳定身份应由 `provider + kind + externalKey` 决定；`uid` 不应包含随机值。`revision` 和内容可变化，历史快照由核心保存。

## Node.js 示例

`business/adapters/fetch-company-alm.mjs` 或 `.sdd/business/adapters/fetch-company-alm.mjs`：

```js
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
const source = {
  schema: 'dsh-sdd/source@1',
  uid: `company-alm:${request.kind}:${item.key}`,
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
}

process.stdout.write(JSON.stringify({
  schema: 'dsh-sdd/source-bundle@1',
  uid: `company-alm:bundle:${request.key}`,
  provider: 'company-alm',
  kind: request.kind,
  externalKey: request.key,
  title: source.title,
  fetchedAt: new Date().toISOString(),
  items: [source],
  relations: [],
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

Provider 使用内置的 `command`。核心按 Connector ID 合并插件和项目目录，同名时选择项目版本，因此项目配置不需要记录物理路径或部署范围。

## 本地调试

先直接运行适配器：

macOS/Linux：

```sh
printf '%s' '{"operation":"get","kind":"requirement","key":"PAY-381"}' \
  | node .sdd/business/adapters/fetch-company-alm.mjs \
  | jq .
```

Windows PowerShell：

```powershell
'{"operation":"get","kind":"requirement","key":"PAY-381"}' |
  node .sdd/business/adapters/fetch-company-alm.mjs |
  ConvertFrom-Json |
  ConvertTo-Json -Depth 20
```

检查以下内容：

- stdout 能被解析为单个 JSON 对象。
- `schema`、`uid`、`provider`、`kind`、`title`、`fetchedAt` 和 `content` 存在。
- `provider` 与 Connector ID 一致，或暂时填写 `command`。
- `kind` 与请求完全一致。
- 错误场景使用非零退出码，且 stdout 不混入日志。
- 同一外部版本能生成相同的稳定 `uid`。

随后从 DSH 页面执行一次导入，逐条打开详情确认完整正文，检查预览数量正确、`.sdd/sources/` 中生成快照、`.sdd/work-items/` 中生成工作单元。还应分别验证项目看板导入缺陷会生成独立流程、需求内导入缺陷会记录 `parentWorkItemUid` 且不增加五阶段矩阵行。修改一个子项并再次同步，确认它显示为“有变更”而不是重复新增。

## 安全要求

- 凭证只通过环境变量或企业凭证服务注入。
- 不在 Connector 的 `command` 中拼接用户输入。
- 不启用 shell，不执行外部系统写操作。
- 对外部响应设置字段和大小限制，避免把无关敏感数据带入项目仓库。
- `content` 中如包含个人信息或密钥，必须在适配器中脱敏。
- 业务适配器默认只读；创建、修改、关闭外部单据应设计成另一套需要用户确认的写能力。

## 从项目适配提升为源码适配

项目验证完成后，可以把 `.sdd/business/connectors/<id>.yaml` 和对应 Adapter 原样移动到插件 `business/`。不需要改写 Class、输入协议或输出协议；重新构建并安装企业维护的插件版本后，所有项目都能选择该 Connector。项目需要特殊行为时，可在自己的 `.sdd/business/` 放置同名文件覆盖。

无论放在哪个范围，外部数据都必须先转换为 Source Envelope，不能由适配器直接创建 accepted 交付件。
