import { STAGES, isStageId, parseAction, stageDefinition } from "./protocol.js";
import { SddIdentifierRegistry, SddSourceRegistry, validateSourceEnvelope } from "./extensions.js";
import { createHash, randomUUID } from "node:crypto";
import { access, appendFile, copyFile, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { spawn } from "node:child_process";
//#region src/event-log.ts
async function appendEvent(workspacePath, type, subject, stage, detail) {
	const event = {
		schema: "dsh-sdd/event@1",
		id: randomUUID(),
		time: (/* @__PURE__ */ new Date()).toISOString(),
		type,
		subject,
		...stage === void 0 ? {} : { stage },
		...detail === void 0 ? {} : { detail }
	};
	const root = join(workspacePath, ".sdd", "events");
	await mkdir(root, { recursive: true });
	await appendFile(join(root, `${event.time.slice(0, 7)}.jsonl`), `${JSON.stringify(event)}\n`, "utf8");
	return event;
}
async function readRecentEvents(workspacePath, limit = 20) {
	const root = join(workspacePath, ".sdd", "events");
	let files;
	try {
		files = (await readdir(root)).filter((file) => /^\d{4}-\d{2}\.jsonl$/.test(file)).sort().reverse();
	} catch {
		return [];
	}
	const events = [];
	for (const file of files) {
		const lines = (await readFile(join(root, file), "utf8")).split(/\r?\n/).filter(Boolean).reverse();
		for (const line of lines) {
			try {
				events.push(JSON.parse(line));
			} catch {}
			if (events.length >= limit) return events;
		}
	}
	return events;
}
//#endregion
//#region src/git-service.ts
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_OUTPUT = 1024 * 1024;
async function run(argv, cwd, timeoutMs = 12e4, allowFailure = false) {
	if (argv.length === 0) throw new Error("command argv must not be empty");
	const signal = AbortSignal.timeout(timeoutMs);
	return await new Promise((resolveResult, reject) => {
		const child = spawn(argv[0], argv.slice(1), {
			cwd,
			shell: false,
			env: process.env,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			signal
		});
		const stdout = [];
		const stderr = [];
		let size = 0;
		const collect = (target) => (chunk) => {
			size += chunk.length;
			if (size > MAX_OUTPUT) child.kill();
			else target.push(chunk);
		};
		child.stdout.on("data", collect(stdout));
		child.stderr.on("data", collect(stderr));
		child.once("error", reject);
		child.once("close", (code) => {
			if (size > MAX_OUTPUT) return reject(/* @__PURE__ */ new Error(`command output exceeded ${MAX_OUTPUT} bytes`));
			const result = {
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				exitCode: code ?? -1
			};
			if (!allowFailure && result.exitCode !== 0) return reject(/* @__PURE__ */ new Error(`${argv[0]} exited with ${result.exitCode}: ${result.stderr.trim()}`));
			resolveResult(result);
		});
	});
}
async function exists$1(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
function developmentFile(projectPath, artifactUid) {
	return join(projectPath, ".sdd", "development", `${artifactUid}.yaml`);
}
async function repositoryState(state) {
	const status = await run([
		"git",
		"status",
		"--porcelain=v1"
	], state.path);
	const head = (await run([
		"git",
		"rev-parse",
		"HEAD"
	], state.path)).stdout.trim();
	const counts = (await run([
		"git",
		"rev-list",
		"--left-right",
		"--count",
		`${state.baseCommit}...HEAD`
	], state.path)).stdout.trim().split(/\s+/).map(Number);
	return {
		...state,
		headCommit: head,
		behind: counts[0] ?? 0,
		ahead: counts[1] ?? 0,
		changedFiles: status.stdout.split(/\r?\n/).filter(Boolean).length
	};
}
async function readDevelopmentWorkspace(projectPath, artifactUid) {
	const file = developmentFile(projectPath, artifactUid);
	if (!await exists$1(file)) return void 0;
	return parse(await readFile(file, "utf8"));
}
async function listDevelopmentWorkspaces(projectPath, artifacts) {
	const result = [];
	for (const artifact of artifacts.filter((item) => item.stage === "development")) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifact.uid);
		if (workspace === void 0) continue;
		const repositories = [];
		for (const repository of workspace.repositories) try {
			repositories.push(await repositoryState(repository));
		} catch {
			repositories.push(repository);
		}
		result.push({
			...workspace,
			repositories
		});
	}
	return result;
}
function repositoryConfig(project, id) {
	const config = project.development.repositories.find((item) => item.id === id);
	if (config === void 0) throw new Error(`development repository is not configured: ${id}`);
	if (!ID.test(config.id)) throw new Error(`invalid development repository id: ${config.id}`);
	return config;
}
var GitDevelopmentService = class {
	async create(projectPath, project, artifact, repositoryId) {
		if (artifact.stage !== "development") throw new Error("isolated code workspaces are only available in development stage");
		const config = repositoryConfig(project, repositoryId);
		const existing = await readDevelopmentWorkspace(projectPath, artifact.uid);
		if (existing?.repositories.some((item) => item.id === repositoryId)) return existing;
		const root = resolve(projectPath, project.development.workspaceRoot);
		const target = resolve(root, artifact.key, repositoryId);
		if (relative(root, target).startsWith("..")) throw new Error("development workspace path escapes configured root");
		await mkdir(resolve(root, artifact.key), { recursive: true });
		if (await exists$1(target)) throw new Error(`development target already exists but is not registered: ${target}`);
		const branch = project.development.branchPattern.replaceAll("{artifactKey}", artifact.key).replaceAll("{repositoryId}", repositoryId);
		await run([
			"git",
			"check-ref-format",
			"--branch",
			branch
		], projectPath);
		const localSource = isAbsolute(config.source) ? config.source : resolve(projectPath, config.source);
		let baseCommit;
		if (await exists$1(localSource)) {
			baseCommit = (await run([
				"git",
				"rev-parse",
				config.baseBranch
			], localSource)).stdout.trim();
			await run([
				"git",
				"worktree",
				"add",
				"-b",
				branch,
				target,
				baseCommit
			], localSource);
		} else {
			await run([
				"git",
				"clone",
				"--branch",
				config.baseBranch,
				"--single-branch",
				config.source,
				target
			], projectPath, 3e5);
			baseCommit = (await run([
				"git",
				"rev-parse",
				"HEAD"
			], target)).stdout.trim();
			await run([
				"git",
				"switch",
				"-c",
				branch
			], target);
		}
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const state = {
			id: config.id,
			source: config.source,
			baseBranch: config.baseBranch,
			baseCommit,
			workingBranch: branch,
			path: target,
			headCommit: baseCommit,
			changedFiles: 0,
			ahead: 0,
			behind: 0
		};
		const workspace = existing ?? {
			schema: "dsh-sdd/development-workspace@1",
			uid: crypto.randomUUID(),
			key: artifact.key,
			artifactUid: artifact.uid,
			inputs: artifact.basedOn.map((input) => ({
				artifactUid: input.uid,
				version: input.version
			})),
			repositories: [],
			createdAt: now,
			updatedAt: now
		};
		workspace.repositories.push(state);
		workspace.updatedAt = now;
		await this.write(projectPath, workspace);
		return workspace;
	}
	async status(projectPath, artifactUid) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifactUid);
		if (workspace === void 0) throw new Error("development workspace has not been created");
		workspace.repositories = await Promise.all(workspace.repositories.map(repositoryState));
		workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await this.write(projectPath, workspace);
		return workspace;
	}
	async test(projectPath, project, artifactUid, repositoryId, testId) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifactUid);
		if (workspace === void 0) throw new Error("development workspace has not been created");
		const state = workspace.repositories.find((item) => item.id === repositoryId);
		if (state === void 0) throw new Error(`development repository has not been created: ${repositoryId}`);
		const command = repositoryConfig(project, repositoryId).testCommands.find((item) => item.id === testId);
		if (command === void 0) throw new Error(`test command is not configured: ${testId}`);
		const result = await run(command.argv, state.path, 6e5, true);
		state.lastTest = {
			id: command.id,
			passed: result.exitCode === 0,
			exitCode: result.exitCode,
			ranAt: (/* @__PURE__ */ new Date()).toISOString(),
			output: `${result.stdout}${result.stderr}`.slice(-64 * 1024)
		};
		Object.assign(state, await repositoryState(state));
		workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await this.write(projectPath, workspace);
		return workspace;
	}
	async commit(projectPath, artifactUid, repositoryId, message) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifactUid);
		if (workspace === void 0) throw new Error("development workspace has not been created");
		const state = workspace.repositories.find((item) => item.id === repositoryId);
		if (state === void 0) throw new Error(`development repository has not been created: ${repositoryId}`);
		if (message.trim() === "") throw new Error("commit message must not be empty");
		await run([
			"git",
			"add",
			"-A"
		], state.path);
		const staged = await run([
			"git",
			"diff",
			"--cached",
			"--quiet"
		], state.path, 12e4, true);
		if (staged.exitCode === 0) throw new Error("there are no changes to commit");
		if (staged.exitCode !== 1) throw new Error(`git diff --cached failed with ${staged.exitCode}`);
		await run([
			"git",
			"commit",
			"-m",
			message.trim()
		], state.path);
		Object.assign(state, await repositoryState(state));
		workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await this.write(projectPath, workspace);
		return workspace;
	}
	async write(projectPath, workspace) {
		await mkdir(join(projectPath, ".sdd", "development"), { recursive: true });
		await writeFile(developmentFile(projectPath, workspace.artifactUid), stringify(workspace), "utf8");
	}
};
//#endregion
//#region src/stage-definitions.ts
const COMMON = `你在一个由 Git 管理的 SDD 项目空间中工作。你只负责当前阶段，不得自动推进、接受或替代其他阶段。
每轮先核对已绑定交付件和输入材料，再回答用户。对话中形成的确定结论必须在同一轮同步进绑定交付件；未确认内容写入“待决问题”，不得伪装为事实。
只能更新当前绑定的 draft 或 in-review 交付件，不得修改 accepted 版本。保留 manifest.yaml 中的追踪关系，不得杜撰外部编号、代码提交、测试结果或验收状态。
完成回复前重新读取交付件，确保本轮结论已经落盘。若工具受策略限制，说明限制并请求用户在对应阶段执行。`;
const STAGE_RUNTIMES = {
	requirements: {
		id: "requirements",
		label: "需求讨论",
		role: "产品经理与业务分析师",
		objective: "把原始诉求转化为边界明确、可验证、可追踪的需求规格。",
		requiredSections: [
			"背景与目标",
			"范围",
			"用户与场景",
			"功能需求",
			"非功能需求",
			"验收条件",
			"待决问题"
		],
		completionChecklist: [
			"目标和业务价值明确",
			"范围内与范围外明确",
			"每项需求具有可验证验收条件",
			"非功能约束已确认",
			"外部来源与待决问题可追踪"
		],
		toolPolicy: {
			allowShell: false,
			writableArea: "artifact-only",
			forbiddenTools: [
				"bash",
				"pwsh",
				"terminal_open",
				"terminal_send",
				"terminal_signal"
			]
		},
		systemPrompt: `${COMMON}\n\n当前阶段：需求讨论。你的角色是产品经理与业务分析师。重点追问目标、用户、场景、业务规则、边界、异常和验收条件。避免提前决定实现技术。`
	},
	prototype: {
		id: "prototype",
		label: "原型输出",
		role: "产品设计师与 UX 设计师",
		objective: "把已接受需求转化为可评审的用户流程、页面与交互状态规格。",
		requiredSections: [
			"设计目标",
			"用户流程",
			"页面清单",
			"交互规则",
			"状态与异常",
			"原型资源",
			"待决问题"
		],
		completionChecklist: [
			"关键用户流程闭环",
			"页面及入口出口完整",
			"加载空态错误态权限态明确",
			"交互规则可验证",
			"原型资源和需求来源可追踪"
		],
		toolPolicy: {
			allowShell: false,
			writableArea: "artifact-only",
			forbiddenTools: [
				"bash",
				"pwsh",
				"terminal_open",
				"terminal_send",
				"terminal_signal"
			]
		},
		systemPrompt: `${COMMON}\n\n当前阶段：原型输出。你的角色是产品设计师与 UX 设计师。围绕用户任务设计信息架构、页面、状态和交互，不改变已接受需求；发现冲突时记录为待决问题。`
	},
	architecture: {
		id: "architecture",
		label: "系统设计",
		role: "架构师与技术负责人",
		objective: "在约束内形成可实施、可演进、可验证的系统设计和架构决策。",
		requiredSections: [
			"设计目标",
			"上下文与约束",
			"总体架构",
			"模块职责",
			"数据设计",
			"接口与集成",
			"部署与安全",
			"架构决策"
		],
		completionChecklist: [
			"需求和约束有设计响应",
			"模块边界与职责明确",
			"数据和接口契约明确",
			"安全部署和失败处理明确",
			"关键权衡以架构决策记录"
		],
		toolPolicy: {
			allowShell: false,
			writableArea: "artifact-only",
			forbiddenTools: [
				"bash",
				"pwsh",
				"terminal_open",
				"terminal_send",
				"terminal_signal"
			]
		},
		systemPrompt: `${COMMON}\n\n当前阶段：系统设计。你的角色是架构师与技术负责人。给出模块、数据、接口、部署、安全和演进设计；重要选择必须记录备选方案、权衡与决策。此阶段不编写业务代码。`
	},
	specification: {
		id: "specification",
		label: "规格设计",
		role: "技术负责人、开发与测试设计者",
		objective: "把已接受设计转化为开发和测试可以无歧义执行的实现规格。",
		requiredSections: [
			"实现目标",
			"输入依据",
			"功能规格",
			"接口契约",
			"状态与数据规则",
			"异常处理",
			"验收测试规格",
			"追踪关系"
		],
		completionChecklist: [
			"功能规则无歧义",
			"接口输入输出和错误明确",
			"状态与数据不变量明确",
			"异常和边界条件明确",
			"每项规格具有验收测试和追踪关系"
		],
		toolPolicy: {
			allowShell: false,
			writableArea: "artifact-only",
			forbiddenTools: [
				"bash",
				"pwsh",
				"terminal_open",
				"terminal_send",
				"terminal_signal"
			]
		},
		systemPrompt: `${COMMON}\n\n当前阶段：规格设计。你的角色是技术负责人、开发与测试设计者。输出可直接实现和测试的行为、接口、状态、数据、异常及验收测试规格；不要开始修改产品代码。`
	},
	development: {
		id: "development",
		label: "开发测试",
		role: "开发工程师、测试工程师与 Reviewer",
		objective: "在隔离代码空间中实现已接受规格，以测试和代码证据形成可合并交付。",
		requiredSections: [
			"实现范围",
			"代码仓库与分支",
			"变更摘要",
			"测试计划",
			"测试结果",
			"提交与合并记录",
			"遗留问题"
		],
		completionChecklist: [
			"实现范围与规格一致",
			"代码只在绑定隔离空间修改",
			"相关测试已执行并记录",
			"代码差异和提交可追踪",
			"遗留问题与合并状态明确"
		],
		toolPolicy: {
			allowShell: true,
			writableArea: "artifact-and-development",
			forbiddenTools: [
				"terminal_open",
				"terminal_send",
				"terminal_signal"
			]
		},
		systemPrompt: `${COMMON}\n\n当前阶段：开发测试。你的角色是开发工程师、测试工程师与 Reviewer。产品代码只能在绑定的 .sdd-workspaces 隔离目录中修改；所有 shell 调用（macOS/Linux 的 bash 或 Windows 的 pwsh）必须显式把 workdir 设置为绑定的代码仓库目录。先读取规格，再实现、测试、审查差异，并把真实命令和结果同步到开发交付件。未经用户明确操作不得推送或合并。`
	}
};
function runtimeDefinition(stage) {
	return STAGE_RUNTIMES[stage];
}
//#endregion
//#region src/quality.ts
const PLACEHOLDERS = [
	"待补充",
	"TODO",
	"TBD",
	"待确认"
];
function sectionBodies(markdown) {
	const result = /* @__PURE__ */ new Map();
	const matches = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
	matches.forEach((match, index) => {
		const start = match.index + match[0].length;
		const end = matches[index + 1]?.index ?? markdown.length;
		result.set(match[1].trim(), markdown.slice(start, end).trim());
	});
	return result;
}
function check(code, label, passed, message, warning = false) {
	return {
		code,
		label,
		status: passed ? "passed" : warning ? "warning" : "failed",
		message
	};
}
function developmentChecks(workspace) {
	if (workspace === void 0) return [check("development-workspace", "隔离开发空间", false, "尚未创建隔离代码工作空间")];
	const tests = workspace.repositories.map((repository) => repository.lastTest).filter((result) => result !== void 0);
	return [
		check("development-workspace", "隔离开发空间", workspace.repositories.length > 0, `已配置 ${workspace.repositories.length} 个代码仓库`),
		check("development-commit", "代码提交", workspace.repositories.some((repository) => repository.headCommit !== repository.baseCommit), "至少一个仓库需要形成独立提交"),
		check("development-test", "测试证据", tests.length > 0 && tests.every((result) => result.passed), tests.length === 0 ? "尚未执行配置的测试" : "最近测试必须全部通过"),
		check("development-clean", "未提交变更", workspace.repositories.every((repository) => repository.changedFiles === 0), "交付前隔离空间不应留有未提交变更")
	];
}
function evaluateQuality(artifact, content, project, snapshot, checkedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	const definition = runtimeDefinition(artifact.stage);
	const bodies = sectionBodies(content);
	const checks = [];
	for (const section of definition.requiredSections) {
		const body = bodies.get(section);
		checks.push(check(`section:${section}`, `章节：${section}`, body !== void 0 && body.length >= 2, body === void 0 ? "缺少必填章节" : "章节内容不能为空"));
		if (body !== void 0) checks.push(check(`placeholder:${section}`, `占位内容：${section}`, !PLACEHOLDERS.some((value) => body.includes(value)), "章节仍包含待补充或待确认占位内容"));
	}
	const requiredStages = Object.entries(project.dependencies[artifact.stage] ?? {}).filter(([, mode]) => mode === "required").map(([stage]) => stage);
	for (const stage of requiredStages) {
		const traced = artifact.basedOn.some((reference) => snapshot.artifacts.some((input) => input.uid === reference.uid && input.stage === stage && input.status === "accepted"));
		checks.push(check(`input:${stage}`, `必需输入：${stage}`, traced, `必须关联一个已接受的 ${stage} 交付件`));
	}
	definition.completionChecklist.forEach((label, index) => {
		const selected = artifact.checklist?.[`item-${index + 1}`] === true;
		checks.push(check(`checklist:${index + 1}`, `验收：${label}`, selected, "需要由负责人确认", true));
	});
	if (artifact.stage === "development") checks.push(...developmentChecks(snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)));
	checks.push(check("manifest", "交付件 Manifest", artifact.validationErrors.length === 0, artifact.validationErrors.join("; ") || "Manifest 有效"));
	const failed = checks.filter((item) => item.status === "failed").length;
	const checklistReady = checks.filter((item) => item.code.startsWith("checklist:")).every((item) => item.status === "passed");
	const passed = checks.filter((item) => item.status === "passed").length;
	return {
		artifactUid: artifact.uid,
		stage: artifact.stage,
		checkedAt,
		ready: failed === 0 && checklistReady,
		score: checks.length === 0 ? 100 : Math.round(passed / checks.length * 100),
		checks
	};
}
//#endregion
//#region src/project-service.ts
const PROJECT_FILE = ".sdd/project.yaml";
const BUSINESS_GUIDE = `# 项目业务扩展

本目录是当前 SDD 项目唯一的项目级业务自定义目录。

- \`connectors/\`：命令型 Connector 配置。
- \`adapters/\`：Connector 调用的业务适配器脚本和脚本自己的模块。

适配器从 stdin 接收一个 JSON 请求，只能把一个符合 \`dsh-sdd/source@1\` 的 JSON 对象写到 stdout；日志应写到 stderr。凭证不得提交到仓库，Connector 只声明允许继承的环境变量名。

完整开发说明见 dsh-e2e-dev-sdd 插件的 \`docs/business-development-guide.md\`。
`;
function request(payload) {
	return {
		rpcId: `sdd-${randomUUID()}`,
		payload
	};
}
function slug(value) {
	return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "artifact";
}
async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
async function walkForManifest(root) {
	if (!await exists(root)) return [];
	const result = [];
	const visit = async (dir) => {
		for (const item of await readdir(dir, { withFileTypes: true })) {
			const path = join(dir, item.name);
			if (item.isDirectory()) await visit(path);
			else if (item.isFile() && item.name === "manifest.yaml") result.push(path);
		}
	};
	await visit(root);
	return result.sort();
}
function defaultProject(path) {
	return {
		schema: "dsh-sdd/project@1",
		project: {
			key: slug(basename(path)),
			name: basename(path)
		},
		identifiers: {
			internal: { strategy: "uuid" },
			namespaces: Object.fromEntries(STAGES.map((stage) => [stage.id, {
				strategy: "template",
				template: `${stage.prefix}-{sequence:04}`,
				sequenceScope: "project"
			}]))
		},
		sources: {},
		dependencies: {
			requirements: {},
			prototype: { requirements: "required" },
			architecture: {
				requirements: "required",
				prototype: "optional"
			},
			specification: {
				requirements: "required",
				prototype: "optional",
				architecture: "required"
			},
			development: {
				requirements: "optional",
				prototype: "optional",
				architecture: "optional",
				specification: "required"
			}
		},
		development: {
			workspaceRoot: ".sdd-workspaces",
			branchPattern: "sdd/{artifactKey}",
			mergeStrategy: "pull-request",
			repositories: []
		}
	};
}
function validateManifest(value, entryExists) {
	if (typeof value !== "object" || value === null) return ["manifest must be an object"];
	const manifest = value;
	const errors = [];
	if (manifest.schema !== "dsh-sdd/artifact@1") errors.push("schema must be dsh-sdd/artifact@1");
	for (const field of [
		"uid",
		"key",
		"title",
		"stage",
		"type",
		"version",
		"status",
		"entry"
	]) if (typeof manifest[field] !== "string" || manifest[field] === "") errors.push(`${field} is required`);
	if (!Array.isArray(manifest.basedOn)) errors.push("basedOn must be an array");
	if (!Array.isArray(manifest.derivedFrom)) errors.push("derivedFrom must be an array");
	if (!Array.isArray(manifest.externalRefs)) errors.push("externalRefs must be an array");
	if (typeof manifest.entry === "string" && !entryExists) errors.push(`entry does not exist: ${manifest.entry}`);
	return errors;
}
function object(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
	return typeof value === "string" && value.trim() !== "";
}
function validateProject(value) {
	const errors = [];
	if (!object(value)) return { errors: ["project.yaml：根节点必须是对象"] };
	if (value.schema !== "dsh-sdd/project@1") errors.push("schema：必须是 dsh-sdd/project@1");
	if (!object(value.project)) errors.push("project：必须是对象");
	else {
		if (!nonEmptyString(value.project.key)) errors.push("project.key：不能为空");
		if (!nonEmptyString(value.project.name)) errors.push("project.name：不能为空");
	}
	if (!object(value.identifiers)) errors.push("identifiers：必须是对象");
	else {
		if (!object(value.identifiers.internal) || value.identifiers.internal.strategy !== "uuid") errors.push("identifiers.internal.strategy：必须是 uuid");
		if (!object(value.identifiers.namespaces)) errors.push("identifiers.namespaces：必须是对象");
		else for (const [namespace, policy] of Object.entries(value.identifiers.namespaces)) {
			const base = `identifiers.namespaces.${namespace}`;
			if (!object(policy)) {
				errors.push(`${base}：必须是对象`);
				continue;
			}
			if (![
				"template",
				"manual",
				"external",
				"script",
				"provider"
			].includes(String(policy.strategy))) errors.push(`${base}.strategy：值无效`);
			if (policy.strategy === "template" && !nonEmptyString(policy.template)) errors.push(`${base}.template：模板策略必须配置模板`);
			if ((policy.strategy === "provider" || policy.strategy === "script") && !nonEmptyString(policy.provider)) errors.push(`${base}.provider：当前策略必须配置 Provider`);
		}
	}
	if (!object(value.sources)) errors.push("sources：必须是对象");
	else for (const [kind, binding] of Object.entries(value.sources)) if (!object(binding) || !nonEmptyString(binding.provider)) errors.push(`sources.${kind}.provider：不能为空`);
	else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(binding.provider))) errors.push(`sources.${kind}.provider：必须使用 kebab-case`);
	if (!object(value.dependencies)) errors.push("dependencies：必须是对象");
	else for (const [stageIndex, stage] of STAGES.entries()) {
		const dependencies = value.dependencies[stage.id];
		if (!object(dependencies)) {
			errors.push(`dependencies.${stage.id}：必须是对象`);
			continue;
		}
		for (const [inputStage, mode] of Object.entries(dependencies)) {
			const inputIndex = STAGES.findIndex((item) => item.id === inputStage);
			if (inputIndex < 0) errors.push(`dependencies.${stage.id}.${inputStage}：未知阶段`);
			else if (inputIndex >= stageIndex) errors.push(`dependencies.${stage.id}.${inputStage}：只能依赖当前阶段之前的阶段`);
			if (mode !== "required" && mode !== "optional" && mode !== "manual") errors.push(`dependencies.${stage.id}.${inputStage}：必须是 required、optional 或 manual`);
		}
	}
	if (!object(value.development)) errors.push("development：必须是对象");
	else {
		if (!nonEmptyString(value.development.workspaceRoot)) errors.push("development.workspaceRoot：不能为空");
		else if (isAbsolute(String(value.development.workspaceRoot)) || String(value.development.workspaceRoot).split(/[\\/]/).includes("..")) errors.push("development.workspaceRoot：必须是项目内的相对路径");
		if (!nonEmptyString(value.development.branchPattern)) errors.push("development.branchPattern：不能为空");
		else if (!String(value.development.branchPattern).includes("{artifactKey}")) errors.push("development.branchPattern：必须包含 {artifactKey}");
		if (![
			"pull-request",
			"local-merge",
			"manual"
		].includes(String(value.development.mergeStrategy))) errors.push("development.mergeStrategy：值无效");
		if (!Array.isArray(value.development.repositories)) errors.push("development.repositories：必须是数组");
		else value.development.repositories.forEach((repository, index) => {
			const base = `development.repositories[${index}]`;
			if (!object(repository)) {
				errors.push(`${base}：必须是对象`);
				return;
			}
			if (!nonEmptyString(repository.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(repository.id))) errors.push(`${base}.id：必须是非空 kebab-case`);
			if (!nonEmptyString(repository.source)) errors.push(`${base}.source：不能为空`);
			if (!nonEmptyString(repository.baseBranch)) errors.push(`${base}.baseBranch：不能为空`);
			if (!Array.isArray(repository.testCommands)) errors.push(`${base}.testCommands：必须是数组`);
			else repository.testCommands.forEach((command, commandIndex) => {
				const commandBase = `${base}.testCommands[${commandIndex}]`;
				if (!object(command) || !nonEmptyString(command.id) || !nonEmptyString(command.label) || !Array.isArray(command.argv) || command.argv.length === 0 || command.argv.some((argument) => !nonEmptyString(argument))) errors.push(`${commandBase}：需要有效的 id、label 和非空 argv`);
			});
		});
		if (Array.isArray(value.development.repositories)) {
			const ids = value.development.repositories.filter(object).map((repository) => repository.id).filter(nonEmptyString);
			if (new Set(ids).size !== ids.length) errors.push("development.repositories：仓库 id 不能重复");
		}
	}
	return errors.length === 0 ? {
		project: value,
		errors
	} : { errors };
}
var SddProjectService = class {
	api;
	sourceRegistry;
	identifierRegistry;
	sessionController;
	git;
	constructor(api, sourceRegistry, identifierRegistry, sessionController, git = new GitDevelopmentService()) {
		this.api = api;
		this.sourceRegistry = sourceRegistry;
		this.identifierRegistry = identifierRegistry;
		this.sessionController = sessionController;
		this.git = git;
	}
	async workspace(workspaceId) {
		const response = await this.api.workspace.list(request({}));
		if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`);
		const item = response.result.value.items.find((row) => row.workspaceId === workspaceId);
		if (item === void 0) throw new Error(`workspace not found: ${workspaceId}`);
		return {
			workspaceId,
			title: item.title,
			path: await realpath(item.path)
		};
	}
	async execute(action) {
		if (action.kind === "snapshot") return this.snapshot(action.workspaceId);
		if (action.kind === "initialize") {
			await this.initialize(action.workspaceId);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "reinitialize") {
			await this.reinitialize(action.workspaceId);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "create-draft") {
			await this.createDraft(action.workspaceId, action.stage, action.title, action.key, action.basedOn, action.sourceUids ?? []);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "accept") {
			await this.accept(action.workspaceId, action.artifactUid, action.checklist);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "quality") return this.snapshot(action.workspaceId);
		if (action.kind === "import-source") {
			await this.importSource(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "context") return { prompt: await this.context(action.workspaceId, action.stage, action.artifactUid, action.artifactUids, action.sourceUids ?? []) };
		if (action.kind === "bind-session") return this.bindSession(action.workspaceId, action.runUid, action.stage, action.artifactUid, action.sessionId, action.artifactUids, action.sourceUids ?? []);
		if (action.kind === "sync-run") {
			await this.syncRun(action.workspaceId, action.runUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "complete-run") {
			await this.completeRun(action.workspaceId, action.runUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-create") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			const artifact = this.requireArtifact(snapshot, action.artifactUid);
			await this.git.create(snapshot.workspace.path, snapshot.project, artifact, action.repositoryId);
			await appendEvent(snapshot.workspace.path, "development.workspace-created", artifact.key, artifact.stage, { repositoryId: action.repositoryId });
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-status") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.git.status(snapshot.workspace.path, action.artifactUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-test") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			const artifact = this.requireArtifact(snapshot, action.artifactUid);
			const result = (await this.git.test(snapshot.workspace.path, snapshot.project, artifact.uid, action.repositoryId, action.testId)).repositories.find((item) => item.id === action.repositoryId)?.lastTest;
			await appendEvent(snapshot.workspace.path, "test.completed", artifact.key, artifact.stage, {
				repositoryId: action.repositoryId,
				testId: action.testId,
				passed: result?.passed ?? false
			});
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-commit") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			const artifact = this.requireArtifact(snapshot, action.artifactUid);
			const headCommit = (await this.git.commit(snapshot.workspace.path, artifact.uid, action.repositoryId, action.message)).repositories.find((item) => item.id === action.repositoryId)?.headCommit;
			await appendEvent(snapshot.workspace.path, "commit.created", artifact.key, artifact.stage, {
				repositoryId: action.repositoryId,
				headCommit
			});
			return this.snapshot(action.workspaceId);
		}
		throw new Error(`unsupported SDD action: ${action.kind}`);
	}
	async initialize(workspaceId) {
		const workspace = await this.workspace(workspaceId);
		const sddRoot = join(workspace.path, ".sdd");
		await mkdir(join(sddRoot, "artifacts"), { recursive: true });
		await mkdir(join(sddRoot, "sources"), { recursive: true });
		await mkdir(join(sddRoot, "business", "connectors"), { recursive: true });
		await mkdir(join(sddRoot, "business", "adapters"), { recursive: true });
		await mkdir(join(sddRoot, "runs"), { recursive: true });
		await mkdir(join(sddRoot, "events"), { recursive: true });
		await mkdir(join(sddRoot, "development"), { recursive: true });
		for (const stage of STAGES) await mkdir(join(sddRoot, "artifacts", stage.id), { recursive: true });
		const businessGuidePath = join(sddRoot, "business", "README.md");
		if (!await exists(businessGuidePath)) await writeFile(businessGuidePath, BUSINESS_GUIDE, "utf8");
		const projectPath = join(workspace.path, PROJECT_FILE);
		const created = !await exists(projectPath);
		if (created) await writeFile(projectPath, stringify(defaultProject(workspace.path)), "utf8");
		const gitignorePath = join(workspace.path, ".gitignore");
		const gitignore = await exists(gitignorePath) ? await readFile(gitignorePath, "utf8") : "";
		if (!gitignore.split(/\r?\n/).includes(".sdd-workspaces/")) await writeFile(gitignorePath, `${gitignore === "" || gitignore.endsWith("\n") ? gitignore : `${gitignore}\n`}\n# DSH SDD per-requirement isolated checkouts\n.sdd-workspaces/\n`, "utf8");
		if (created) await appendEvent(workspace.path, "project.initialized", basename(workspace.path), void 0, { projectFile: PROJECT_FILE });
	}
	async reinitialize(workspaceId) {
		const workspace = await this.workspace(workspaceId);
		const projectPath = join(workspace.path, PROJECT_FILE);
		if (await exists(projectPath)) {
			const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
			await copyFile(projectPath, join(workspace.path, ".sdd", `project.invalid-${timestamp}.yaml`));
		}
		await this.initialize(workspaceId);
		await writeFile(projectPath, stringify(defaultProject(workspace.path)), "utf8");
		await appendEvent(workspace.path, "project.reinitialized", basename(workspace.path), void 0, { backupCreated: true });
	}
	async snapshot(workspaceId) {
		const workspace = await this.workspace(workspaceId);
		const projectPath = join(workspace.path, PROJECT_FILE);
		if (!await exists(projectPath)) return {
			workspace,
			initialized: false,
			configuration: {
				status: "missing",
				path: PROJECT_FILE,
				errors: []
			},
			artifacts: [],
			sources: [],
			sourceProviders: this.sourceRegistry?.names() ?? [],
			runs: [],
			quality: {},
			developmentWorkspaces: [],
			dashboard: this.emptyDashboard()
		};
		let parsedProject;
		try {
			parsedProject = parse(await readFile(projectPath, "utf8"));
		} catch (error) {
			return {
				workspace,
				initialized: true,
				configuration: {
					status: "invalid",
					path: PROJECT_FILE,
					errors: [`YAML 解析失败：${error instanceof Error ? error.message : String(error)}`]
				},
				artifacts: [],
				sources: [],
				sourceProviders: this.sourceRegistry?.names() ?? [],
				runs: [],
				quality: {},
				developmentWorkspaces: [],
				dashboard: this.emptyDashboard()
			};
		}
		const validation = validateProject(parsedProject);
		if (validation.project === void 0) return {
			workspace,
			initialized: true,
			configuration: {
				status: "invalid",
				path: PROJECT_FILE,
				errors: validation.errors
			},
			artifacts: [],
			sources: [],
			sourceProviders: this.sourceRegistry?.names() ?? [],
			runs: [],
			quality: {},
			developmentWorkspaces: [],
			dashboard: this.emptyDashboard()
		};
		const parsed = validation.project;
		const project = {
			...parsed,
			sources: parsed.sources ?? {},
			development: {
				...parsed.development,
				repositories: parsed.development?.repositories ?? []
			}
		};
		const artifacts = [];
		for (const manifestPath of await walkForManifest(join(workspace.path, ".sdd", "artifacts"))) try {
			const parsedManifest = parse(await readFile(manifestPath, "utf8"));
			const manifest = {
				...parsedManifest,
				basedOn: parsedManifest.basedOn ?? [],
				derivedFrom: parsedManifest.derivedFrom ?? [],
				externalRefs: parsedManifest.externalRefs ?? [],
				checklist: parsedManifest.checklist ?? {}
			};
			const entryPath = typeof manifest.entry === "string" ? join(dirname(manifestPath), manifest.entry) : manifestPath;
			const entryExists = await exists(entryPath);
			const validationErrors = validateManifest(manifest, entryExists);
			if (entryExists && manifest.status === "accepted") {
				const actualHash = `sha256:${createHash("sha256").update(await readFile(entryPath)).digest("hex")}`;
				if (manifest.contentHash === void 0) validationErrors.push("accepted artifact is missing contentHash");
				else if (manifest.contentHash !== actualHash) validationErrors.push("accepted artifact content differs from its frozen hash");
			}
			artifacts.push({
				...manifest,
				relativeDirectory: relative(workspace.path, dirname(manifestPath)),
				validationErrors
			});
		} catch (error) {
			artifacts.push({
				schema: "dsh-sdd/artifact@1",
				uid: manifestPath,
				key: "INVALID",
				title: basename(dirname(manifestPath)),
				stage: "requirements",
				type: "invalid",
				version: "0.0.0",
				status: "draft",
				entry: "",
				createdAt: "",
				updatedAt: "",
				basedOn: [],
				derivedFrom: [],
				externalRefs: [],
				relativeDirectory: relative(workspace.path, dirname(manifestPath)),
				validationErrors: [error instanceof Error ? error.message : String(error)]
			});
		}
		const sources = await this.listSources(workspace.path);
		const runs = await this.listRuns(workspace.path);
		const developmentWorkspaces = await listDevelopmentWorkspaces(workspace.path, artifacts);
		for (const run of runs) {
			if (run.status === "completed" || run.sessionId === void 0) continue;
			const artifact = artifacts.find((item) => item.uid === run.artifactUid);
			if (artifact !== void 0) this.bindRuntime(run.sessionId, run.stage, workspace.path, project, artifact, developmentWorkspaces.find((item) => item.artifactUid === artifact.uid));
		}
		const quality = {};
		const partial = {
			artifacts,
			developmentWorkspaces
		};
		for (const artifact of artifacts) {
			if (artifact.entry === "" || !await exists(join(workspace.path, artifact.relativeDirectory, artifact.entry))) continue;
			quality[artifact.uid] = evaluateQuality(artifact, await readFile(join(workspace.path, artifact.relativeDirectory, artifact.entry), "utf8"), project, partial);
		}
		const recentEvents = await readRecentEvents(workspace.path);
		const dashboard = this.dashboard(artifacts, sources, quality, developmentWorkspaces, recentEvents);
		return {
			workspace,
			initialized: true,
			configuration: {
				status: "valid",
				path: PROJECT_FILE,
				errors: []
			},
			project,
			artifacts,
			sources,
			sourceProviders: this.sourceRegistry?.names() ?? [],
			runs,
			quality,
			developmentWorkspaces,
			dashboard
		};
	}
	async createDraft(workspaceId, stage, title, requestedKey, basedOn, sourceUids) {
		if (title.trim() === "") throw new Error("title must not be empty");
		await this.initialize(workspaceId);
		const snapshot = await this.snapshot(workspaceId);
		const definition = stageDefinition(stage);
		const key = requestedKey?.trim() || await this.allocateKey(snapshot, stage, definition.prefix);
		if (snapshot.artifacts.some((item) => item.key === key)) throw new Error(`artifact key already exists: ${key}`);
		const uid = randomUUID();
		const directory = join(snapshot.workspace.path, ".sdd", "artifacts", stage, `${slug(key)}-${uid.slice(0, 8)}`);
		await mkdir(directory, { recursive: true });
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const refs = basedOn.map((inputUid) => {
			const input = snapshot.artifacts.find((item) => item.uid === inputUid);
			if (input === void 0) throw new Error(`input artifact not found: ${inputUid}`);
			if (input.status !== "accepted") throw new Error(`input artifact is not accepted: ${input.key}`);
			if (input.validationErrors.length > 0) throw new Error(`input artifact is invalid: ${input.key}: ${input.validationErrors.join("; ")}`);
			return {
				uid: input.uid,
				version: input.version,
				contentHash: input.contentHash
			};
		});
		const sourceRefs = sourceUids.map((sourceUid) => {
			const source = snapshot.sources.find((item) => item.uid === sourceUid);
			if (source === void 0) throw new Error(`source not found: ${sourceUid}`);
			if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join("; ")}`);
			return {
				uid: source.uid,
				provider: source.provider,
				kind: source.kind,
				...source.externalKey === void 0 ? {} : { externalKey: source.externalKey },
				...source.contentHash === void 0 ? {} : { contentHash: source.contentHash }
			};
		});
		const requiredStages = Object.entries(snapshot.project?.dependencies[stage] ?? {}).filter(([, mode]) => mode === "required").map(([requiredStage]) => requiredStage);
		for (const requiredStage of requiredStages) if (!refs.some((ref) => snapshot.artifacts.find((item) => item.uid === ref.uid)?.stage === requiredStage)) throw new Error(`missing required ${requiredStage} input for ${stage}`);
		const manifest = {
			schema: "dsh-sdd/artifact@1",
			uid,
			key,
			title: title.trim(),
			stage,
			type: definition.outputType,
			version: "0.1.0",
			status: "draft",
			entry: "deliverable.md",
			createdAt: now,
			updatedAt: now,
			basedOn: refs,
			derivedFrom: sourceRefs,
			externalRefs: [],
			checklist: Object.fromEntries(runtimeDefinition(stage).completionChecklist.map((_label, index) => [`item-${index + 1}`, false]))
		};
		await writeFile(join(directory, "manifest.yaml"), stringify(manifest), "utf8");
		await writeFile(join(directory, "deliverable.md"), this.template(stage, key, title.trim()), "utf8");
		await appendEvent(snapshot.workspace.path, "artifact.created", key, stage, { artifactUid: uid });
	}
	nextKey(artifacts, prefix) {
		const expression = new RegExp(`^${prefix}-(\\d+)$`);
		const largest = artifacts.reduce((value, item) => {
			const match = expression.exec(item.key);
			return match === null ? value : Math.max(value, Number(match[1]));
		}, 0);
		return `${prefix}-${String(largest + 1).padStart(4, "0")}`;
	}
	async allocateKey(snapshot, stage, prefix) {
		const policy = snapshot.project?.identifiers.namespaces[stage];
		if (policy?.strategy === "manual" || policy?.strategy === "external") throw new Error(`identifier for ${stage} must be supplied manually`);
		if (policy?.strategy === "provider" || policy?.strategy === "script") {
			const providerName = policy.provider;
			if (providerName === void 0) throw new Error(`identifier provider is not configured for ${stage}`);
			const provider = this.identifierRegistry?.get(providerName);
			if (provider === void 0) throw new Error(`identifier provider not found: ${providerName}`);
			const key = (await provider.allocate({
				namespace: stage,
				project: snapshot.project,
				workspacePath: snapshot.workspace.path,
				signal: AbortSignal.timeout(3e4)
			})).trim();
			if (key === "") throw new Error(`identifier provider "${providerName}" returned an empty key`);
			return key;
		}
		return this.nextKey(snapshot.artifacts, prefix);
	}
	async listSources(workspacePath) {
		const root = join(workspacePath, ".sdd", "sources");
		if (!await exists(root)) return [];
		const result = [];
		for (const item of await readdir(root, { withFileTypes: true })) {
			if (!item.isFile() || !item.name.endsWith(".yaml") && !item.name.endsWith(".yml")) continue;
			const path = join(root, item.name);
			try {
				const source = validateSourceEnvelope(parse(await readFile(path, "utf8")));
				const validationErrors = [];
				const actualHash = `sha256:${createHash("sha256").update(JSON.stringify(source.content)).digest("hex")}`;
				if (source.contentHash === void 0) validationErrors.push("source is missing contentHash");
				else if (source.contentHash !== actualHash) validationErrors.push("source content differs from its recorded hash");
				result.push({
					...source,
					relativePath: relative(workspacePath, path),
					validationErrors
				});
			} catch (error) {
				result.push({
					schema: "dsh-sdd/source@1",
					uid: path,
					provider: "invalid",
					kind: "invalid",
					title: item.name,
					fetchedAt: "",
					content: null,
					relativePath: relative(workspacePath, path),
					validationErrors: [error instanceof Error ? error.message : String(error)]
				});
			}
		}
		return result.sort((left, right) => left.title.localeCompare(right.title));
	}
	async importSource(workspaceId, providerName, kind, key, connector) {
		if (kind.trim() === "" || key.trim() === "") throw new Error("source kind and key are required");
		await this.initialize(workspaceId);
		const snapshot = await this.snapshot(workspaceId);
		if (snapshot.project === void 0) throw new Error("SDD project is not initialized");
		if (this.sourceRegistry === void 0) throw new Error("source registry is unavailable");
		const source = await this.sourceRegistry.fetch(providerName, {
			kind: kind.trim(),
			key: key.trim(),
			workspace: {
				workspaceId,
				path: snapshot.workspace.path,
				project: snapshot.project
			},
			...connector === void 0 ? {} : { connector },
			signal: AbortSignal.timeout(6e4)
		});
		const normalized = {
			...source,
			contentHash: `sha256:${createHash("sha256").update(JSON.stringify(source.content)).digest("hex")}`
		};
		const filename = `${slug(normalized.provider)}-${slug(normalized.externalKey ?? key)}-${normalized.uid.slice(0, 8)}.yaml`;
		await writeFile(join(snapshot.workspace.path, ".sdd", "sources", filename), stringify(normalized), "utf8");
		await appendEvent(snapshot.workspace.path, "source.imported", normalized.externalKey ?? normalized.uid, void 0, {
			provider: normalized.provider,
			kind: normalized.kind
		});
	}
	template(stage, key, title) {
		return `# ${key} ${title}\n\n${{
			requirements: [
				"背景与目标",
				"范围",
				"用户与场景",
				"功能需求",
				"非功能需求",
				"验收条件",
				"待决问题"
			],
			prototype: [
				"设计目标",
				"用户流程",
				"页面清单",
				"交互规则",
				"状态与异常",
				"原型资源",
				"待决问题"
			],
			architecture: [
				"设计目标",
				"上下文与约束",
				"总体架构",
				"模块职责",
				"数据设计",
				"接口与集成",
				"部署与安全",
				"架构决策"
			],
			specification: [
				"实现目标",
				"输入依据",
				"功能规格",
				"接口契约",
				"状态与数据规则",
				"异常处理",
				"验收测试规格",
				"追踪关系"
			],
			development: [
				"实现范围",
				"代码仓库与分支",
				"变更摘要",
				"测试计划",
				"测试结果",
				"提交与合并记录",
				"遗留问题"
			]
		}[stage].map((section) => `## ${section}\n\n待补充。`).join("\n\n")}\n`;
	}
	async accept(workspaceId, artifactUid, checklist) {
		let snapshot = await this.snapshot(workspaceId);
		let artifact = snapshot.artifacts.find((item) => item.uid === artifactUid);
		if (artifact === void 0) throw new Error(`artifact not found: ${artifactUid}`);
		if (artifact.status !== "draft" && artifact.status !== "in-review") throw new Error(`artifact cannot be accepted from ${artifact.status}`);
		if (artifact.validationErrors.length > 0) throw new Error(`artifact validation failed: ${artifact.validationErrors.join("; ")}`);
		const directory = resolve(snapshot.workspace.path, artifact.relativeDirectory);
		const entryPath = resolve(directory, artifact.entry);
		const entryRelative = relative(directory, entryPath);
		if (entryRelative.startsWith("..") || isAbsolute(entryRelative)) throw new Error("artifact entry escapes its directory");
		const content = await readFile(entryPath, "utf8");
		if (content.trim() === "") throw new Error("artifact entry is empty");
		if (content.includes("待补充。")) throw new Error("artifact still contains template placeholders");
		const manifestPath = join(directory, "manifest.yaml");
		const manifest = parse(await readFile(manifestPath, "utf8"));
		if (checklist !== void 0) manifest.checklist = checklist;
		manifest.status = "in-review";
		manifest.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await writeFile(manifestPath, stringify(manifest), "utf8");
		snapshot = await this.snapshot(workspaceId);
		artifact = this.requireArtifact(snapshot, artifactUid);
		const report = snapshot.quality[artifactUid];
		if (report === void 0 || !report.ready) {
			const failures = report?.checks.filter((item) => item.status === "failed").map((item) => item.label) ?? ["质量报告不可用"];
			throw new Error(`artifact quality gates failed: ${failures.join("; ")}`);
		}
		manifest.status = "accepted";
		manifest.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		manifest.contentHash = `sha256:${createHash("sha256").update(content).digest("hex")}`;
		await writeFile(manifestPath, stringify(manifest), "utf8");
		await appendEvent(snapshot.workspace.path, "artifact.accepted", artifact.key, artifact.stage, { artifactUid });
	}
	async context(workspaceId, stage, artifactUid, artifactUids, sourceUids) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const target = this.requireArtifact(snapshot, artifactUid);
		if (target.stage !== stage) throw new Error(`bound artifact belongs to ${target.stage}, not ${stage}`);
		if (target.status !== "draft" && target.status !== "in-review") throw new Error("conversation must bind to a draft or in-review artifact");
		const expectedArtifacts = new Set(target.basedOn.map((item) => item.uid));
		const expectedSources = new Set(target.derivedFrom.map((item) => item.uid));
		if (artifactUids.length !== expectedArtifacts.size || artifactUids.some((uid) => !expectedArtifacts.has(uid))) throw new Error("conversation artifact inputs must match the bound artifact manifest");
		if (sourceUids.length !== expectedSources.size || sourceUids.some((uid) => !expectedSources.has(uid))) throw new Error("conversation source inputs must match the bound artifact manifest");
		const selected = artifactUids.map((uid) => {
			const artifact = snapshot.artifacts.find((item) => item.uid === uid);
			if (artifact === void 0) throw new Error(`artifact not found: ${uid}`);
			if (artifact.status !== "accepted") throw new Error(`artifact is not accepted: ${artifact.key}`);
			if (artifact.validationErrors.length > 0) throw new Error(`artifact is invalid: ${artifact.key}: ${artifact.validationErrors.join("; ")}`);
			return artifact;
		});
		const definition = stageDefinition(stage);
		const runtime = runtimeDefinition(stage);
		const required = Object.entries(snapshot.project.dependencies[stage] ?? {}).filter(([, mode]) => mode === "required").map(([id]) => id);
		for (const requiredStage of required) if (!selected.some((item) => item.stage === requiredStage)) throw new Error(`conversation input is missing required ${requiredStage} artifact`);
		const inputs = [];
		for (const artifact of selected) {
			const path = join(snapshot.workspace.path, artifact.relativeDirectory, artifact.entry);
			inputs.push(`\n## 输入 ${artifact.key} v${artifact.version}\n来源：${artifact.relativeDirectory}/${artifact.entry}\n内容哈希：${artifact.contentHash ?? "未记录"}\n\n${await readFile(path, "utf8")}`);
		}
		for (const uid of sourceUids) {
			const source = snapshot.sources.find((item) => item.uid === uid);
			if (source === void 0) throw new Error(`source not found: ${uid}`);
			if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join("; ")}`);
			inputs.push(`\n## 原始来源 ${source.externalKey ?? source.uid} · ${source.title}\nProvider：${source.provider}\n类型：${source.kind}\n内容哈希：${source.contentHash}\n\n${stringify(source.content)}`);
		}
		return [
			`你正在执行 DSH SDD 的“${definition.label}”阶段，角色侧重：${definition.role}。`,
			`项目仓库：${snapshot.workspace.path}`,
			`本次固定绑定交付件：${target.key}，路径 ${target.relativeDirectory}/${target.entry}。`,
			`阶段目标：${runtime.objective}`,
			`完成清单：\n${runtime.completionChecklist.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
			"先检查输入完整性，再与用户讨论。每轮形成的确定结论必须同步写入绑定交付件；不得创建或切换到另一个交付件。",
			...inputs
		].join("\n\n");
	}
	async bindSession(workspaceId, runUid, stage, artifactUid, sessionId, artifactUids, sourceUids) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const prompt = await this.context(workspaceId, stage, artifactUid, artifactUids, sourceUids);
		if (runUid === void 0 && snapshot.runs.some((item) => item.artifactUid === artifactUid && item.status !== "completed")) throw new Error("artifact already has an active stage run; resume that run instead");
		const existing = runUid === void 0 ? void 0 : snapshot.runs.find((item) => item.uid === runUid);
		if (runUid !== void 0 && existing === void 0) throw new Error(`stage run not found: ${runUid}`);
		if (existing !== void 0 && existing.artifactUid !== artifactUid) throw new Error("stage run is bound to another artifact");
		if (existing?.status === "completed") throw new Error("completed stage run cannot be resumed");
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const run = existing === void 0 ? {
			schema: "dsh-sdd/run@1",
			uid: randomUUID(),
			stage,
			artifactUid,
			sessionId,
			status: "active",
			startedAt: now,
			updatedAt: now,
			inputArtifactUids: [...artifactUids],
			sourceUids: [...sourceUids]
		} : {
			...existing,
			sessionId,
			status: "active",
			updatedAt: now,
			inputArtifactUids: [...artifactUids],
			sourceUids: [...sourceUids]
		};
		if (this.sessionController === void 0) throw new Error("stage session runtime is unavailable");
		this.bindRuntime(sessionId, stage, snapshot.workspace.path, snapshot.project, artifact, snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifactUid));
		await this.writeRun(snapshot.workspace.path, run);
		await appendEvent(snapshot.workspace.path, existing === void 0 ? "run.started" : "run.resumed", artifact.key, stage, {
			runUid: run.uid,
			sessionId
		});
		return {
			prompt,
			run
		};
	}
	async syncRun(workspaceId, runUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const run = snapshot.runs.find((item) => item.uid === runUid);
		if (run === void 0) throw new Error(`stage run not found: ${runUid}`);
		if (run.status === "completed") return;
		const artifact = this.requireArtifact(snapshot, run.artifactUid);
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const report = snapshot.quality[artifact.uid];
		await this.writeRun(snapshot.workspace.path, {
			...run,
			status: report?.ready ? "ready-for-review" : "active",
			updatedAt: now,
			lastSyncedAt: now
		});
		await appendEvent(snapshot.workspace.path, "run.synced", artifact.key, artifact.stage, {
			runUid,
			qualityScore: report?.score ?? 0
		});
	}
	async completeRun(workspaceId, runUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const run = snapshot.runs.find((item) => item.uid === runUid);
		if (run === void 0) throw new Error(`stage run not found: ${runUid}`);
		const artifact = this.requireArtifact(snapshot, run.artifactUid);
		if (artifact.status !== "accepted") throw new Error("stage run can complete only after its artifact is accepted");
		await this.writeRun(snapshot.workspace.path, {
			...run,
			status: "completed",
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		if (run.sessionId !== void 0) this.sessionController?.unbind(run.sessionId);
		await appendEvent(snapshot.workspace.path, "run.completed", artifact.key, artifact.stage, { runUid });
	}
	async listRuns(workspacePath) {
		const root = join(workspacePath, ".sdd", "runs");
		if (!await exists(root)) return [];
		const runs = [];
		for (const file of (await readdir(root)).filter((name) => name.endsWith(".yaml")).sort()) try {
			runs.push(parse(await readFile(join(root, file), "utf8")));
		} catch {}
		return runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	}
	async writeRun(workspacePath, run) {
		await mkdir(join(workspacePath, ".sdd", "runs"), { recursive: true });
		await writeFile(join(workspacePath, ".sdd", "runs", `${run.uid}.yaml`), stringify(run), "utf8");
	}
	bindRuntime(sessionId, stage, workspacePath, project, artifact, development) {
		this.sessionController?.bind({
			sessionId,
			stage,
			projectPath: workspacePath,
			artifactDirectory: resolve(workspacePath, artifact.relativeDirectory),
			developmentDirectories: development?.repositories.map((item) => item.path) ?? [],
			systemPrompt: [
				`绑定项目：${project.project.key} · ${project.project.name}`,
				`绑定交付件：${artifact.key} (${artifact.uid})`,
				`交付件入口：${resolve(workspacePath, artifact.relativeDirectory, artifact.entry)}`,
				development === void 0 ? "" : `隔离代码目录：\n${development.repositories.map((item) => `- ${item.id}: ${item.path}`).join("\n")}`
			].filter(Boolean).join("\n")
		});
	}
	async requireSnapshot(workspaceId) {
		const snapshot = await this.snapshot(workspaceId);
		if (!snapshot.initialized || snapshot.project === void 0) throw new Error("SDD project is not initialized");
		return snapshot;
	}
	requireArtifact(snapshot, uid) {
		const artifact = snapshot.artifacts.find((item) => item.uid === uid);
		if (artifact === void 0) throw new Error(`artifact not found: ${uid}`);
		return artifact;
	}
	emptyDashboard() {
		return {
			overallCompletion: 0,
			stages: STAGES.map((stage) => ({
				stage: stage.id,
				status: "not-started",
				completion: 0,
				drafts: 0,
				accepted: 0,
				failedChecks: 0
			})),
			requirements: {
				total: 0,
				traced: 0,
				completed: 0
			},
			defects: {
				total: 0,
				open: 0,
				resolved: 0
			},
			artifacts: {
				total: 0,
				drafts: 0,
				accepted: 0
			},
			development: {
				workspaces: 0,
				changedFiles: 0,
				passingTests: 0,
				failingTests: 0,
				commits: 0
			},
			workload: [],
			traceability: 100,
			blockers: [],
			recentEvents: []
		};
	}
	dashboard(artifacts, sources, quality, workspaces, recentEvents) {
		const stages = STAGES.map((definition) => {
			const items = artifacts.filter((item) => item.stage === definition.id);
			const accepted = items.filter((item) => item.status === "accepted").length;
			const drafts = items.filter((item) => item.status === "draft" || item.status === "in-review").length;
			const reports = items.map((item) => quality[item.uid]).filter((item) => item !== void 0);
			const failedChecks = reports.reduce((sum, report) => sum + report.checks.filter((item) => item.status === "failed").length, 0);
			const completion = accepted > 0 ? 100 : Math.min(90, Math.max(0, ...reports.map((report) => report.score), 0));
			const status = accepted > 0 ? "completed" : items.length === 0 ? "not-started" : reports.some((report) => report.ready) ? "ready-for-review" : failedChecks > 0 ? "blocked" : "in-progress";
			return {
				stage: definition.id,
				status,
				completion,
				drafts,
				accepted,
				failedChecks
			};
		});
		const requirements = sources.filter((item) => item.kind === "requirement");
		const defects = sources.filter((item) => item.kind === "defect");
		const tracedSources = new Set(artifacts.flatMap((item) => item.derivedFrom.map((reference) => reference.uid)));
		const tests = workspaces.flatMap((item) => item.repositories.map((repository) => repository.lastTest)).filter((item) => item !== void 0);
		const blockers = Object.values(quality).flatMap((report) => report.checks.filter((item) => item.status === "failed").map((item) => `${stageDefinition(report.stage).label}：${item.label}`)).slice(0, 12);
		const resolvedStatuses = /* @__PURE__ */ new Set([
			"resolved",
			"done",
			"cancelled"
		]);
		const workload = /* @__PURE__ */ new Map();
		for (const source of sources) {
			const estimate = source.tracking?.estimate;
			if (estimate === void 0) continue;
			const current = workload.get(estimate.unit) ?? {
				total: 0,
				completed: 0
			};
			current.total += estimate.value;
			if (resolvedStatuses.has(source.tracking?.normalizedStatus ?? "")) current.completed += estimate.value;
			workload.set(estimate.unit, current);
		}
		return {
			overallCompletion: Math.round(stages.reduce((sum, stage) => sum + stage.completion, 0) / stages.length),
			stages,
			requirements: {
				total: requirements.length,
				traced: requirements.filter((item) => tracedSources.has(item.uid)).length,
				completed: requirements.filter((item) => item.tracking?.normalizedStatus === "done").length
			},
			defects: {
				total: defects.length,
				open: defects.filter((item) => !resolvedStatuses.has(item.tracking?.normalizedStatus ?? "")).length,
				resolved: defects.filter((item) => resolvedStatuses.has(item.tracking?.normalizedStatus ?? "")).length
			},
			artifacts: {
				total: artifacts.length,
				drafts: artifacts.filter((item) => item.status === "draft" || item.status === "in-review").length,
				accepted: artifacts.filter((item) => item.status === "accepted").length
			},
			development: {
				workspaces: workspaces.length,
				changedFiles: workspaces.flatMap((item) => item.repositories).reduce((sum, item) => sum + item.changedFiles, 0),
				passingTests: tests.filter((item) => item.passed).length,
				failingTests: tests.filter((item) => !item.passed).length,
				commits: workspaces.flatMap((item) => item.repositories).filter((item) => item.headCommit !== item.baseCommit).length
			},
			workload: [...workload.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({
				unit,
				...value
			})),
			traceability: sources.length === 0 ? 100 : Math.round(tracedSources.size / sources.length * 100),
			blockers,
			recentEvents
		};
	}
};
//#endregion
//#region src/routes.ts
const SDD_API_PATH = "/api/dsh-e2e-dev-sdd";
const BODY_LIMIT = 256 * 1024;
function writeJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"referrer-policy": "no-referrer"
	});
	res.end(JSON.stringify(body));
}
function browserRequest(req) {
	const browserSignal = req.headers["sec-fetch-site"] === "same-origin" || typeof req.headers.origin === "string";
	const address = req.socket.remoteAddress;
	return browserSignal && (address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1");
}
async function body(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > BODY_LIMIT) throw new Error("body too large");
		chunks.push(buffer);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function makeSddRoute(service) {
	return {
		kind: "exact",
		path: SDD_API_PATH,
		handler: async (req, res) => {
			if (req.method !== "POST") return writeJson(res, 405, {
				ok: false,
				error: "method-not-allowed"
			});
			if (!browserRequest(req)) return writeJson(res, 403, {
				ok: false,
				error: "forbidden"
			});
			if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) return writeJson(res, 415, {
				ok: false,
				error: "json-required"
			});
			try {
				const action = parseAction(await body(req));
				if (action === void 0) return writeJson(res, 400, {
					ok: false,
					error: "invalid-action"
				});
				const result = await service.execute(action);
				if ("prompt" in result) return writeJson(res, 200, {
					ok: true,
					prompt: result.prompt,
					...result.run === void 0 ? {} : { run: result.run }
				});
				return writeJson(res, 200, {
					ok: true,
					snapshot: result
				});
			} catch (error) {
				return writeJson(res, 400, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	};
}
//#endregion
//#region src/providers/command-source.ts
const CONNECTOR_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_TIMEOUT_MS = 3e4;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
function parseConfig(value, expectedId) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("connector config must be an object");
	const config = value;
	if (config.schema !== "dsh-sdd/connector@1") throw new Error("connector.schema must be dsh-sdd/connector@1");
	if (config.id !== expectedId) throw new Error(`connector.id must equal ${expectedId}`);
	if (config.type !== "command") throw new Error("connector.type must be command");
	if (!Array.isArray(config.command) || config.command.length === 0 || config.command.some((argument) => typeof argument !== "string" || argument === "")) throw new Error("connector.command must be a non-empty argv string array");
	if (config.timeoutMs !== void 0 && (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 100 || config.timeoutMs > 3e5)) throw new Error("connector.timeoutMs must be an integer between 100 and 300000");
	if (config.environment !== void 0 && (!Array.isArray(config.environment) || config.environment.some((name) => typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))) throw new Error("connector.environment must contain environment variable names");
	return config;
}
function childEnvironment(names) {
	const environment = {};
	for (const platformName of [
		"PATH",
		"Path",
		"SystemRoot",
		"ComSpec",
		"PATHEXT"
	]) if (process.env[platformName] !== void 0) environment[platformName] = process.env[platformName];
	for (const name of names) {
		const value = process.env[name];
		if (value !== void 0) environment[name] = value;
	}
	return environment;
}
async function execute(config, request) {
	const workspaceRoot = resolve(request.workspace.path);
	const adapterRoot = resolve(workspaceRoot, ".sdd", "business", "adapters");
	for (const argument of config.command) {
		if (!isAbsolute(argument) && !argument.startsWith(".") && !argument.includes("/")) continue;
		const candidate = resolve(workspaceRoot, argument);
		const inWorkspace = relative(workspaceRoot, candidate) === "" || !relative(workspaceRoot, candidate).startsWith("..");
		const inAdapters = relative(adapterRoot, candidate) === "" || !relative(adapterRoot, candidate).startsWith("..");
		if (inWorkspace && !inAdapters) throw new Error(`connector project file must be under .sdd/business/adapters: ${argument}`);
	}
	const [file, ...args] = config.command;
	const timeout = AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = AbortSignal.any([request.signal, timeout]);
	return await new Promise((resolve, reject) => {
		const child = spawn(file, args, {
			cwd: request.workspace.path,
			env: childEnvironment(config.environment ?? []),
			shell: false,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			],
			signal
		});
		const stdout = [];
		const stderr = [];
		let stdoutSize = 0;
		let stderrSize = 0;
		child.stdout.on("data", (chunk) => {
			stdoutSize += chunk.length;
			if (stdoutSize > MAX_OUTPUT_BYTES) child.kill();
			else stdout.push(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderrSize += chunk.length;
			if (stderrSize <= 64 * 1024) stderr.push(chunk);
		});
		child.once("error", reject);
		child.once("close", (code, childSignal) => {
			if (stdoutSize > MAX_OUTPUT_BYTES) return reject(/* @__PURE__ */ new Error("connector stdout exceeded 2 MiB"));
			if (code !== 0) {
				const detail = Buffer.concat(stderr).toString("utf8").trim();
				return reject(/* @__PURE__ */ new Error(`connector exited with ${code ?? childSignal ?? "unknown"}${detail === "" ? "" : `: ${detail}`}`));
			}
			try {
				resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));
			} catch (error) {
				reject(/* @__PURE__ */ new Error(`connector returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
			}
		});
		child.stdin.end(JSON.stringify({
			operation: "get",
			kind: request.kind,
			key: request.key
		}));
	});
}
/** Built-in adapter for project-owned CLI scripts. It never invokes a shell. */
var CommandSourceProvider = class {
	name = "command";
	kinds = ["*"];
	async get(request) {
		const connectorId = request.connector;
		if (connectorId === void 0 || !CONNECTOR_ID.test(connectorId)) throw new Error("command source provider needs a kebab-case connector id");
		const source = validateSourceEnvelope(await execute(parseConfig(parse(await readFile(join(request.workspace.path, ".sdd", "business", "connectors", `${connectorId}.yaml`), "utf8")), connectorId), request));
		if (source.provider !== connectorId && source.provider !== this.name) throw new Error(`source.provider must be "${connectorId}" or "command"`);
		if (source.kind !== request.kind) throw new Error(`source.kind must equal requested kind "${request.kind}"`);
		return {
			...source,
			provider: connectorId
		};
	}
};
//#endregion
//#region src/session-controller.ts
function contained(root, target) {
	const path = relative(root, target);
	return path === "" || !path.startsWith("..") && !isAbsolute(path);
}
function stringArgument(argumentsValue, name) {
	if (typeof argumentsValue !== "object" || argumentsValue === null || Array.isArray(argumentsValue)) return void 0;
	const value = argumentsValue[name];
	return typeof value === "string" ? value : void 0;
}
function mutatingMcpTool(name) {
	return name.startsWith("mcp__") && /(?:write|edit|create|update|delete|remove|commit|push|merge)/i.test(name);
}
var StageSessionController = class {
	ctx;
	active = /* @__PURE__ */ new Map();
	desired = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		ctx.effect(() => () => {
			for (const binding of this.active.values()) binding.dispose();
			this.active.clear();
			this.desired.clear();
		}, "dsh-sdd: stage session bindings");
		ctx.on("session/disposed", (session) => {
			this.unbind(String(session.id));
		});
		ctx.on("agent/created", ({ agent }) => {
			const spec = this.desired.get(String(agent.id));
			if (spec !== void 0) this.attach(spec);
		});
		ctx.on("agent/disposed", ({ agent }) => {
			this.detach(String(agent.id));
		});
	}
	bind(spec) {
		this.desired.set(spec.sessionId, spec);
		this.attach(spec);
	}
	attach(spec) {
		const signature = JSON.stringify(spec);
		if (this.active.get(spec.sessionId)?.signature === signature) return;
		this.detach(spec.sessionId);
		const agent = this.ctx.agents.get(spec.sessionId);
		if (agent === void 0) return;
		const definition = runtimeDefinition(spec.stage);
		const allowedWriteRoots = [resolve(spec.artifactDirectory), ...spec.developmentDirectories.map((path) => resolve(path))];
		const developmentRoots = spec.developmentDirectories.map((path) => resolve(path));
		const disposers = [];
		try {
			disposers.push(agent.ctx.systemPrompt.section({
				name: "sdd:stage-runtime",
				order: 20,
				text: `${definition.systemPrompt}\n\n${spec.systemPrompt}`
			}));
			disposers.push(agent.ctx.tools.guard((execution) => {
				if (definition.toolPolicy.forbiddenTools.includes(execution.name)) return `SDD ${definition.label} 阶段禁止使用工具 ${execution.name}`;
				if (mutatingMcpTool(execution.name)) return "SDD 阶段禁止通过通用 MCP 工具执行外部写操作";
				if (execution.name === "bash" || execution.name === "pwsh") {
					if (!definition.toolPolicy.allowShell) return `SDD ${definition.label} 阶段禁止执行 shell 命令`;
					const workdir = stringArgument(execution.arguments, "workdir");
					if (workdir === void 0) return `SDD 开发阶段的 ${execution.name} 调用必须显式提供 workdir`;
					const resolved = resolve(spec.projectPath, workdir);
					if (!developmentRoots.some((root) => contained(root, resolved))) return `${execution.name} workdir 必须位于当前交付件绑定的隔离代码空间`;
					const command = stringArgument(execution.arguments, "command") ?? "";
					if (/\bgit\s+(?:commit|push|merge|rebase|reset|clean)\b/i.test(command) || /\b(?:gh\s+pr|glab\s+mr)\s+create\b/i.test(command)) return "代码提交、推送和合并只能通过 SDD 的显式用户操作执行";
				}
				if (execution.name === "write" || execution.name === "edit") {
					const filePath = stringArgument(execution.arguments, "file_path");
					if (filePath === void 0) return `${execution.name} 缺少可校验的 file_path`;
					const resolved = resolve(spec.projectPath, filePath);
					if (!allowedWriteRoots.some((root) => contained(root, resolved))) return "当前阶段只能修改绑定交付件或绑定的隔离代码空间";
				}
				if (execution.name === "str_replace_editor") {
					if (stringArgument(execution.arguments, "command") !== "view") {
						const filePath = stringArgument(execution.arguments, "path");
						if (filePath === void 0) return "str_replace_editor 缺少可校验的 path";
						const resolved = resolve(spec.projectPath, filePath);
						if (!allowedWriteRoots.some((root) => contained(root, resolved))) return "当前阶段只能修改绑定交付件或绑定的隔离代码空间";
					}
				}
			}));
			this.active.set(spec.sessionId, {
				signature,
				dispose: () => {
					for (const dispose of disposers.reverse()) dispose();
				}
			});
		} catch (error) {
			for (const dispose of disposers.reverse()) dispose();
			throw error;
		}
	}
	unbind(sessionId) {
		this.desired.delete(sessionId);
		this.detach(sessionId);
	}
	detach(sessionId) {
		const binding = this.active.get(sessionId);
		if (binding === void 0) return;
		this.active.delete(sessionId);
		binding.dispose();
	}
};
//#endregion
//#region src/index.ts
const name = "dsh-e2e-dev-sdd";
function apply(ctx) {
	ctx.plugin(SddSourceRegistry);
	ctx.plugin(SddIdentifierRegistry);
	ctx.plugin(installBuiltins);
	ctx.plugin(installHostApi);
}
installBuiltins.inject = ["dshSddSources"];
function installBuiltins(ctx) {
	ctx.dshSddSources.register(new CommandSourceProvider());
}
installHostApi.inject = [
	"apiProxy",
	"webServer",
	"agents",
	"systemPrompt",
	"tools",
	"dshSddSources",
	"dshSddIdentifiers"
];
function installHostApi(ctx) {
	const sessions = new StageSessionController(ctx);
	const service = new SddProjectService(ctx.apiProxy, ctx.dshSddSources, ctx.dshSddIdentifiers, sessions);
	ctx.effect(() => ctx.webServer.register(makeSddRoute(service)), "dsh-sdd: host api");
}
//#endregion
export { STAGES, SddIdentifierRegistry, SddSourceRegistry, apply, isStageId, name, parseAction, stageDefinition, validateSourceEnvelope };
