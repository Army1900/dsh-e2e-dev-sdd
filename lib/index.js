import { STAGES, STAGE_ARTIFACT_TEMPLATES, artifactTemplate, isStageId, parseAction, stageDefinition } from "./protocol.js";
import { SddSourceRegistry, validateSourceBundle, validateSourceEnvelope } from "./extensions.js";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { access, appendFile, copyFile, lstat, mkdir, readFile, readdir, readlink, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { fileURLToPath } from "node:url";
//#region src/connector-catalog.ts
const CONNECTOR_ID$1 = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
async function connectorFiles(root, scope) {
	const connectorsRoot = join(root, "connectors");
	const result = /* @__PURE__ */ new Map();
	let entries;
	try {
		entries = await readdir(connectorsRoot, { withFileTypes: true });
	} catch (error) {
		if (error.code === "ENOENT") return result;
		throw error;
	}
	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
		if (!entry.isFile() || !entry.name.endsWith(".yaml") && !entry.name.endsWith(".yml")) continue;
		const id = entry.name.replace(/\.ya?ml$/, "");
		if (!CONNECTOR_ID$1.test(id)) continue;
		result.set(id, {
			id,
			scope,
			overridden: false,
			configPath: join(connectorsRoot, entry.name),
			adapterRoot: join(root, "adapters")
		});
	}
	return result;
}
/** Resolves the same Connector/Adapter layout from the installed plugin and the current SDD project. */
var ConnectorCatalog = class {
	pluginBusinessRoot;
	constructor(pluginBusinessRoot) {
		this.pluginBusinessRoot = pluginBusinessRoot;
	}
	async list(workspacePath) {
		return [...(await this.descriptors(workspacePath)).values()].map(({ id, scope, overridden }) => ({
			id,
			scope,
			overridden
		})).sort((left, right) => left.id.localeCompare(right.id));
	}
	async resolve(workspacePath, id) {
		if (!CONNECTOR_ID$1.test(id)) throw new Error("connector id must use kebab-case");
		const connector = (await this.descriptors(workspacePath)).get(id);
		if (connector === void 0) throw new Error(`connector not found: ${id}`);
		return connector;
	}
	async descriptors(workspacePath) {
		const plugin = await connectorFiles(this.pluginBusinessRoot, "plugin");
		const project = await connectorFiles(join(workspacePath, ".sdd", "business"), "project");
		const result = new Map(plugin);
		for (const [id, descriptor] of project) result.set(id, {
			...descriptor,
			overridden: plugin.has(id)
		});
		return result;
	}
};
//#endregion
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
async function exists$2(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
async function localBaseCommit(repositoryPath, branch) {
	for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]) {
		const result = await run([
			"git",
			"rev-parse",
			"--verify",
			`${ref}^{commit}`
		], repositoryPath, 3e4, true);
		if (result.exitCode === 0) return result.stdout.trim();
	}
	throw new Error(`base branch does not exist in repository: ${branch}`);
}
function developmentFile(projectPath, artifactUid) {
	return join(projectPath, ".sdd", "development", `${artifactUid}.yaml`);
}
async function repositoryState(state) {
	const status = await run([
		"git",
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
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
	const changes = porcelainChanges(status.stdout);
	const worktreeHash = await worktreeFingerprint(state.path, changes);
	return {
		...state,
		headCommit: head,
		behind: counts[0] ?? 0,
		ahead: counts[1] ?? 0,
		changedFiles: changes.length,
		tests: (state.tests ?? []).map((test) => ({
			...test,
			stale: test.worktreeHash !== worktreeHash
		}))
	};
}
function porcelainChanges(output) {
	const records = output.split("\0");
	const changes = [];
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		if (record === void 0 || record === "") continue;
		const status = record.slice(0, 2);
		const path = record.slice(3);
		const sourcePath = status.includes("R") || status.includes("C") ? records[++index] : void 0;
		changes.push({
			status,
			path,
			...sourcePath === void 0 || sourcePath === "" ? {} : { sourcePath }
		});
	}
	return changes.sort((left, right) => left.path.localeCompare(right.path));
}
function parseIndex(output) {
	const entries = /* @__PURE__ */ new Map();
	for (const record of output.split("\0")) {
		if (record === "") continue;
		const match = /^(\d+) ([0-9a-f]+) 0\t([\s\S]+)$/u.exec(record);
		if (match?.[1] !== void 0 && match[2] !== void 0 && match[3] !== void 0) entries.set(match[3], {
			mode: match[1],
			object: match[2]
		});
	}
	return entries;
}
function gitBlobHash(content, algorithm) {
	return createHash(algorithm).update(Buffer.from(`blob ${content.length}\0`)).update(content).digest("hex");
}
async function changedPathEntry(repositoryPath, path, algorithm, existing) {
	const absolute = resolve(repositoryPath, path);
	try {
		const info = await lstat(absolute);
		if (info.isSymbolicLink()) return {
			mode: "120000",
			object: gitBlobHash(Buffer.from(await readlink(absolute)), algorithm)
		};
		if (info.isFile()) {
			const content = await readFile(absolute);
			return {
				mode: process.platform === "win32" && existing !== void 0 ? existing.mode : (info.mode & 73) === 0 ? "100644" : "100755",
				object: gitBlobHash(content, algorithm)
			};
		}
		if (info.isDirectory()) {
			const head = await run([
				"git",
				"rev-parse",
				"HEAD"
			], absolute, 3e4, true);
			return head.exitCode === 0 ? {
				mode: "160000",
				object: head.stdout.trim()
			} : void 0;
		}
		return;
	} catch (error) {
		if (error.code === "ENOENT") return void 0;
		throw error;
	}
}
async function worktreeFingerprint(path, knownChanges) {
	const changes = knownChanges ?? porcelainChanges((await run([
		"git",
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
	], path)).stdout);
	const entries = parseIndex((await run([
		"git",
		"ls-files",
		"--stage",
		"-z"
	], path)).stdout);
	const algorithm = (entries.values().next().value?.object)?.length === 64 ? "sha256" : "sha1";
	for (const change of changes) {
		if (change.sourcePath !== void 0) entries.delete(change.sourcePath);
		const entry = await changedPathEntry(path, change.path, algorithm, entries.get(change.path));
		if (entry === void 0) entries.delete(change.path);
		else entries.set(change.path, entry);
	}
	const tree = [...entries].sort(([left], [right]) => left.localeCompare(right)).map(([file, entry]) => `${entry.mode} ${entry.object}\t${file}`).join("\0");
	return `sha256:${createHash("sha256").update(tree).digest("hex")}`;
}
async function readDevelopmentWorkspace(projectPath, artifactUid) {
	const file = developmentFile(projectPath, artifactUid);
	if (!await exists$2(file)) return void 0;
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
function projectCollaboration(project) {
	return project.collaboration ?? {
		remote: "origin",
		baseBranch: "main",
		syncStrategy: "ff-only",
		commitScope: "sdd"
	};
}
function conflictStatus(status) {
	return [
		"DD",
		"AU",
		"UD",
		"UA",
		"DU",
		"AA",
		"UU"
	].includes(status);
}
var ProjectGitService = class {
	async inspect(projectPath, project) {
		const collaboration = projectCollaboration(project);
		const rootResult = await run([
			"git",
			"rev-parse",
			"--show-toplevel"
		], projectPath, 3e4, true);
		if (rootResult.exitCode !== 0) return {
			isRepository: false,
			exactWorkspaceRoot: false,
			detached: false,
			remote: collaboration.remote,
			baseBranch: collaboration.baseBranch,
			changedFiles: 0,
			stagedFiles: 0,
			untrackedFiles: 0,
			conflictFiles: [],
			ahead: 0,
			behind: 0,
			divergence: "untracked",
			keyConflicts: []
		};
		const repositoryRoot = await realpath(rootResult.stdout.trim());
		const exactWorkspaceRoot = repositoryRoot === await realpath(projectPath);
		const branchResult = await run([
			"git",
			"symbolic-ref",
			"--quiet",
			"--short",
			"HEAD"
		], repositoryRoot, 3e4, true);
		const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : void 0;
		const headResult = await run([
			"git",
			"rev-parse",
			"--verify",
			"HEAD"
		], repositoryRoot, 3e4, true);
		const status = porcelainChanges((await run([
			"git",
			"status",
			"--porcelain=v1",
			"-z",
			"--untracked-files=all"
		], repositoryRoot)).stdout);
		const upstreamResult = await run([
			"git",
			"rev-parse",
			"--abbrev-ref",
			"--symbolic-full-name",
			"@{upstream}"
		], repositoryRoot, 3e4, true);
		const configuredTarget = `${collaboration.remote}/${collaboration.baseBranch}`;
		const configuredExists = await run([
			"git",
			"rev-parse",
			"--verify",
			`${configuredTarget}^{commit}`
		], repositoryRoot, 3e4, true);
		const upstream = upstreamResult.exitCode === 0 ? upstreamResult.stdout.trim() : configuredExists.exitCode === 0 ? configuredTarget : void 0;
		let ahead = 0;
		let behind = 0;
		if (upstream !== void 0 && headResult.exitCode === 0) {
			const values = (await run([
				"git",
				"rev-list",
				"--left-right",
				"--count",
				`${upstream}...HEAD`
			], repositoryRoot, 3e4, true)).stdout.trim().split(/\s+/).map(Number);
			behind = values[0] ?? 0;
			ahead = values[1] ?? 0;
		}
		return {
			isRepository: true,
			exactWorkspaceRoot,
			repositoryRoot,
			...branch === void 0 ? {} : { branch },
			detached: branch === void 0,
			...headResult.exitCode === 0 ? { headCommit: headResult.stdout.trim() } : {},
			remote: collaboration.remote,
			baseBranch: collaboration.baseBranch,
			...upstream === void 0 ? {} : { upstream },
			changedFiles: status.length,
			stagedFiles: status.filter((item) => item.status[0] !== " " && item.status[0] !== "?").length,
			untrackedFiles: status.filter((item) => item.status === "??").length,
			conflictFiles: status.filter((item) => conflictStatus(item.status)).map((item) => item.path),
			ahead,
			behind,
			divergence: upstream === void 0 ? "untracked" : ahead > 0 && behind > 0 ? "diverged" : ahead > 0 ? "ahead" : behind > 0 ? "behind" : "none",
			keyConflicts: []
		};
	}
	assertUsable(state) {
		if (!state.isRepository) throw new Error("当前 SDD 工作空间不是 Git 仓库；请先初始化 Git 并创建首个提交");
		if (!state.exactWorkspaceRoot) throw new Error(`工作空间不是 Git 仓库根目录：${state.repositoryRoot ?? ""}`);
		if (state.detached || state.branch === void 0) throw new Error("当前项目仓库处于 detached HEAD，不能执行协作同步");
		if (state.conflictFiles.length > 0) throw new Error(`项目仓库存在未解决冲突：${state.conflictFiles.join("、")}`);
	}
	async fetch(projectPath, project) {
		const state = await this.inspect(projectPath, project);
		this.assertUsable(state);
		if (state.remote.trim() === "") throw new Error("项目协作远程仓库未配置");
		await run([
			"git",
			"fetch",
			"--prune",
			state.remote
		], projectPath, 18e4);
	}
	async sync(projectPath, project) {
		if (projectCollaboration(project).syncStrategy === "manual") throw new Error("当前同步策略为 manual，请在终端中完成同步后刷新状态");
		await this.fetch(projectPath, project);
		const state = await this.inspect(projectPath, project);
		this.assertUsable(state);
		if (state.changedFiles > 0) throw new Error("同步前项目工作区必须干净；请先提交或处理本地修改");
		if (state.upstream === void 0) throw new Error(`远程跟踪分支不存在；请先 Push 当前分支，或确认 ${state.remote}/${state.baseBranch} 已存在`);
		if (state.ahead > 0 && state.behind > 0) throw new Error(`当前分支与 ${state.upstream} 已分叉，禁止自动合并；请在终端或专门的冲突处理流程中解决`);
		if (state.behind === 0) return;
		await run([
			"git",
			"merge",
			"--ff-only",
			state.upstream
		], projectPath, 12e4);
	}
	async commit(projectPath, project, message) {
		const state = await this.inspect(projectPath, project);
		this.assertUsable(state);
		if (message.trim() === "") throw new Error("项目提交说明不能为空");
		const collaboration = projectCollaboration(project);
		if (collaboration.commitScope === "workspace") await run([
			"git",
			"add",
			"-A"
		], projectPath);
		else await run([
			"git",
			"add",
			"-A",
			"--",
			".sdd",
			".gitignore"
		], projectPath);
		const staged = await run([
			"git",
			"diff",
			"--cached",
			"--quiet"
		], projectPath, 3e4, true);
		if (staged.exitCode === 0) throw new Error(`没有可提交的${collaboration.commitScope === "sdd" ? " SDD " : "项目"}变更`);
		if (staged.exitCode !== 1) throw new Error(`无法检查项目暂存区，git 退出码 ${staged.exitCode}`);
		await run([
			"git",
			"commit",
			"-m",
			message.trim()
		], projectPath, 12e4);
	}
	async push(projectPath, project) {
		const state = await this.inspect(projectPath, project);
		this.assertUsable(state);
		if (state.remote.trim() === "") throw new Error("项目协作远程仓库未配置");
		await run(state.upstream === void 0 ? [
			"git",
			"push",
			"--set-upstream",
			state.remote,
			state.branch
		] : [
			"git",
			"push",
			state.remote,
			state.branch
		], projectPath, 18e4);
	}
};
var GitDevelopmentService = class {
	/**
	* Makes every project repository available to non-development stages without changing the existing development worktree layout.
	* Local clean repositories are read directly. Remote repositories share one mirror under .sdd-workspaces/.repositories
	* and one detached checkout per referenced commit under .sdd-workspaces/.references.
	*/
	async prepareCodeReferences(projectPath, project, previous = []) {
		const previousById = new Map(previous.map((reference) => [reference.repositoryId, reference]));
		return Promise.all(project.development.repositories.map(async (config) => {
			try {
				return await this.prepareCodeReference(projectPath, project, config, previousById.get(config.id));
			} catch (error) {
				const localSource = isAbsolute(config.source) ? config.source : resolve(projectPath, config.source);
				return {
					repositoryId: config.id,
					source: config.source,
					sourceKind: await exists$2(localSource) ? "local" : "remote",
					baseBranch: config.baseBranch,
					available: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}));
	}
	workspaceRoot(projectPath, project) {
		const root = resolve(projectPath, project.development.workspaceRoot);
		if (relative(projectPath, root).startsWith("..")) throw new Error("development workspace root escapes the SDD project");
		return root;
	}
	async remoteMirror(projectPath, project, config, refresh) {
		const root = this.workspaceRoot(projectPath, project);
		const cache = resolve(root, ".repositories", `${config.id}.git`);
		await mkdir(resolve(root, ".repositories"), { recursive: true });
		if (!await exists$2(cache)) {
			await run([
				"git",
				"clone",
				"--bare",
				config.source,
				cache
			], projectPath, 3e5);
			await run([
				"git",
				"--git-dir",
				cache,
				"config",
				"remote.origin.fetch",
				"+refs/heads/*:refs/remotes/origin/*"
			], projectPath);
			await run([
				"git",
				"--git-dir",
				cache,
				"fetch",
				"--prune",
				"origin"
			], projectPath, 3e5);
		} else {
			if ((await run([
				"git",
				"--git-dir",
				cache,
				"remote",
				"get-url",
				"origin"
			], projectPath)).stdout.trim() !== config.source) throw new Error(`repository cache origin differs from project configuration: ${config.id}`);
			if (refresh) await run([
				"git",
				"--git-dir",
				cache,
				"fetch",
				"--prune",
				"origin"
			], projectPath, 3e5);
		}
		return cache;
	}
	async remoteBaseCommit(projectPath, mirror, branch) {
		for (const ref of [`refs/remotes/origin/${branch}`, `refs/heads/${branch}`]) {
			const result = await run([
				"git",
				"--git-dir",
				mirror,
				"rev-parse",
				"--verify",
				`${ref}^{commit}`
			], projectPath, 3e4, true);
			if (result.exitCode === 0) return result.stdout.trim();
		}
		throw new Error(`base branch does not exist in remote repository: ${branch}`);
	}
	async detachedReference(sourceRepository, root, config, commit) {
		const target = resolve(root, ".references", config.id, commit.slice(0, 12));
		if (relative(root, target).startsWith("..")) throw new Error("code reference path escapes configured workspace root");
		if (await exists$2(target)) {
			if ((await run([
				"git",
				"rev-parse",
				"HEAD"
			], target)).stdout.trim() !== commit) throw new Error(`existing code reference points to another commit: ${target}`);
			return target;
		}
		await mkdir(resolve(root, ".references", config.id), { recursive: true });
		await run([
			"git",
			"worktree",
			"prune"
		], sourceRepository, 3e4, true);
		await run([
			"git",
			"worktree",
			"add",
			"--detach",
			target,
			commit
		], sourceRepository, 3e5);
		return target;
	}
	async prepareCodeReference(projectPath, project, config, previous) {
		if (!ID.test(config.id)) throw new Error(`invalid development repository id: ${config.id}`);
		const root = this.workspaceRoot(projectPath, project);
		const localSource = isAbsolute(config.source) ? config.source : resolve(projectPath, config.source);
		if (await exists$2(localSource)) {
			const commit = previous?.baseCommit ?? await localBaseCommit(localSource, config.baseBranch);
			if ((await run([
				"git",
				"cat-file",
				"-e",
				`${commit}^{commit}`
			], localSource, 3e4, true)).exitCode !== 0) throw new Error(`recorded code baseline is missing: ${config.id}@${commit}`);
			const head = (await run([
				"git",
				"rev-parse",
				"HEAD"
			], localSource)).stdout.trim();
			const dirty = (await run([
				"git",
				"status",
				"--porcelain"
			], localSource)).stdout.trim() !== "";
			const path = head === commit && !dirty ? localSource : await this.detachedReference(localSource, root, config, commit);
			return {
				repositoryId: config.id,
				source: config.source,
				sourceKind: "local",
				baseBranch: config.baseBranch,
				baseCommit: commit,
				path,
				available: true
			};
		}
		const mirror = await this.remoteMirror(projectPath, project, config, previous?.baseCommit === void 0);
		const commit = previous?.baseCommit ?? await this.remoteBaseCommit(projectPath, mirror, config.baseBranch);
		if ((await run([
			"git",
			"--git-dir",
			mirror,
			"cat-file",
			"-e",
			`${commit}^{commit}`
		], projectPath, 3e4, true)).exitCode !== 0) throw new Error(`recorded remote code baseline is missing: ${config.id}@${commit}`);
		const path = await this.detachedReference(mirror, root, config, commit);
		return {
			repositoryId: config.id,
			source: config.source,
			sourceKind: "remote",
			baseBranch: config.baseBranch,
			baseCommit: commit,
			path,
			available: true
		};
	}
	async inheritRevision(projectPath, previousArtifactUid, artifact) {
		if (artifact.stage !== "development") return void 0;
		const current = await readDevelopmentWorkspace(projectPath, artifact.uid);
		if (current !== void 0) return current;
		const previous = await readDevelopmentWorkspace(projectPath, previousArtifactUid);
		if (previous === void 0) return void 0;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const inherited = {
			...previous,
			uid: randomUUID(),
			key: artifact.key,
			artifactUid: artifact.uid,
			inputs: artifact.basedOn.map((input) => ({
				artifactUid: input.uid,
				version: input.version
			})),
			repositories: previous.repositories.map((repository) => ({
				...repository,
				tests: (repository.tests ?? []).map((test) => ({
					...test,
					worktreeHash: `revision-invalidated:${test.worktreeHash}`,
					stale: true
				}))
			})),
			createdAt: now,
			updatedAt: now
		};
		await this.write(projectPath, inherited);
		return inherited;
	}
	async discardInheritedRevision(projectPath, artifactUid, previousArtifactUid) {
		const current = await readDevelopmentWorkspace(projectPath, artifactUid);
		const previous = await readDevelopmentWorkspace(projectPath, previousArtifactUid);
		if (current === void 0 || previous === void 0) return false;
		const signature = (workspace) => workspace.repositories.map((repository) => `${repository.id}\0${resolve(repository.path)}`).sort();
		if (JSON.stringify(signature(current)) !== JSON.stringify(signature(previous))) return false;
		await unlink(developmentFile(projectPath, artifactUid));
		return true;
	}
	async inspectSource(projectPath, source) {
		const normalized = source.trim();
		if (normalized === "") throw new Error("repository source is required");
		const localSource = isAbsolute(normalized) ? normalized : resolve(projectPath, normalized);
		if (await exists$2(localSource)) {
			const repository = await run([
				"git",
				"rev-parse",
				"--is-inside-work-tree"
			], localSource, 3e4, true);
			if (repository.exitCode !== 0 || repository.stdout.trim() !== "true") throw new Error(`local source is not a Git repository: ${normalized}`);
			const branchResult = await run([
				"git",
				"for-each-ref",
				"--format=%(refname)",
				"refs/heads",
				"refs/remotes/origin"
			], localSource, 3e4);
			const branches = [...new Set(branchResult.stdout.split(/\r?\n/).map((item) => item.trim()).flatMap((ref) => {
				if (ref.startsWith("refs/heads/")) return [ref.slice(11)];
				if (ref.startsWith("refs/remotes/origin/") && !ref.endsWith("/HEAD")) return [ref.slice(20)];
				return [];
			}))].sort();
			const current = await run([
				"git",
				"symbolic-ref",
				"--quiet",
				"--short",
				"HEAD"
			], localSource, 3e4, true);
			const preferred = current.exitCode === 0 ? current.stdout.trim() : "";
			return {
				source: normalized,
				sourceKind: "local",
				branches,
				defaultBranch: branches.includes(preferred) ? preferred : branches.includes("main") ? "main" : branches.includes("master") ? "master" : (branches[0] ?? preferred) || "main",
				empty: branches.length === 0
			};
		}
		const refs = await run([
			"git",
			"ls-remote",
			"--symref",
			normalized,
			"HEAD",
			"refs/heads/*"
		], projectPath, 6e4);
		const branches = [...new Set(refs.stdout.split(/\r?\n/).map((line) => /\trefs\/heads\/(.+)$/.exec(line)?.[1]).filter((item) => item !== void 0))].sort();
		const head = refs.stdout.split(/\r?\n/).map((line) => /^ref:\s+refs\/heads\/(.+)\s+HEAD$/.exec(line)?.[1]).find((item) => item !== void 0);
		return {
			source: normalized,
			sourceKind: "remote",
			branches,
			defaultBranch: head !== void 0 && branches.includes(head) ? head : branches.includes("main") ? "main" : branches.includes("master") ? "master" : branches[0] ?? "main",
			empty: branches.length === 0
		};
	}
	async initializeLocalSource(projectPath, source, branch) {
		const inspection = await this.inspectSource(projectPath, source);
		if (inspection.sourceKind !== "local") throw new Error("empty remote repositories must be initialized and pushed explicitly");
		if (!inspection.empty) return inspection;
		const normalizedBranch = branch.trim();
		if (normalizedBranch === "") throw new Error("initial branch is required");
		const localSource = isAbsolute(inspection.source) ? inspection.source : resolve(projectPath, inspection.source);
		await run([
			"git",
			"check-ref-format",
			"--branch",
			normalizedBranch
		], localSource);
		const staged = await run([
			"git",
			"diff",
			"--cached",
			"--name-only"
		], localSource, 3e4, true);
		if (staged.exitCode !== 0) throw new Error("cannot inspect the staged files in the empty repository");
		if (staged.stdout.trim() !== "") throw new Error("repository already has staged files; commit them manually to avoid an unintended automatic commit");
		await run([
			"git",
			"symbolic-ref",
			"HEAD",
			`refs/heads/${normalizedBranch}`
		], localSource);
		await run([
			"git",
			"-c",
			"user.name=DSH SDD",
			"-c",
			"user.email=dsh-sdd@localhost",
			"commit",
			"--allow-empty",
			"--no-verify",
			"-m",
			"chore: initialize repository"
		], localSource);
		return this.inspectSource(projectPath, source);
	}
	async validateSource(projectPath, source, baseBranch) {
		const inspection = await this.inspectSource(projectPath, source);
		if (!inspection.branches.includes(baseBranch)) throw new Error(`base branch does not exist in repository: ${baseBranch}`);
		return inspection.sourceKind;
	}
	async create(projectPath, project, artifact, repositoryId) {
		if (artifact.stage !== "development") throw new Error("isolated code workspaces are only available in development stage");
		const config = repositoryConfig(project, repositoryId);
		const existing = await readDevelopmentWorkspace(projectPath, artifact.uid);
		if (existing?.repositories.some((item) => item.id === repositoryId)) return existing;
		const root = this.workspaceRoot(projectPath, project);
		const target = resolve(root, artifact.key, repositoryId);
		if (relative(root, target).startsWith("..")) throw new Error("development workspace path escapes configured root");
		await mkdir(resolve(root, artifact.key), { recursive: true });
		if (await exists$2(target)) {
			const inherited = artifact.supersedes?.uid === void 0 ? void 0 : await this.inheritRevision(projectPath, artifact.supersedes.uid, artifact);
			if (inherited?.repositories.some((item) => item.id === repositoryId)) return inherited;
			throw new Error(`development target already exists but is not registered: ${target}`);
		}
		const branch = project.development.branchPattern.replaceAll("{artifactKey}", artifact.key).replaceAll("{repositoryId}", repositoryId);
		await run([
			"git",
			"check-ref-format",
			"--branch",
			branch
		], projectPath);
		const localSource = isAbsolute(config.source) ? config.source : resolve(projectPath, config.source);
		let baseCommit;
		if (await exists$2(localSource)) {
			baseCommit = await localBaseCommit(localSource, config.baseBranch);
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
			const mirror = await this.remoteMirror(projectPath, project, config, true);
			baseCommit = await this.remoteBaseCommit(projectPath, mirror, config.baseBranch);
			await run([
				"git",
				"worktree",
				"prune"
			], mirror, 3e4, true);
			await run([
				"git",
				"worktree",
				"add",
				"-b",
				branch,
				target,
				baseCommit
			], mirror, 3e5);
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
			behind: 0,
			tests: []
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
	async recordAiTest(projectPath, artifactUid, repositoryId, evidence) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifactUid);
		if (workspace === void 0) throw new Error("development workspace has not been created");
		const state = workspace.repositories.find((item) => item.id === repositoryId);
		if (state === void 0) throw new Error(`development repository has not been created: ${repositoryId}`);
		const test = {
			uid: randomUUID(),
			source: "ai-shell",
			command: evidence.command,
			description: evidence.description,
			passed: evidence.passed,
			skipped: false,
			exitCode: evidence.exitCode,
			ranAt: (/* @__PURE__ */ new Date()).toISOString(),
			output: evidence.output.slice(-64 * 1024),
			worktreeHash: await worktreeFingerprint(state.path),
			stale: false,
			sessionId: evidence.sessionId
		};
		state.tests = [...(state.tests ?? []).filter((item) => item.command !== evidence.command || item.worktreeHash !== test.worktreeHash), test].slice(-50);
		workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await this.write(projectPath, workspace);
		return workspace;
	}
	async skipTest(projectPath, artifactUid, repositoryId, reason) {
		const workspace = await readDevelopmentWorkspace(projectPath, artifactUid);
		if (workspace === void 0) throw new Error("development workspace has not been created");
		const state = workspace.repositories.find((item) => item.id === repositoryId);
		if (state === void 0) throw new Error(`development repository has not been created: ${repositoryId}`);
		const description = reason.trim();
		if (description === "") throw new Error("a reason is required to skip testing");
		const test = {
			uid: randomUUID(),
			source: "manual-skip",
			description,
			passed: true,
			skipped: true,
			ranAt: (/* @__PURE__ */ new Date()).toISOString(),
			output: "",
			worktreeHash: await worktreeFingerprint(state.path),
			stale: false
		};
		state.tests = [...(state.tests ?? []).filter((item) => item.worktreeHash !== test.worktreeHash), test].slice(-50);
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
		Object.assign(state, await repositoryState(state));
		const currentEvidence = (state.tests ?? []).filter((test) => !test.stale);
		if (currentEvidence.length === 0) throw new Error("current code has no valid test evidence; ask AI to verify it or explicitly skip testing with a reason");
		if (currentEvidence.some((test) => !test.passed)) throw new Error("current code still has failing test evidence");
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
function requiredSections(stage) {
	return STAGE_ARTIFACT_TEMPLATES[stage].sections.map((section) => section.title);
}
const STAGE_RUNTIMES = {
	requirements: {
		id: "requirements",
		label: "需求讨论",
		role: "产品经理与业务分析师",
		objective: "把原始诉求转化为边界明确、可验证、可追踪的需求规格。",
		requiredSections: requiredSections("requirements"),
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
		requiredSections: requiredSections("prototype"),
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
		requiredSections: requiredSections("architecture"),
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
		requiredSections: requiredSections("specification"),
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
		objective: "在隔离代码空间中依据本需求实际选择的来源和交付件完成实现，以测试和代码证据形成可合并交付。",
		requiredSections: requiredSections("development"),
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
		systemPrompt: `${COMMON}\n\n当前阶段：开发测试。你的角色是开发工程师、测试工程师与 Reviewer。当前输入可能是原始需求，也可能包含原型、系统设计或实现规格；不得假设未选择的阶段交付件存在。产品代码只能在绑定的 .sdd-workspaces 隔离目录中修改；所有 shell 调用（macOS/Linux 的 bash 或 Windows 的 pwsh）必须显式把 workdir 设置为绑定的代码仓库目录。先读取全部选定输入、明确的仓库开发目标、仓库构建配置和 CI 流程，自主判断实现及相关测试，不假定任何固定语言或测试命令。作为正式证据的测试必须以前台 bash/pwsh 执行，并把 description 严格写为“SDD测试：<测试名称>”；检查真实退出码，失败时修复并重跑。代码最后一次变化之后必须仍有有效测试证据，或由用户在页面填写原因明确跳过。把真实命令、结果和范围同步到开发交付件。未经用户明确操作不得提交、推送或合并。`
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
function meaningfulContent(body) {
	return body.replace(/<!--[\s\S]*?-->/g, "").replace(/^#{3,6}\s+.+$/gm, "").trim();
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
	const tests = workspace.repositories.flatMap((repository) => repository.tests ?? []).filter((result) => !result.stale);
	return [
		check("development-workspace", "隔离开发空间", workspace.repositories.length > 0, `已配置 ${workspace.repositories.length} 个代码仓库`),
		check("development-commit", "代码提交", workspace.repositories.some((repository) => repository.headCommit !== repository.baseCommit), "至少一个仓库需要形成独立提交"),
		check("development-test", "测试证据", tests.length > 0 && tests.every((result) => result.passed), tests.length === 0 ? "当前代码尚无有效测试或跳过证据" : "当前代码的测试证据必须全部通过"),
		check("development-clean", "未提交变更", workspace.repositories.every((repository) => repository.changedFiles === 0), "交付前隔离空间不应留有未提交变更")
	];
}
function evaluateQuality(artifact, content, project, snapshot, checkedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	const definition = runtimeDefinition(artifact.stage);
	const bodies = sectionBodies(content);
	const checks = [];
	const requiredSections = artifact.template?.requiredSections ?? definition.requiredSections;
	for (const section of requiredSections) {
		const body = bodies.get(section);
		checks.push(check(`section:${section}`, `章节：${section}`, body !== void 0 && meaningfulContent(body).length > 0, body === void 0 ? "缺少必填章节" : "章节内容不能为空"));
		if (body !== void 0) checks.push(check(`placeholder:${section}`, `占位内容：${section}`, !PLACEHOLDERS.some((value) => body.includes(value)), "章节仍包含待补充或待确认占位内容"));
	}
	const requiredStages = project.workflow?.mode === "strict" ? Object.entries(project.dependencies[artifact.stage] ?? {}).filter(([, mode]) => mode === "required").map(([stage]) => stage) : [];
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
//#region src/template-store.ts
function exists$1(path) {
	return access(path).then(() => true, () => false);
}
function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function defaultConfig(stage) {
	const template = STAGE_ARTIFACT_TEMPLATES[stage];
	return {
		schema: "dsh-sdd/artifact-template@1",
		stage,
		version: "1.0.0",
		documentName: template.documentName,
		maintenanceGuide: template.maintenanceGuide,
		requiredSections: template.sections.map((section) => section.title)
	};
}
function validateConfig(value, stage) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${stage} template.yaml must be an object`);
	const config = value;
	if (config.schema !== "dsh-sdd/artifact-template@1") throw new Error(`${stage} template schema must be dsh-sdd/artifact-template@1`);
	if (config.stage !== stage) throw new Error(`${stage} template stage must be ${stage}`);
	for (const field of [
		"version",
		"documentName",
		"maintenanceGuide"
	]) if (typeof config[field] !== "string" || config[field].trim() === "") throw new Error(`${stage} template ${field} is required`);
	if (!Array.isArray(config.requiredSections) || config.requiredSections.length === 0 || config.requiredSections.some((item) => typeof item !== "string" || item.trim() === "")) throw new Error(`${stage} template requiredSections must contain non-empty section names`);
	return {
		...config,
		requiredSections: [...new Set(config.requiredSections.map((item) => item.trim()))]
	};
}
async function ensureProjectTemplates(workspacePath) {
	const root = join(workspacePath, ".sdd", "templates");
	await mkdir(root, { recursive: true });
	for (const stage of STAGES) {
		const directory = join(root, stage.id);
		const configPath = join(directory, "template.yaml");
		const contentPath = join(directory, "deliverable.md");
		await mkdir(directory, { recursive: true });
		if (!await exists$1(configPath)) await writeFile(configPath, stringify(defaultConfig(stage.id)), "utf8");
		if (!await exists$1(contentPath)) await writeFile(contentPath, artifactTemplate(stage.id, "{{artifactKey}}", "{{artifactTitle}}"), "utf8");
	}
	const readme = join(root, "README.md");
	if (!await exists$1(readme)) await writeFile(readme, `# SDD 项目交付件模板\n\n每个阶段包含 \`template.yaml\` 和 \`deliverable.md\`。可以编辑并提交到当前项目仓库。\n\n- \`requiredSections\` 是质量检查必须存在且非空的二级章节。\n- \`deliverable.md\` 使用 \`{{artifactKey}}\` 和 \`{{artifactTitle}}\` 占位符。\n- 已创建交付件保存自己的模板快照；修改项目模板只影响之后创建的草稿。\n`, "utf8");
}
async function loadStageTemplate(workspacePath, stage) {
	await ensureProjectTemplates(workspacePath);
	const directory = join(workspacePath, ".sdd", "templates", stage);
	const configPath = join(directory, "template.yaml");
	const contentPath = join(directory, "deliverable.md");
	const config = validateConfig(parse(await readFile(configPath, "utf8")), stage);
	const content = await readFile(contentPath, "utf8");
	if (content.trim() === "") throw new Error(`${stage} deliverable template is empty`);
	if ([...content.matchAll(/\{\{([^{}]*)\}\}/g)].map((match) => match[1]).some((name) => name !== "artifactKey" && name !== "artifactTitle")) throw new Error(`${stage} deliverable template contains an unsupported placeholder`);
	const withoutSupportedPlaceholders = content.replaceAll("{{artifactKey}}", "").replaceAll("{{artifactTitle}}", "");
	if (withoutSupportedPlaceholders.includes("{{") || withoutSupportedPlaceholders.includes("}}")) throw new Error(`${stage} deliverable template contains a malformed placeholder`);
	for (const section of config.requiredSections) if (!new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`, "m").test(content)) throw new Error(`${stage} deliverable template is missing required section: ${section}`);
	return {
		config,
		content,
		directory,
		directoryRelative: relative(workspacePath, directory).split("\\").join("/"),
		configRelative: relative(workspacePath, configPath).split("\\").join("/"),
		contentRelative: relative(workspacePath, contentPath).split("\\").join("/"),
		contentHash: `sha256:${createHash("sha256").update(content).digest("hex")}`
	};
}
function renderStageTemplateContent(content, key, title) {
	return content.replaceAll("{{artifactKey}}", key).replaceAll("{{artifactTitle}}", title);
}
function renderStageTemplate(bundle, key, title) {
	return renderStageTemplateContent(bundle.content, key, title);
}
async function snapshotStageTemplate(artifactDirectory, bundle) {
	const directory = join(artifactDirectory, ".template");
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "template.yaml"), stringify(bundle.config), "utf8");
	await writeFile(join(directory, "deliverable.md"), bundle.content, "utf8");
	return {
		stage: bundle.config.stage,
		version: bundle.config.version,
		sourcePath: bundle.contentRelative,
		snapshotPath: ".template/deliverable.md",
		configSnapshotPath: ".template/template.yaml",
		contentHash: bundle.contentHash,
		requiredSections: bundle.config.requiredSections
	};
}
//#endregion
//#region src/project-service.ts
const PROJECT_FILE = ".sdd/project.yaml";
const BUSINESS_GUIDE = `# 项目业务扩展

本目录保存仅供当前 SDD 项目使用的业务自定义。企业通用适配器也可以使用相同格式放在 dsh-e2e-dev-sdd 插件的 \`business/\` 目录，安装一次后供所有项目使用；同名时当前项目配置覆盖插件配置。

- \`connectors/\`：命令型 Connector 配置。
- \`adapters/\`：Connector 调用的业务适配器脚本和脚本自己的模块。

适配器从 stdin 接收一个 JSON 请求，只能把一个符合 \`dsh-sdd/source-bundle@1\` 的 JSON 对象写到 stdout；\`items\` 至少包含一项，每项形成独立工作单元。主需求公共背景可放在可选的 \`root\`。日志应写到 stderr。凭证不得提交到仓库，Connector 只声明允许继承的环境变量名。

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
function sourceIdentity(source) {
	return `${source.provider}:${source.kind}:${source.externalKey ?? source.uid}`;
}
function sourceHash(source) {
	return `sha256:${createHash("sha256").update(JSON.stringify(source.content)).digest("hex")}`;
}
function sourceVersionHash(source) {
	return createHash("sha256").update(JSON.stringify({
		title: source.title,
		status: source.status,
		revision: source.revision,
		tracking: source.tracking,
		links: source.links,
		content: source.content
	})).digest("hex");
}
function changedPaths(previous, next, prefix = "content") {
	if (JSON.stringify(previous) === JSON.stringify(next)) return [];
	if (!object(previous) || !object(next)) return [prefix];
	return [.../* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(next)])].flatMap((key) => changedPaths(previous[key], next[key], `${prefix}.${key}`)).slice(0, 50);
}
async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
function contained$1(root, target) {
	const path = relative(root, target);
	return path === "" || !path.startsWith("..") && !isAbsolute(path);
}
/** DSH file mentions are workspace-relative and use forward slashes on every host. */
function fileMention(path) {
	const normalized = path.replaceAll("\\", "/");
	if (/[\u0000-\u001f\u007f-\u009f"]/u.test(normalized)) throw new Error(`path cannot be represented as a DSH file reference: ${path}`);
	return /\s/u.test(normalized) ? `@"${normalized}"` : `@${normalized}`;
}
function nativeExecutable(name) {
	return process.platform === "win32" ? `${name}.cmd` : name;
}
async function runNative(argv, cwd, timeoutMs) {
	return await new Promise((resolveResult, reject) => {
		const child = spawn(argv[0], argv.slice(1), {
			cwd,
			shell: process.platform === "win32",
			env: process.env,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			signal: AbortSignal.timeout(timeoutMs)
		});
		const stdout = [];
		const stderr = [];
		let size = 0;
		const collect = (target) => (chunk) => {
			size += chunk.length;
			if (size > 1024 * 1024) child.kill();
			else target.push(chunk);
		};
		child.stdout.on("data", collect(stdout));
		child.stderr.on("data", collect(stderr));
		child.once("error", reject);
		child.once("close", (code) => {
			if (size > 1024 * 1024) return reject(/* @__PURE__ */ new Error("OpenSpec command output exceeded 1 MiB"));
			resolveResult({
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				exitCode: code ?? -1
			});
		});
	});
}
async function inspectOpenSpecCli(cwd) {
	try {
		const result = await runNative([
			nativeExecutable("openspec"),
			"--version",
			"--no-color"
		], cwd, 15e3);
		const version = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).find(Boolean);
		return result.exitCode === 0 ? {
			installed: true,
			...version === void 0 ? {} : { version }
		} : { installed: false };
	} catch (error) {
		if (error.code === "ENOENT") return { installed: false };
		return { installed: false };
	}
}
function openSpecDescription(workItem, validation) {
	if (workItem.openSpec?.enabled !== true) return "本需求未配置";
	const location = `${workItem.openSpec.repositoryId}:${workItem.openSpec.path}`;
	return validation === void 0 ? location : `${location}（${validation.message}）`;
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
async function artifactFiles(root) {
	const files = [];
	const visit = async (directory) => {
		for (const item of await readdir(directory, { withFileTypes: true })) {
			if (item.isSymbolicLink()) continue;
			const absolute = join(directory, item.name);
			if (item.isDirectory()) await visit(absolute);
			else if (item.isFile() && relative(root, absolute) !== "manifest.yaml") {
				const content = await readFile(absolute);
				const path = relative(root, absolute).split("\\").join("/");
				const extension = item.name.toLowerCase().split(".").pop() ?? "";
				const kind = extension === "md" || extension === "mdx" ? "markdown" : [
					"txt",
					"json",
					"yaml",
					"yml",
					"csv",
					"tsv",
					"mmd",
					"puml"
				].includes(extension) ? "text" : [
					"png",
					"jpg",
					"jpeg",
					"gif",
					"webp",
					"svg"
				].includes(extension) ? "image" : "binary";
				files.push({
					path,
					size: content.byteLength,
					contentHash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
					kind
				});
			}
		}
	};
	await visit(root);
	return files.sort((left, right) => left.path.localeCompare(right.path));
}
function artifactBundleHash(files) {
	const inventory = files.map((file) => `${file.path}\0${file.size}\0${file.contentHash}`).join("\n");
	return `sha256:${createHash("sha256").update(inventory).digest("hex")}`;
}
function nextVersion(version) {
	const [major = 0, minor = 0] = version.split(".").map(Number);
	return `${major}.${minor + 1}.0`;
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
		workflow: { mode: "flexible" },
		dependencies: {
			requirements: {},
			prototype: { requirements: "optional" },
			architecture: {
				requirements: "optional",
				prototype: "optional"
			},
			specification: {
				requirements: "optional",
				prototype: "optional",
				architecture: "optional"
			},
			development: {
				requirements: "optional",
				prototype: "optional",
				architecture: "optional",
				specification: "optional"
			}
		},
		development: {
			workspaceRoot: ".sdd-workspaces",
			branchPattern: "sdd/{artifactKey}",
			mergeStrategy: "pull-request",
			repositories: []
		},
		collaboration: {
			remote: "origin",
			baseBranch: "main",
			syncStrategy: "ff-only",
			commitScope: "sdd"
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
	if (manifest.template !== void 0) if (!object(manifest.template)) errors.push("template must be an object");
	else {
		if (manifest.template.stage !== manifest.stage) errors.push("template.stage must match artifact stage");
		if (!nonEmptyString(manifest.template.version)) errors.push("template.version is required");
		if (!nonEmptyString(manifest.template.snapshotPath)) errors.push("template.snapshotPath is required");
		if (!nonEmptyString(manifest.template.configSnapshotPath)) errors.push("template.configSnapshotPath is required");
		if (!Array.isArray(manifest.template.requiredSections) || manifest.template.requiredSections.length === 0) errors.push("template.requiredSections must not be empty");
	}
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
		else for (const stage of STAGES) {
			const policy = value.identifiers.namespaces[stage.id];
			const base = `identifiers.namespaces.${stage.id}`;
			if (!object(policy)) {
				errors.push(`${base}：必须是对象`);
				continue;
			}
			if (policy.strategy !== "template") errors.push(`${base}.strategy：必须是 template`);
			if (policy.template !== `${stage.prefix}-{sequence:04}`) errors.push(`${base}.template：必须是 ${stage.prefix}-{sequence:04}`);
			if (policy.sequenceScope !== "project") errors.push(`${base}.sequenceScope：必须是 project`);
		}
	}
	if (!object(value.sources)) errors.push("sources：必须是对象");
	else for (const [kind, binding] of Object.entries(value.sources)) if (!object(binding) || !nonEmptyString(binding.provider)) errors.push(`sources.${kind}.provider：不能为空`);
	else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(binding.provider))) errors.push(`sources.${kind}.provider：必须使用 kebab-case`);
	if (value.workflow !== void 0 && (!object(value.workflow) || value.workflow.mode !== "flexible" && value.workflow.mode !== "strict")) errors.push("workflow.mode：必须是 flexible 或 strict");
	if (value.collaboration !== void 0) if (!object(value.collaboration)) errors.push("collaboration：必须是对象");
	else {
		if (!nonEmptyString(value.collaboration.remote) || !/^[A-Za-z0-9._-]+$/.test(String(value.collaboration.remote))) errors.push("collaboration.remote：必须是有效的 Git remote 名称");
		if (!nonEmptyString(value.collaboration.baseBranch)) errors.push("collaboration.baseBranch：不能为空");
		if (value.collaboration.syncStrategy !== "ff-only" && value.collaboration.syncStrategy !== "manual") errors.push("collaboration.syncStrategy：必须是 ff-only 或 manual");
		if (value.collaboration.commitScope !== "sdd" && value.collaboration.commitScope !== "workspace") errors.push("collaboration.commitScope：必须是 sdd 或 workspace");
	}
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
function normalizeProject(project) {
	return {
		...project,
		sources: project.sources ?? {},
		development: {
			...project.development,
			repositories: project.development?.repositories ?? []
		},
		collaboration: project.collaboration ?? {
			remote: "origin",
			baseBranch: "main",
			syncStrategy: "ff-only",
			commitScope: "sdd"
		}
	};
}
function artifactKeyConflicts(artifacts, runs, developmentWorkspaces) {
	const byUid = new Map(artifacts.map((item) => [item.uid, item]));
	const rootUid = (artifact) => {
		let current = artifact;
		const seen = /* @__PURE__ */ new Set();
		while (current.supersedes?.uid !== void 0 && !seen.has(current.uid)) {
			seen.add(current.uid);
			const previous = byUid.get(current.supersedes.uid);
			if (previous === void 0) break;
			current = previous;
		}
		return current.uid;
	};
	const groups = /* @__PURE__ */ new Map();
	for (const artifact of artifacts.filter((item) => item.key !== "INVALID")) {
		const group = `${artifact.stage}\0${artifact.key}`;
		groups.set(group, [...groups.get(group) ?? [], artifact]);
	}
	return [...groups.values()].flatMap((items) => {
		const lineages = [...new Set(items.map(rootUid))];
		if (lineages.length < 2) return [];
		const renamableArtifactUids = items.filter((item) => (item.status === "draft" || item.status === "in-review") && item.supersedes === void 0 && !runs.some((run) => run.artifactUid === item.uid) && !developmentWorkspaces.some((workspace) => workspace.artifactUid === item.uid) && !artifacts.some((candidate) => candidate.supersedes?.uid === item.uid)).map((item) => item.uid);
		return [{
			stage: items[0].stage,
			key: items[0].key,
			artifactUids: items.map((item) => item.uid),
			lineageUids: lineages,
			statuses: items.map((item) => item.status),
			renamableArtifactUids
		}];
	}).sort((left, right) => left.key.localeCompare(right.key));
}
var SddProjectService = class {
	api;
	sourceRegistry;
	sessionController;
	git;
	projectGit;
	connectors;
	openSpecCliCache;
	constructor(api, sourceRegistry, sessionController, git = new GitDevelopmentService(), projectGit = new ProjectGitService(), connectors = new ConnectorCatalog(resolve(process.cwd(), "business"))) {
		this.api = api;
		this.sourceRegistry = sourceRegistry;
		this.sessionController = sessionController;
		this.git = git;
		this.projectGit = projectGit;
		this.connectors = connectors;
	}
	async openSpecCli(cwd, refresh = false) {
		if (!refresh && this.openSpecCliCache !== void 0 && this.openSpecCliCache.expiresAt > Date.now()) return this.openSpecCliCache.value;
		const value = await inspectOpenSpecCli(cwd);
		this.openSpecCliCache = {
			expiresAt: Date.now() + (value.installed ? 5 * 6e4 : 1e4),
			value
		};
		return value;
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
	/** Import preview only needs source ownership and lightweight artifact state, not Git/OpenSpec/quality/dashboard inspection. */
	async importProjectContext(workspace, includeArtifacts) {
		const projectPath = join(workspace.path, PROJECT_FILE);
		if (!await exists(projectPath)) throw new Error("SDD project is not initialized");
		let parsedProject;
		try {
			parsedProject = parse(await readFile(projectPath, "utf8"));
		} catch (error) {
			throw new Error(`project.yaml YAML parse failed: ${error instanceof Error ? error.message : String(error)}`);
		}
		const validation = validateProject(parsedProject);
		if (validation.project === void 0) throw new Error(`invalid SDD project configuration: ${validation.errors.join("; ")}`);
		const artifactStates = async () => {
			if (!includeArtifacts) return [];
			const paths = [.../* @__PURE__ */ new Set([...await walkForManifest(join(workspace.path, ".sdd", "artifacts")), ...await walkForManifest(join(workspace.path, ".sdd", "work-items"))])];
			return (await Promise.all(paths.map(async (path) => {
				try {
					const manifest = parse(await readFile(path, "utf8"));
					if (manifest.schema !== "dsh-sdd/artifact@1" || !STAGES.some((stage) => stage.id === manifest.stage) || ![
						"draft",
						"in-review",
						"accepted",
						"superseded"
					].includes(String(manifest.status))) return void 0;
					return {
						stage: manifest.stage,
						status: manifest.status,
						...manifest.workItemUid === void 0 ? {} : { workItemUid: manifest.workItemUid }
					};
				} catch {
					return;
				}
			}))).filter((state) => state !== void 0);
		};
		const [sources, workItems, artifacts] = await Promise.all([
			this.listSources(workspace.path),
			this.listWorkItems(workspace.path),
			artifactStates()
		]);
		return {
			workspace,
			project: normalizeProject(validation.project),
			sources,
			workItems,
			artifacts
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
			await this.createDraft(action.workspaceId, action.stage, action.title, action.basedOn, action.sourceUids ?? [], action.workItemUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "preview-revision") return { revisionPreview: await this.previewRevision(action.workspaceId, action.artifactUid) };
		if (action.kind === "create-revision") {
			await this.createRevision(action.workspaceId, action.artifactUid, action.revisionKind, action.reason, action.affectedAreas);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "discard-draft") {
			await this.discardDraft(action.workspaceId, action.artifactUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "accept") {
			await this.accept(action.workspaceId, action.artifactUid, action.checklist);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "read-artifact-file") return { artifactFile: await this.readArtifactFile(action.workspaceId, action.artifactUid, action.path) };
		if (action.kind === "open-artifact-path") {
			await this.openArtifactPath(action.workspaceId, action.artifactUid, action.path);
			return { opened: true };
		}
		if (action.kind === "read-stage-template") return this.readStageTemplate(action.workspaceId, action.stage);
		if (action.kind === "open-stage-template") {
			await this.openStageTemplate(action.workspaceId, action.stage, action.target);
			return { opened: true };
		}
		if (action.kind === "update-work-item-settings") {
			await this.updateWorkItemSettings(action.workspaceId, action.workItemUid, action.repositoryScope, action.developmentTargets, action.developmentTargetDetails, action.openSpec);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "update-stage-applicability") {
			await this.updateStageApplicability(action.workspaceId, action.workItemUid, action.stage, action.status, action.reason);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "add-project-repository") {
			await this.addProjectRepository(action.workspaceId, action.id, action.source, action.baseBranch);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "inspect-project-repository") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			return this.git.inspectSource(snapshot.workspace.path, action.source);
		}
		if (action.kind === "initialize-project-repository") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			const inspection = await this.git.initializeLocalSource(snapshot.workspace.path, action.source, action.branch);
			await appendEvent(snapshot.workspace.path, "project.repository-initialized", action.source, void 0, { branch: inspection.defaultBranch });
			return inspection;
		}
		if (action.kind === "update-project-repository-branch") {
			await this.updateProjectRepositoryBranch(action.workspaceId, action.id, action.baseBranch);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "remove-project-repository") {
			await this.removeProjectRepository(action.workspaceId, action.id);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "update-project-collaboration") {
			await this.updateProjectCollaboration(action.workspaceId, action.remote, action.baseBranch, action.syncStrategy, action.commitScope);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "project-git-fetch") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.projectGit.fetch(snapshot.workspace.path, snapshot.project);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "project-git-sync") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.projectGit.sync(snapshot.workspace.path, snapshot.project);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "project-git-commit") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.projectGit.commit(snapshot.workspace.path, snapshot.project, action.message);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "project-git-push") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.projectGit.push(snapshot.workspace.path, snapshot.project);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "resolve-artifact-key-conflict") {
			await this.resolveArtifactKeyConflict(action.workspaceId, action.artifactUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "quality") return this.snapshot(action.workspaceId);
		if (action.kind === "import-source") {
			const preview = await this.previewSourceImport(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector, action.input, action.attachToWorkItemUid);
			await this.applySourceImport(action.workspaceId, preview.uid, preview.items.filter((item) => item.change !== "unchanged").map((item) => item.identity));
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "preview-source-import") return this.previewSourceImport(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector, action.input, action.attachToWorkItemUid);
		if (action.kind === "read-source-import-detail") return this.readSourceImportDetail(action.workspaceId, action.previewUid, action.identity);
		if (action.kind === "apply-source-import") {
			await this.applySourceImport(action.workspaceId, action.previewUid, action.identities);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "resolve-work-item-removal") {
			await this.resolveWorkItemRemoval(action.workspaceId, action.workItemUid, action.decision);
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
			const workItem = artifact.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
			if (workItem !== void 0 && !(workItem.developmentTargets ?? []).includes(action.repositoryId)) throw new Error(`repository ${action.repositoryId} is not a confirmed development target`);
			if (workItem !== void 0 && (workItem.developmentTargetDetails?.[action.repositoryId] ?? "").trim() === "") throw new Error(`repository ${action.repositoryId} is missing its concrete development target`);
			await this.git.create(snapshot.workspace.path, snapshot.project, artifact, action.repositoryId);
			await appendEvent(snapshot.workspace.path, "development.workspace-created", artifact.key, artifact.stage, { repositoryId: action.repositoryId });
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-install-openspec") {
			await this.installOpenSpec(action.workspaceId, action.workItemUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-initialize-openspec") {
			await this.initializeOpenSpec(action.workspaceId, action.artifactUid, action.tools);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-fork-openspec-schema") {
			await this.forkOpenSpecSchema(action.workspaceId, action.artifactUid, action.schema);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-open-openspec-schema") {
			await this.openOpenSpecSchema(action.workspaceId, action.artifactUid, action.schema);
			return { opened: true };
		}
		if (action.kind === "development-inspect-openspec-templates") return { openSpecTemplates: await this.inspectOpenSpecTemplates(action.workspaceId, action.artifactUid, action.schema) };
		if (action.kind === "development-create-openspec-change") {
			await this.createOpenSpecChange(action.workspaceId, action.artifactUid, action.changeId, action.schema);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-status") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			await this.git.status(snapshot.workspace.path, action.artifactUid);
			return this.snapshot(action.workspaceId);
		}
		if (action.kind === "development-skip-test") {
			const snapshot = await this.requireSnapshot(action.workspaceId);
			const artifact = this.requireArtifact(snapshot, action.artifactUid);
			await this.git.skipTest(snapshot.workspace.path, artifact.uid, action.repositoryId, action.reason);
			await appendEvent(snapshot.workspace.path, "test.skipped", artifact.key, artifact.stage, {
				repositoryId: action.repositoryId,
				reason: action.reason.trim()
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
		await mkdir(join(sddRoot, "work-items"), { recursive: true });
		await mkdir(join(sddRoot, "imports", "pending"), { recursive: true });
		await mkdir(join(sddRoot, "imports", "history"), { recursive: true });
		await mkdir(join(sddRoot, "business", "connectors"), { recursive: true });
		await mkdir(join(sddRoot, "business", "adapters"), { recursive: true });
		await mkdir(join(sddRoot, "runs"), { recursive: true });
		await mkdir(join(sddRoot, "events"), { recursive: true });
		await mkdir(join(sddRoot, "development"), { recursive: true });
		await ensureProjectTemplates(workspace.path);
		for (const stage of STAGES) await mkdir(join(sddRoot, "artifacts", stage.id), { recursive: true });
		const businessGuidePath = join(sddRoot, "business", "README.md");
		if (!await exists(businessGuidePath)) await writeFile(businessGuidePath, BUSINESS_GUIDE, "utf8");
		const projectPath = join(workspace.path, PROJECT_FILE);
		const created = !await exists(projectPath);
		if (created) await writeFile(projectPath, stringify(defaultProject(workspace.path)), "utf8");
		const gitignorePath = join(workspace.path, ".gitignore");
		const gitignore = await exists(gitignorePath) ? await readFile(gitignorePath, "utf8") : "";
		if (!gitignore.split(/\r?\n/).includes(".sdd-workspaces/")) await writeFile(gitignorePath, `${gitignore === "" || gitignore.endsWith("\n") ? gitignore : `${gitignore}\n`}\n# DSH SDD per-requirement isolated checkouts and unconfirmed import previews\n.sdd-workspaces/\n.sdd/imports/pending/\n`, "utf8");
		else if (!gitignore.split(/\r?\n/).includes(".sdd/imports/pending/")) await writeFile(gitignorePath, `${gitignore.endsWith("\n") ? gitignore : `${gitignore}\n`}.sdd/imports/pending/\n`, "utf8");
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
			connectors: [],
			workItems: [],
			runs: [],
			quality: {},
			developmentWorkspaces: [],
			openSpecValidation: {},
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
				connectors: [],
				workItems: [],
				runs: [],
				quality: {},
				developmentWorkspaces: [],
				openSpecValidation: {},
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
			connectors: [],
			workItems: [],
			runs: [],
			quality: {},
			developmentWorkspaces: [],
			openSpecValidation: {},
			dashboard: this.emptyDashboard()
		};
		const project = normalizeProject(validation.project);
		const artifacts = [];
		const artifactManifests = [...await walkForManifest(join(workspace.path, ".sdd", "artifacts")), ...await walkForManifest(join(workspace.path, ".sdd", "work-items"))];
		for (const manifestPath of [...new Set(artifactManifests)].sort()) try {
			const parsedManifest = parse(await readFile(manifestPath, "utf8"));
			const manifest = {
				...parsedManifest,
				basedOn: parsedManifest.basedOn ?? [],
				derivedFrom: parsedManifest.derivedFrom ?? [],
				externalRefs: parsedManifest.externalRefs ?? [],
				checklist: parsedManifest.checklist ?? {}
			};
			const entryExists = await exists(typeof manifest.entry === "string" ? join(dirname(manifestPath), manifest.entry) : manifestPath);
			const validationErrors = validateManifest(manifest, entryExists);
			if (manifest.template !== void 0) {
				const artifactRoot = dirname(manifestPath);
				const templatePath = resolve(artifactRoot, manifest.template.snapshotPath);
				const configPath = resolve(artifactRoot, manifest.template.configSnapshotPath);
				if (!contained$1(artifactRoot, templatePath) || !contained$1(artifactRoot, configPath)) validationErrors.push("template snapshot escapes artifact directory");
				else if (!await exists(templatePath) || !await exists(configPath)) validationErrors.push("template snapshot files are missing");
				else if (`sha256:${createHash("sha256").update(await readFile(templatePath)).digest("hex")}` !== manifest.template.contentHash) validationErrors.push("template snapshot differs from manifest hash");
			}
			const files = await artifactFiles(dirname(manifestPath));
			if (entryExists && manifest.status === "accepted") {
				const actualHash = artifactBundleHash(files);
				if (manifest.files === void 0) validationErrors.push("accepted artifact is missing its frozen file inventory");
				else if (JSON.stringify(manifest.files) !== JSON.stringify(files)) validationErrors.push("accepted artifact file inventory differs from disk");
				if (manifest.contentHash === void 0) validationErrors.push("accepted artifact is missing contentHash");
				else if (manifest.contentHash !== actualHash) validationErrors.push("accepted artifact bundle differs from its frozen hash");
			}
			artifacts.push({
				...manifest,
				files,
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
				files: [],
				relativeDirectory: relative(workspace.path, dirname(manifestPath)),
				validationErrors: [error instanceof Error ? error.message : String(error)]
			});
		}
		const sources = await this.listSources(workspace.path);
		const workItems = await this.listWorkItems(workspace.path);
		const connectors = await this.connectors.list(workspace.path);
		const runs = await this.listRuns(workspace.path);
		const developmentWorkspaces = await listDevelopmentWorkspaces(workspace.path, artifacts);
		const openSpecValidation = await this.validateOpenSpecSettings(workspace.path, project, workItems, artifacts, developmentWorkspaces);
		for (const run of runs) {
			if (run.status === "completed" || run.sessionId === void 0) continue;
			const artifact = artifacts.find((item) => item.uid === run.artifactUid);
			if (artifact !== void 0) {
				const workItem = workItems.find((item) => item.uid === artifact.workItemUid);
				this.bindRuntime(run.sessionId, run.stage, workspace.path, project, artifact, developmentWorkspaces.find((item) => item.artifactUid === artifact.uid), workItem, workItem === void 0 ? void 0 : openSpecValidation[workItem.uid], run.codeReferences ?? []);
			}
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
		const recentEvents = await readRecentEvents(workspace.path, 5e3);
		const dashboard = this.dashboard(artifacts, sources, workItems, quality, developmentWorkspaces, recentEvents);
		const projectRepository = await this.projectGit.inspect(workspace.path, project);
		projectRepository.keyConflicts = artifactKeyConflicts(artifacts, runs, developmentWorkspaces);
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
			connectors,
			workItems,
			runs,
			quality,
			developmentWorkspaces,
			openSpecValidation,
			dashboard,
			projectRepository
		};
	}
	async validateOpenSpecSettings(workspacePath, project, workItems, artifacts, developmentWorkspaces) {
		const result = {};
		const cli = await this.openSpecCli(workspacePath);
		const cliFields = {
			cliInstalled: cli.installed,
			...cli.version === void 0 ? {} : { cliVersion: cli.version },
			...cli.installed ? {} : { canInstall: true }
		};
		for (const workItem of workItems) {
			const configured = workItem.openSpec;
			if (configured?.enabled !== true) continue;
			if (configured.repositoryId === void 0 || configured.path === void 0) {
				result[workItem.uid] = {
					status: "invalid",
					message: "配置缺少仓库或相对路径",
					code: "invalid-settings",
					...cliFields
				};
				continue;
			}
			if (!project.development.repositories.some((item) => item.id === configured.repositoryId) || !(workItem.developmentTargets ?? []).includes(configured.repositoryId)) {
				result[workItem.uid] = {
					status: "invalid",
					message: "配置仓库不属于本需求的开发目标",
					code: "invalid-settings",
					...cliFields
				};
				continue;
			}
			const developmentArtifactUids = new Set(artifacts.filter((item) => item.stage === "development" && item.workItemUid === workItem.uid).map((item) => item.uid));
			const repository = developmentWorkspaces.filter((item) => developmentArtifactUids.has(item.artifactUid)).flatMap((item) => item.repositories).find((item) => item.id === configured.repositoryId);
			if (repository === void 0) {
				result[workItem.uid] = {
					status: "pending",
					message: `已配置，创建开发空间后检查目录；${cli.installed ? `CLI ${cli.version ?? "已安装"}` : "CLI 未安装"}`,
					...cliFields
				};
				continue;
			}
			const root = resolve(repository.path);
			const target = resolve(root, configured.path);
			if (!contained$1(root, target)) {
				result[workItem.uid] = {
					status: "invalid",
					message: "OpenSpec 路径超出代码仓库",
					code: "unsafe-path",
					...cliFields
				};
				continue;
			}
			try {
				if (!(await stat(target)).isDirectory()) {
					result[workItem.uid] = {
						status: "invalid",
						message: "配置路径不是目录",
						code: "not-directory",
						...cliFields
					};
					continue;
				}
				if (!(await exists(join(target, "config.yaml")) || await exists(join(target, "config.yml")))) {
					result[workItem.uid] = {
						status: "invalid",
						message: `配置目录中不存在 config.yaml；${cli.installed ? "可使用 CLI 初始化" : "CLI 未安装"}`,
						code: "missing-config",
						canInitialize: cli.installed,
						...cliFields
					};
					continue;
				}
				const configPath = await exists(join(target, "config.yaml")) ? join(target, "config.yaml") : join(target, "config.yml");
				let configuredSchema = configured.schema ?? "spec-driven";
				try {
					const config = parse(await readFile(configPath, "utf8"));
					if (configured.schema === void 0 && typeof config.schema === "string" && config.schema.trim() !== "") configuredSchema = config.schema.trim();
				} catch {}
				const schemaRoot = join(target, "schemas");
				const projectSchemas = await exists(schemaRoot) ? (await readdir(schemaRoot, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name) : [];
				const availableSchemas = [.../* @__PURE__ */ new Set([
					"spec-driven",
					configuredSchema,
					...projectSchemas
				])].sort();
				const changeId = configured.changeId;
				result[workItem.uid] = cli.installed ? {
					status: "valid",
					message: `已初始化；Schema ${configuredSchema}${changeId === void 0 ? "；尚未创建当前需求 Change" : ""}`,
					schema: configuredSchema,
					availableSchemas,
					...changeId === void 0 ? {} : {
						changeId,
						changeExists: await exists(join(target, "changes", changeId))
					},
					...cliFields
				} : {
					status: "pending",
					message: "配置目录有效；OpenSpec CLI 未安装，可安装或忽略继续",
					code: "cli-missing",
					schema: configuredSchema,
					availableSchemas,
					...changeId === void 0 ? {} : {
						changeId,
						changeExists: await exists(join(target, "changes", changeId))
					},
					...cliFields
				};
			} catch {
				result[workItem.uid] = {
					status: "invalid",
					message: `隔离代码空间中不存在配置目录；${cli.installed ? "可使用 CLI 初始化" : "CLI 未安装"}`,
					code: "missing-directory",
					canInitialize: cli.installed,
					...cliFields
				};
			}
		}
		return result;
	}
	async listWorkItems(workspacePath) {
		const root = join(workspacePath, ".sdd", "work-items");
		if (!await exists(root)) return [];
		const result = [];
		for (const directory of await readdir(root, { withFileTypes: true })) {
			if (!directory.isDirectory()) continue;
			const path = join(root, directory.name, "work-item.yaml");
			if (!await exists(path)) continue;
			try {
				const item = parse(await readFile(path, "utf8"));
				if (item.schema !== "dsh-sdd/work-item@1" || typeof item.uid !== "string" || typeof item.key !== "string") continue;
				result.push({
					...item,
					relations: item.relations ?? [],
					executionMode: item.executionMode ?? "standalone"
				});
			} catch {}
		}
		return result.sort((left, right) => left.key.localeCompare(right.key));
	}
	currentSourceUids(snapshot, workItem, stage) {
		const includeAttached = stage === void 0 || stage === "specification" || stage === "development";
		const owned = snapshot.workItems.filter((item) => item.uid === workItem.uid || includeAttached && item.status !== "completed" && item.executionMode === "attached" && item.parentWorkItemUid === workItem.uid);
		return [...new Set(owned.flatMap((item) => [item.sourceUid, item.bundleSourceUid]).filter((uid) => uid !== void 0))];
	}
	async createDraft(workspaceId, stage, title, basedOn, sourceUids, workItemUid) {
		if (title.trim() === "") throw new Error("title must not be empty");
		await this.initialize(workspaceId);
		const snapshot = await this.snapshot(workspaceId);
		const workItem = workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === workItemUid);
		if (workItemUid !== void 0 && workItem === void 0) throw new Error(`work item not found: ${workItemUid}`);
		const definition = stageDefinition(stage);
		const stageTemplate = await loadStageTemplate(snapshot.workspace.path, stage);
		const key = this.nextKey(snapshot.artifacts, definition.prefix);
		if (snapshot.artifacts.some((item) => item.key === key)) throw new Error(`artifact key already exists: ${key}`);
		const uid = randomUUID();
		const directory = join(workItem === void 0 ? join(snapshot.workspace.path, ".sdd", "artifacts") : join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "artifacts"), stage, `${slug(key)}-${uid.slice(0, 8)}`);
		await mkdir(directory, { recursive: true });
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const refs = basedOn.map((inputUid) => {
			const input = snapshot.artifacts.find((item) => item.uid === inputUid);
			if (input === void 0) throw new Error(`input artifact not found: ${inputUid}`);
			if (input.status !== "accepted") throw new Error(`input artifact is not accepted: ${input.key}`);
			if (input.validationErrors.length > 0) throw new Error(`input artifact is invalid: ${input.key}: ${input.validationErrors.join("; ")}`);
			if (workItem !== void 0 && input.workItemUid !== workItem.uid) throw new Error(`input artifact belongs to another work item: ${input.key}`);
			return {
				uid: input.uid,
				version: input.version,
				contentHash: input.contentHash
			};
		});
		const allowedSourceUids = workItem === void 0 ? void 0 : new Set(this.currentSourceUids(snapshot, workItem, stage));
		const sourceRefs = sourceUids.map((sourceUid) => {
			const source = snapshot.sources.find((item) => item.uid === sourceUid);
			if (source === void 0) throw new Error(`source not found: ${sourceUid}`);
			if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join("; ")}`);
			if (workItem !== void 0 && !allowedSourceUids.has(source.uid)) throw new Error(`source is not current for work item ${workItem.key}`);
			return {
				uid: source.uid,
				provider: source.provider,
				kind: source.kind,
				...source.externalKey === void 0 ? {} : { externalKey: source.externalKey },
				...source.contentHash === void 0 ? {} : { contentHash: source.contentHash }
			};
		});
		if (workItem !== void 0 && refs.length === 0 && sourceRefs.length === 0) throw new Error(`select at least one current source or accepted deliverable for work item ${workItem.key}`);
		const requiredStages = snapshot.project?.workflow?.mode === "strict" ? Object.entries(snapshot.project.dependencies[stage] ?? {}).filter(([, mode]) => mode === "required").map(([requiredStage]) => requiredStage) : [];
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
			checklist: Object.fromEntries(runtimeDefinition(stage).completionChecklist.map((_label, index) => [`item-${index + 1}`, false])),
			...workItem === void 0 ? {} : { workItemUid: workItem.uid }
		};
		manifest.template = await snapshotStageTemplate(directory, stageTemplate);
		await writeFile(join(directory, "manifest.yaml"), stringify(manifest), "utf8");
		await writeFile(join(directory, "deliverable.md"), renderStageTemplate(stageTemplate, key, title.trim()), "utf8");
		if (workItem?.stageApplicability?.[stage]?.status === "not-applicable") {
			const stageApplicability = { ...workItem.stageApplicability };
			delete stageApplicability[stage];
			await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify({
				...workItem,
				stageApplicability,
				updatedAt: now
			}), "utf8");
		}
		await appendEvent(snapshot.workspace.path, "artifact.created", key, stage, { artifactUid: uid });
	}
	async revisionPlan(snapshot, previous) {
		const changes = [];
		const workItem = previous.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === previous.workItemUid);
		const previousByStage = /* @__PURE__ */ new Map();
		for (const reference of previous.basedOn) {
			const input = snapshot.artifacts.find((item) => item.uid === reference.uid);
			if (input !== void 0) previousByStage.set(input.stage, reference);
		}
		const strictRequired = snapshot.project.workflow?.mode === "strict" ? Object.entries(snapshot.project.dependencies[previous.stage] ?? {}).filter(([, mode]) => mode === "required").map(([stage]) => stage) : [];
		const dependencyStages = /* @__PURE__ */ new Set([...previousByStage.keys(), ...strictRequired]);
		const basedOn = [];
		for (const stage of dependencyStages) {
			const current = snapshot.artifacts.filter((item) => item.stage === stage && item.status === "accepted" && (workItem === void 0 || item.workItemUid === workItem.uid)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
			const old = previousByStage.get(stage);
			if (current === void 0) {
				if (snapshot.project.workflow?.mode === "strict" && (snapshot.project.dependencies[previous.stage] ?? {})[stage] === "required") throw new Error(`missing accepted ${stage} input for revision`);
				if (old !== void 0) basedOn.push(old);
				continue;
			}
			const next = {
				uid: current.uid,
				version: current.version,
				contentHash: current.contentHash
			};
			basedOn.push(next);
			if (old?.uid !== next.uid || old.version !== next.version || old.contentHash !== next.contentHash) changes.push({
				kind: "artifact",
				label: `${stageDefinition(stage).label} · ${current.key}`,
				...old === void 0 ? {} : { previous: old },
				current: next
			});
		}
		const currentSourceUids = workItem === void 0 ? previous.derivedFrom.map((item) => item.uid) : this.currentSourceUids(snapshot, workItem, previous.stage);
		const derivedFrom = previous.stage === "requirements" || previous.derivedFrom.length > 0 ? currentSourceUids.map((uid) => {
			const source = snapshot.sources.find((item) => item.uid === uid);
			if (source === void 0) throw new Error(`current source not found: ${uid}`);
			return {
				uid: source.uid,
				provider: source.provider,
				kind: source.kind,
				...source.externalKey === void 0 ? {} : { externalKey: source.externalKey },
				...source.contentHash === void 0 ? {} : { contentHash: source.contentHash }
			};
		}) : [];
		const sourceKey = (source) => `${source.provider}:${source.kind}:${source.externalKey ?? source.uid}`;
		const oldSources = new Map(previous.derivedFrom.map((item) => [sourceKey(item), item]));
		const newSources = new Map(derivedFrom.map((item) => [sourceKey(item), item]));
		for (const key of /* @__PURE__ */ new Set([...oldSources.keys(), ...newSources.keys()])) {
			const old = oldSources.get(key);
			const current = newSources.get(key);
			if (old?.uid !== current?.uid || old?.contentHash !== current?.contentHash) changes.push({
				kind: "source",
				label: current?.externalKey ?? old?.externalKey ?? key,
				...old === void 0 ? {} : { previous: old },
				...current === void 0 ? {} : { current }
			});
		}
		const currentTemplate = await loadStageTemplate(snapshot.workspace.path, previous.stage);
		const templateChanged = previous.template !== void 0 && (previous.template.contentHash !== currentTemplate.contentHash || previous.template.version !== currentTemplate.config.version);
		if (templateChanged) changes.push({
			kind: "template",
			label: `${stageDefinition(previous.stage).label}交付件模板`,
			...previous.template === void 0 ? {} : { previous: {
				version: previous.template.version,
				contentHash: previous.template.contentHash
			} },
			current: {
				version: currentTemplate.config.version,
				contentHash: currentTemplate.contentHash
			}
		});
		return {
			preview: {
				schema: "dsh-sdd/revision-preview@1",
				artifactUid: previous.uid,
				key: previous.key,
				version: previous.version,
				nextVersion: nextVersion(previous.version),
				changes,
				canCreateFromUpstream: changes.length > 0
			},
			basedOn,
			derivedFrom,
			templateChanged
		};
	}
	async previewRevision(workspaceId, artifactUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const previous = this.requireArtifact(snapshot, artifactUid);
		if (previous.status !== "accepted") throw new Error("only an accepted artifact can start a new revision");
		return (await this.revisionPlan(snapshot, previous)).preview;
	}
	async createRevision(workspaceId, artifactUid, revisionKind, reason, affectedAreas) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const previous = this.requireArtifact(snapshot, artifactUid);
		if (previous.status !== "accepted") throw new Error("only an accepted artifact can start a new revision");
		if (snapshot.artifacts.some((item) => item.supersedes?.uid === previous.uid && item.status !== "superseded")) throw new Error("this artifact already has an active revision");
		const plan = await this.revisionPlan(snapshot, previous);
		if (revisionKind === "upstream" && !plan.preview.canCreateFromUpstream) throw new Error("upstream inputs, source hashes and template are unchanged; no upstream revision can be created");
		const normalizedReason = reason?.trim();
		if (revisionKind === "user-intent" && !normalizedReason) throw new Error("a user-intent revision requires a change reason");
		const uid = randomUUID();
		const previousDirectory = resolve(snapshot.workspace.path, previous.relativeDirectory);
		const directory = join(dirname(previousDirectory), `${slug(previous.key)}-${uid.slice(0, 8)}`);
		await mkdir(directory, { recursive: true });
		for (const file of previous.files) {
			const source = resolve(previousDirectory, file.path);
			const target = resolve(directory, file.path);
			if (!contained$1(previousDirectory, source) || !contained$1(directory, target)) throw new Error("artifact file escapes its directory");
			await mkdir(dirname(target), { recursive: true });
			await copyFile(source, target);
		}
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const previousRunUid = snapshot.runs.filter((item) => item.artifactUid === previous.uid).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.uid;
		const revision = {
			kind: revisionKind,
			createdAt: now,
			changes: plan.preview.changes,
			...normalizedReason === void 0 ? {} : { reason: normalizedReason },
			...(affectedAreas ?? []).map((item) => item.trim()).filter(Boolean).length === 0 ? {} : { affectedAreas: [...new Set(affectedAreas.map((item) => item.trim()).filter(Boolean))] },
			...previousRunUid === void 0 ? {} : { previousRunUid }
		};
		const manifest = {
			schema: "dsh-sdd/artifact@1",
			uid,
			key: previous.key,
			title: previous.title,
			stage: previous.stage,
			type: previous.type,
			version: nextVersion(previous.version),
			status: "draft",
			entry: previous.entry,
			createdAt: now,
			updatedAt: now,
			basedOn: plan.basedOn,
			derivedFrom: plan.derivedFrom,
			externalRefs: previous.externalRefs,
			checklist: Object.fromEntries(runtimeDefinition(previous.stage).completionChecklist.map((_label, index) => [`item-${index + 1}`, false])),
			...previous.template === void 0 ? {} : { template: previous.template },
			supersedes: {
				uid: previous.uid,
				version: previous.version,
				contentHash: previous.contentHash
			},
			revision,
			...previous.workItemUid === void 0 ? {} : { workItemUid: previous.workItemUid }
		};
		if (plan.templateChanged) manifest.template = await snapshotStageTemplate(directory, await loadStageTemplate(snapshot.workspace.path, previous.stage));
		await writeFile(join(directory, "manifest.yaml"), stringify(manifest), "utf8");
		if (previous.stage === "development") await this.git.inheritRevision(snapshot.workspace.path, previous.uid, {
			...manifest,
			files: [],
			relativeDirectory: relative(snapshot.workspace.path, directory),
			validationErrors: []
		});
		await appendEvent(snapshot.workspace.path, "artifact.revision-created", previous.key, previous.stage, {
			artifactUid: uid,
			supersedes: previous.uid,
			version: manifest.version,
			revisionKind,
			changes: revision.changes.length,
			previousRunUid
		});
	}
	async discardDraft(workspaceId, artifactUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		if (artifact.status !== "draft" && artifact.status !== "in-review") throw new Error("only a draft or in-review artifact can be discarded");
		if (snapshot.developmentWorkspaces.some((item) => item.artifactUid === artifact.uid)) {
			if (!(artifact.supersedes?.uid === void 0 ? false : await this.git.discardInheritedRevision(snapshot.workspace.path, artifact.uid, artifact.supersedes.uid))) throw new Error("cannot discard an artifact after its development workspace has been created");
		}
		const root = resolve(snapshot.workspace.path, ".sdd");
		const source = resolve(snapshot.workspace.path, artifact.relativeDirectory);
		if (!contained$1(root, source)) throw new Error("artifact directory escapes .sdd");
		const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
		const artifactTrash = join(root, "trash", "artifacts", `${stamp}-${artifact.uid}`);
		await mkdir(dirname(artifactTrash), { recursive: true });
		await rename(source, artifactTrash);
		for (const run of snapshot.runs.filter((item) => item.artifactUid === artifact.uid)) {
			if (run.sessionId !== void 0) this.sessionController?.unbind(run.sessionId);
			const runSource = join(root, "runs", `${run.uid}.yaml`);
			if (await exists(runSource)) {
				const runTrash = join(root, "trash", "runs", `${stamp}-${run.uid}.yaml`);
				await mkdir(dirname(runTrash), { recursive: true });
				await rename(runSource, runTrash);
			}
		}
		await appendEvent(snapshot.workspace.path, "artifact.discarded", artifact.key, artifact.stage, {
			artifactUid,
			version: artifact.version,
			trashPath: relative(snapshot.workspace.path, artifactTrash)
		});
	}
	async readArtifactFile(workspaceId, artifactUid, requestedPath) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const manifest = requestedPath === "manifest.yaml";
		const file = manifest ? void 0 : artifact.files.find((item) => item.path === requestedPath);
		if (!manifest && file === void 0) throw new Error(`artifact file not found: ${requestedPath}`);
		const root = resolve(snapshot.workspace.path, artifact.relativeDirectory);
		const path = resolve(root, requestedPath);
		if (!contained$1(root, path)) throw new Error("artifact file escapes its directory");
		if (manifest) return {
			artifactUid,
			path: requestedPath,
			kind: "manifest",
			content: await readFile(path, "utf8")
		};
		if (file.kind === "binary") return {
			artifactUid,
			path: requestedPath,
			kind: "binary"
		};
		if (file.kind === "image") {
			if (file.size > 8 * 1024 * 1024) throw new Error("artifact image preview is limited to 8 MiB");
			return {
				artifactUid,
				path: requestedPath,
				kind: "image",
				dataUrl: `data:${{
					png: "image/png",
					jpg: "image/jpeg",
					jpeg: "image/jpeg",
					gif: "image/gif",
					webp: "image/webp",
					svg: "image/svg+xml"
				}[requestedPath.toLowerCase().split(".").pop() ?? ""] ?? "application/octet-stream"};base64,${(await readFile(path)).toString("base64")}`
			};
		}
		if (file.size > 2 * 1024 * 1024) throw new Error("artifact text preview is limited to 2 MiB");
		return {
			artifactUid,
			path: requestedPath,
			kind: file.kind,
			content: await readFile(path, "utf8")
		};
	}
	async openArtifactPath(workspaceId, artifactUid, requestedPath) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const root = resolve(snapshot.workspace.path, artifact.relativeDirectory);
		const path = resolve(root, requestedPath || ".");
		if (!contained$1(root, path)) throw new Error("artifact path escapes its directory");
		await access(path);
		const response = await this.api.host.openPath(request({ path }), AbortSignal.timeout(15e3));
		if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`);
	}
	async readStageTemplate(workspaceId, stage) {
		const template = await loadStageTemplate((await this.requireSnapshot(workspaceId)).workspace.path, stage);
		return {
			stage,
			version: template.config.version,
			documentName: template.config.documentName,
			directory: template.directoryRelative,
			configPath: template.configRelative,
			contentPath: template.contentRelative,
			contentHash: template.contentHash,
			requiredSections: template.config.requiredSections,
			content: template.content
		};
	}
	async openStageTemplate(workspaceId, stage, target) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const template = await loadStageTemplate(snapshot.workspace.path, stage);
		const path = target === "directory" ? template.directory : resolve(snapshot.workspace.path, target === "config" ? template.configRelative : template.contentRelative);
		if (!contained$1(resolve(snapshot.workspace.path, ".sdd", "templates"), path)) throw new Error("template path escapes .sdd/templates");
		const response = await this.api.host.openPath(request({ path }), AbortSignal.timeout(15e3));
		if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`);
	}
	async installOpenSpec(workspaceId, workItemUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const workItem = snapshot.workItems.find((item) => item.uid === workItemUid);
		if (workItem?.openSpec?.enabled !== true) throw new Error("OpenSpec is not enabled for this work item");
		const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
		if ((nodeMajor ?? 0) < 20 || nodeMajor === 20 && (nodeMinor ?? 0) < 19) throw new Error(`OpenSpec requires Node.js 20.19 or newer; current version is ${process.versions.node}`);
		const result = await runNative([
			nativeExecutable("npm"),
			"install",
			"-g",
			"@fission-ai/openspec@latest"
		], snapshot.workspace.path, 3e5);
		if (result.exitCode !== 0) throw new Error(`OpenSpec installation failed: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`}`);
		const cli = await this.openSpecCli(snapshot.workspace.path, true);
		if (!cli.installed) throw new Error("OpenSpec was installed but is not available on PATH; restart DSH or add the npm global bin directory to PATH");
		await appendEvent(snapshot.workspace.path, "development.openspec-cli-installed", workItem.key, "development", { version: cli.version });
	}
	async initializeOpenSpec(workspaceId, artifactUid, tools) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		if (artifact.stage !== "development" || artifact.workItemUid === void 0) throw new Error("OpenSpec can only be initialized for a bound development artifact");
		const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		const configured = workItem?.openSpec;
		if (workItem === void 0 || configured?.enabled !== true || configured.repositoryId === void 0 || configured.path === void 0) throw new Error("OpenSpec is not configured for this work item");
		if (!(workItem.developmentTargets ?? []).includes(configured.repositoryId)) throw new Error("OpenSpec repository is not a confirmed development target");
		const repository = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)?.repositories.find((item) => item.id === configured.repositoryId);
		if (repository === void 0) throw new Error("create the configured repository in the isolated development workspace first");
		const root = resolve(repository.path);
		const target = resolve(root, configured.path);
		if (!contained$1(root, target)) throw new Error("OpenSpec path escapes the isolated repository");
		if (basename(target) !== "openspec") throw new Error("OpenSpec CLI initialization requires the configured path to end with openspec");
		const normalizedTools = tools.trim();
		if (!/^(?:all|none|[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*)*)$/.test(normalizedTools)) throw new Error("invalid OpenSpec tool selection");
		const cli = await this.openSpecCli(snapshot.workspace.path);
		if (!cli.installed) throw new Error("OpenSpec CLI is not installed");
		const projectRoot = dirname(target);
		const command = await runNative([
			nativeExecutable("openspec"),
			"init",
			"--tools",
			normalizedTools,
			"--no-color",
			"--no-animation"
		], projectRoot, 18e4);
		if (command.exitCode !== 0) throw new Error(`OpenSpec initialization failed: ${command.stderr.trim() || command.stdout.trim() || `exit ${command.exitCode}`}`);
		if (!await exists(join(target, "config.yaml")) && !await exists(join(target, "config.yml"))) throw new Error("OpenSpec CLI completed without creating config.yaml");
		await appendEvent(snapshot.workspace.path, "development.openspec-initialized", artifact.key, artifact.stage, {
			repositoryId: configured.repositoryId,
			path: configured.path,
			tools: normalizedTools,
			version: cli.version
		});
	}
	async forkOpenSpecSchema(workspaceId, artifactUid, schema) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		const configured = workItem?.openSpec;
		const name = schema.trim();
		if (artifact.stage !== "development" || workItem === void 0 || configured?.enabled !== true || configured.repositoryId === void 0 || configured.path === void 0) throw new Error("OpenSpec is not configured for this development artifact");
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name === "spec-driven") throw new Error("custom schema name must be kebab-case and different from spec-driven");
		const repository = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)?.repositories.find((item) => item.id === configured.repositoryId);
		if (repository === void 0) throw new Error("create the configured repository in the isolated development workspace first");
		const target = resolve(repository.path, configured.path);
		if (!await exists(join(target, "config.yaml")) && !await exists(join(target, "config.yml"))) throw new Error("initialize OpenSpec before creating a custom schema");
		const projectRoot = dirname(target);
		const forked = await runNative([
			nativeExecutable("openspec"),
			"schema",
			"fork",
			"spec-driven",
			name,
			"--no-color"
		], projectRoot, 6e4);
		if (forked.exitCode !== 0) throw new Error(`OpenSpec schema fork failed: ${forked.stderr.trim() || forked.stdout.trim() || `exit ${forked.exitCode}`}`);
		const validated = await runNative([
			nativeExecutable("openspec"),
			"schema",
			"validate",
			name,
			"--no-color"
		], projectRoot, 6e4);
		if (validated.exitCode !== 0) throw new Error(`OpenSpec schema validation failed: ${validated.stderr.trim() || validated.stdout.trim() || `exit ${validated.exitCode}`}`);
		await this.updateWorkItemSettings(workspaceId, workItem.uid, workItem.repositoryScope ?? [], workItem.developmentTargets ?? [], workItem.developmentTargetDetails, {
			...configured,
			schema: name
		});
		await appendEvent(snapshot.workspace.path, "development.openspec-schema-forked", artifact.key, artifact.stage, {
			schema: name,
			repositoryId: configured.repositoryId
		});
	}
	async createOpenSpecChange(workspaceId, artifactUid, changeId, schema) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		const configured = workItem?.openSpec;
		const normalizedChangeId = changeId.trim();
		const normalizedSchema = schema.trim();
		if (artifact.stage !== "development" || workItem === void 0 || configured?.enabled !== true || configured.repositoryId === void 0 || configured.path === void 0) throw new Error("OpenSpec is not configured for this development artifact");
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedChangeId)) throw new Error("OpenSpec change id must be kebab-case");
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSchema)) throw new Error("OpenSpec schema must be kebab-case");
		const repository = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)?.repositories.find((item) => item.id === configured.repositoryId);
		if (repository === void 0) throw new Error("create the configured repository in the isolated development workspace first");
		const target = resolve(repository.path, configured.path);
		if (await exists(join(target, "changes", normalizedChangeId))) throw new Error(`OpenSpec change already exists: ${normalizedChangeId}`);
		const validated = await runNative([
			nativeExecutable("openspec"),
			"schema",
			"validate",
			normalizedSchema,
			"--no-color"
		], dirname(target), 6e4);
		if (validated.exitCode !== 0) throw new Error(`OpenSpec schema validation failed: ${validated.stderr.trim() || validated.stdout.trim() || `exit ${validated.exitCode}`}`);
		const created = await runNative([
			nativeExecutable("openspec"),
			"new",
			"change",
			normalizedChangeId,
			"--schema",
			normalizedSchema,
			"--json",
			"--no-color"
		], dirname(target), 6e4);
		if (created.exitCode !== 0) throw new Error(`OpenSpec change creation failed: ${created.stderr.trim() || created.stdout.trim() || `exit ${created.exitCode}`}`);
		if (!await exists(join(target, "changes", normalizedChangeId))) throw new Error("OpenSpec CLI completed without creating the change directory");
		await this.updateWorkItemSettings(workspaceId, workItem.uid, workItem.repositoryScope ?? [], workItem.developmentTargets ?? [], workItem.developmentTargetDetails, {
			...configured,
			schema: normalizedSchema,
			changeId: normalizedChangeId
		});
		await appendEvent(snapshot.workspace.path, "development.openspec-change-created", artifact.key, artifact.stage, {
			changeId: normalizedChangeId,
			schema: normalizedSchema,
			repositoryId: configured.repositoryId
		});
	}
	async openOpenSpecSchema(workspaceId, artifactUid, schema) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const configured = snapshot.workItems.find((item) => item.uid === artifact.workItemUid)?.openSpec;
		const normalizedSchema = schema.trim();
		if (configured?.enabled !== true || configured.repositoryId === void 0 || configured.path === void 0) throw new Error("OpenSpec is not configured for this work item");
		if (normalizedSchema === "spec-driven") throw new Error("official package templates are read-only; fork spec-driven before opening them for editing");
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSchema)) throw new Error("OpenSpec schema must be kebab-case");
		const repository = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)?.repositories.find((item) => item.id === configured.repositoryId);
		if (repository === void 0) throw new Error("create the configured repository in the isolated development workspace first");
		const openSpecRoot = resolve(repository.path, configured.path);
		const schemaPath = resolve(openSpecRoot, "schemas", normalizedSchema);
		if (!contained$1(openSpecRoot, schemaPath) || !await exists(schemaPath)) throw new Error(`project-local OpenSpec schema not found: ${normalizedSchema}`);
		const response = await this.api.host.openPath(request({ path: schemaPath }), AbortSignal.timeout(15e3));
		if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`);
	}
	async inspectOpenSpecTemplates(workspaceId, artifactUid, schema) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const configured = snapshot.workItems.find((item) => item.uid === artifact.workItemUid)?.openSpec;
		const normalizedSchema = schema.trim();
		if (configured?.enabled !== true || configured.repositoryId === void 0 || configured.path === void 0) throw new Error("OpenSpec is not configured for this work item");
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSchema)) throw new Error("OpenSpec schema must be kebab-case");
		const repository = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid)?.repositories.find((item) => item.id === configured.repositoryId);
		if (repository === void 0) throw new Error("create the configured repository in the isolated development workspace first");
		const target = resolve(repository.path, configured.path);
		const templates = await runNative([
			nativeExecutable("openspec"),
			"templates",
			"--schema",
			normalizedSchema,
			"--json",
			"--no-color"
		], dirname(target), 3e4);
		if (templates.exitCode !== 0) throw new Error(`OpenSpec template inspection failed: ${templates.stderr.trim() || templates.stdout.trim() || `exit ${templates.exitCode}`}`);
		let paths;
		try {
			const collect = (value) => typeof value === "string" && /\.md$/i.test(value) ? [value] : Array.isArray(value) ? value.flatMap(collect) : value !== null && typeof value === "object" ? Object.values(value).flatMap(collect) : [];
			paths = [...new Set(collect(JSON.parse(templates.stdout)))].sort();
		} catch {
			paths = templates.stdout.split(/\r?\n/).map((line) => line.split(/[→:]/).at(-1)?.trim() ?? "").filter((value) => /\.md$/i.test(value));
		}
		return {
			schema: normalizedSchema,
			paths
		};
	}
	async updateWorkItemSettings(workspaceId, workItemUid, repositoryScope, developmentTargets, developmentTargetDetails, openSpec) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const workItem = snapshot.workItems.find((item) => item.uid === workItemUid);
		if (workItem === void 0) throw new Error(`work item not found: ${workItemUid}`);
		const configured = new Set(snapshot.project.development.repositories.map((item) => item.id));
		const scope = [...new Set(repositoryScope)];
		const targets = [...new Set(developmentTargets)];
		if (scope.some((id) => !configured.has(id))) throw new Error("repository scope contains an unconfigured repository");
		if (targets.some((id) => !scope.includes(id))) throw new Error("development targets must be inside the selected repository scope");
		const details = Object.fromEntries(targets.map((id) => [id, String(developmentTargetDetails?.[id] ?? workItem.developmentTargetDetails?.[id] ?? "").trim()]));
		if (openSpec?.enabled === true) {
			if (openSpec.repositoryId === void 0 || !targets.includes(openSpec.repositoryId)) throw new Error("OpenSpec repository must be a confirmed development target");
			if (openSpec.path === void 0 || openSpec.path.trim() === "" || isAbsolute(openSpec.path) || openSpec.path.split(/[\\/]/).includes("..")) throw new Error("OpenSpec path must be a safe repository-relative path");
			if (openSpec.schema !== void 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(openSpec.schema)) throw new Error("OpenSpec schema must be kebab-case");
			if (openSpec.changeId !== void 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(openSpec.changeId)) throw new Error("OpenSpec change id must be kebab-case");
			if (workItem.openSpec?.changeId !== void 0 && openSpec.schema !== void 0 && openSpec.schema !== workItem.openSpec.schema) throw new Error("cannot change the OpenSpec schema after this work item has created a change");
		}
		const updated = {
			...workItem,
			repositoryScope: scope,
			developmentTargets: targets,
			developmentTargetDetails: details,
			openSpec: openSpec?.enabled === true ? {
				enabled: true,
				repositoryId: openSpec.repositoryId,
				path: openSpec.path.trim(),
				schema: openSpec.schema ?? workItem.openSpec?.schema ?? "spec-driven",
				...(openSpec.changeId ?? workItem.openSpec?.changeId) === void 0 ? {} : { changeId: openSpec.changeId ?? workItem.openSpec?.changeId }
			} : { enabled: false },
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify(updated), "utf8");
		await appendEvent(snapshot.workspace.path, "work-item.development-settings-updated", workItem.key, void 0, {
			repositoryScope: scope,
			developmentTargets: targets,
			developmentTargetDetails: details,
			openSpec: updated.openSpec
		});
	}
	async updateStageApplicability(workspaceId, workItemUid, stage, status, reason) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const workItem = snapshot.workItems.find((item) => item.uid === workItemUid);
		if (workItem === void 0) throw new Error(`work item not found: ${workItemUid}`);
		if (status === "not-applicable") {
			if (snapshot.artifacts.some((item) => item.workItemUid === workItemUid && item.stage === stage && item.status !== "superseded")) throw new Error("已有当前阶段交付件，不能标记为不适用");
			if (stage === "requirements") throw new Error("需求讨论阶段不能标记为不适用；可以直接使用原始来源创建其他阶段交付件");
		}
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const stageApplicability = { ...workItem.stageApplicability };
		if (status === "applicable") delete stageApplicability[stage];
		else stageApplicability[stage] = {
			status,
			...reason?.trim() ? { reason: reason.trim() } : {},
			updatedAt: now
		};
		await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify({
			...workItem,
			stageApplicability,
			updatedAt: now
		}), "utf8");
		await appendEvent(snapshot.workspace.path, `work-item.stage-${status}`, workItem.key, stage, { reason: reason?.trim() });
	}
	async addProjectRepository(workspaceId, id, source, baseBranch) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const normalizedId = id.trim();
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedId)) throw new Error("repository id must be kebab-case");
		if (source.trim() === "" || baseBranch.trim() === "") throw new Error("repository source and base branch are required");
		if (snapshot.project.development.repositories.some((item) => item.id === normalizedId)) throw new Error(`repository already exists: ${normalizedId}`);
		const sourceKind = await this.git.validateSource(snapshot.workspace.path, source.trim(), baseBranch.trim());
		const project = {
			...snapshot.project,
			development: {
				...snapshot.project.development,
				repositories: [...snapshot.project.development.repositories, {
					id: normalizedId,
					source: source.trim(),
					baseBranch: baseBranch.trim()
				}]
			}
		};
		await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), "utf8");
		await appendEvent(snapshot.workspace.path, "project.repository-added", normalizedId, void 0, {
			source: source.trim(),
			baseBranch: baseBranch.trim(),
			sourceKind
		});
	}
	async updateProjectCollaboration(workspaceId, remote, baseBranch, syncStrategy, commitScope) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const normalizedRemote = remote.trim();
		const normalizedBranch = baseBranch.trim();
		if (!/^[A-Za-z0-9._-]+$/.test(normalizedRemote)) throw new Error("Git remote 名称不合法");
		if (normalizedBranch === "") throw new Error("协作基线分支不能为空");
		const project = {
			...snapshot.project,
			collaboration: {
				remote: normalizedRemote,
				baseBranch: normalizedBranch,
				syncStrategy,
				commitScope
			}
		};
		await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), "utf8");
		await appendEvent(snapshot.workspace.path, "project.collaboration-updated", project.project.key, void 0, project.collaboration);
	}
	async resolveArtifactKeyConflict(workspaceId, artifactUid) {
		const snapshot = await this.requireSnapshot(workspaceId);
		if (snapshot.projectRepository?.keyConflicts.find((item) => item.renamableArtifactUids.includes(artifactUid)) === void 0) throw new Error("该交付件不能安全自动调整编号；已验收版本或已有会话必须人工处理");
		const artifact = this.requireArtifact(snapshot, artifactUid);
		const suffix = artifact.uid.replace(/[^a-fA-F0-9]/g, "").slice(0, 4).toUpperCase() || artifact.uid.slice(0, 4).toUpperCase();
		const key = `${artifact.key}-${suffix}`;
		if (snapshot.artifacts.some((item) => item.key === key && item.uid !== artifact.uid)) throw new Error(`建议编号仍然冲突：${key}`);
		const source = resolve(snapshot.workspace.path, artifact.relativeDirectory);
		const target = join(dirname(source), `${slug(key)}-${artifact.uid.slice(0, 8)}`);
		if (!contained$1(resolve(snapshot.workspace.path, ".sdd"), source) || !contained$1(resolve(snapshot.workspace.path, ".sdd"), target)) throw new Error("交付件目录超出 .sdd");
		if (source !== target && await exists(target)) throw new Error(`目标交付件目录已存在：${relative(snapshot.workspace.path, target)}`);
		const manifestPath = join(source, "manifest.yaml");
		const manifest = parse(await readFile(manifestPath, "utf8"));
		manifest.key = key;
		manifest.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		await writeFile(manifestPath, stringify(manifest), "utf8");
		const entryPath = join(source, manifest.entry);
		if (await exists(entryPath)) {
			const lines = (await readFile(entryPath, "utf8")).split(/\r?\n/);
			if (lines[0]?.startsWith(`# ${artifact.key} `)) lines[0] = `# ${key}${lines[0].slice(artifact.key.length + 2)}`;
			await writeFile(entryPath, lines.join("\n"), "utf8");
		}
		if (source !== target) await rename(source, target);
		await appendEvent(snapshot.workspace.path, "artifact.key-renumbered", key, artifact.stage, {
			artifactUid,
			previousKey: artifact.key,
			key
		});
	}
	async updateProjectRepositoryBranch(workspaceId, id, baseBranch) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const repository = snapshot.project.development.repositories.find((item) => item.id === id);
		if (repository === void 0) throw new Error(`repository not found: ${id}`);
		if (snapshot.developmentWorkspaces.some((workspace) => workspace.repositories.some((item) => item.id === id))) throw new Error("cannot change the base branch after an isolated development workspace has been created");
		const branch = baseBranch.trim();
		if (branch === "") throw new Error("base branch is required");
		await this.git.validateSource(snapshot.workspace.path, repository.source, branch);
		const project = {
			...snapshot.project,
			development: {
				...snapshot.project.development,
				repositories: snapshot.project.development.repositories.map((item) => item.id === id ? {
					...item,
					baseBranch: branch
				} : item)
			}
		};
		await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), "utf8");
		await appendEvent(snapshot.workspace.path, "project.repository-base-branch-updated", id, void 0, {
			previous: repository.baseBranch,
			baseBranch: branch
		});
	}
	async removeProjectRepository(workspaceId, id) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const repository = snapshot.project.development.repositories.find((item) => item.id === id);
		if (repository === void 0) throw new Error(`repository not found: ${id}`);
		if (snapshot.developmentWorkspaces.some((workspace) => workspace.repositories.some((item) => item.id === id))) throw new Error("cannot remove a repository after an isolated development workspace has been created");
		const project = {
			...snapshot.project,
			development: {
				...snapshot.project.development,
				repositories: snapshot.project.development.repositories.filter((item) => item.id !== id)
			}
		};
		await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), "utf8");
		for (const workItem of snapshot.workItems) {
			if (!(workItem.repositoryScope?.includes(id) || workItem.developmentTargets?.includes(id) || workItem.openSpec?.repositoryId === id)) continue;
			const updated = {
				...workItem,
				repositoryScope: (workItem.repositoryScope ?? []).filter((item) => item !== id),
				developmentTargets: (workItem.developmentTargets ?? []).filter((item) => item !== id),
				developmentTargetDetails: Object.fromEntries(Object.entries(workItem.developmentTargetDetails ?? {}).filter(([repositoryId]) => repositoryId !== id)),
				openSpec: workItem.openSpec?.repositoryId === id ? { enabled: false } : workItem.openSpec,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify(updated), "utf8");
		}
		await appendEvent(snapshot.workspace.path, "project.repository-removed", id, void 0, { source: repository.source });
	}
	nextKey(artifacts, prefix) {
		const expression = new RegExp(`^${prefix}-(\\d+)$`);
		const largest = artifacts.reduce((value, item) => {
			const match = expression.exec(item.key);
			return match === null ? value : Math.max(value, Number(match[1]));
		}, 0);
		return `${prefix}-${String(largest + 1).padStart(4, "0")}`;
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
	async previewSourceImport(workspaceId, providerName, kind, key, connector, input, attachToWorkItemUid) {
		if (kind.trim() === "" || key.trim() === "") throw new Error("source kind and key are required");
		let workspace = await this.workspace(workspaceId);
		if (!await exists(join(workspace.path, PROJECT_FILE))) {
			await this.initialize(workspaceId);
			workspace = await this.workspace(workspaceId);
		}
		const snapshot = await this.importProjectContext(workspace, false);
		if (this.sourceRegistry === void 0) throw new Error("source registry is unavailable");
		const parent = attachToWorkItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === attachToWorkItemUid);
		if (attachToWorkItemUid !== void 0 && parent === void 0) throw new Error(`parent work item not found: ${attachToWorkItemUid}`);
		if (parent !== void 0 && (kind.trim() !== "defect" || parent.kind !== "requirement" || parent.executionMode === "attached" || parent.status === "completed")) throw new Error("only defects can be attached to a standalone requirement work item");
		const executionMode = parent === void 0 ? "standalone" : "attached";
		const bundle = await this.sourceRegistry.fetch(providerName, {
			kind: kind.trim(),
			key: key.trim(),
			workspace: {
				workspaceId,
				path: snapshot.workspace.path,
				project: snapshot.project
			},
			...connector === void 0 ? {} : { connector },
			...input === void 0 ? {} : { input },
			signal: AbortSignal.timeout(6e4)
		});
		if (parent !== void 0 && bundle.items.some((item) => item.kind !== "defect")) throw new Error("an attached defect import must return defect items only");
		const incoming = bundle.items;
		const existing = snapshot.workItems.filter((item) => item.bundleKey === bundle.externalKey && item.provider === bundle.provider);
		const nextIdentities = new Set(incoming.map(sourceIdentity));
		const items = incoming.map((source) => {
			const identity = sourceIdentity(source);
			const workItem = snapshot.workItems.find((item) => item.provider === source.provider && item.kind === source.kind && item.key === (source.externalKey ?? source.uid));
			if (workItem === void 0) return {
				identity,
				externalKey: source.externalKey ?? source.uid,
				title: source.title,
				kind: source.kind,
				change: "added",
				changedPaths: []
			};
			const previous = snapshot.sources.find((item) => item.uid === workItem.sourceUid);
			const previousRoot = snapshot.sources.find((item) => item.uid === workItem.bundleSourceUid);
			const comparable = (value) => ({
				title: value.title,
				status: value.status,
				revision: value.revision,
				tracking: value.tracking,
				links: value.links,
				content: value.content
			});
			const paths = previous === void 0 ? ["source"] : changedPaths(comparable(previous), comparable(source), "source");
			if (bundle.root !== void 0 && previousRoot !== void 0) changedPaths(comparable(previousRoot), comparable(bundle.root), "bundle").forEach((path) => paths.push(path));
			if ((workItem.executionMode ?? "standalone") !== executionMode) paths.push("executionMode");
			if (workItem.parentWorkItemUid !== parent?.uid) paths.push("parentWorkItemUid");
			const uniquePaths = [...new Set(paths)];
			return {
				identity,
				externalKey: source.externalKey ?? source.uid,
				title: source.title,
				kind: source.kind,
				change: uniquePaths.length === 0 ? "unchanged" : "modified",
				changedPaths: uniquePaths,
				workItemUid: workItem.uid,
				currentExecutionMode: workItem.executionMode ?? "standalone",
				...workItem.parentWorkItemUid === void 0 ? {} : { currentParentWorkItemUid: workItem.parentWorkItemUid }
			};
		});
		for (const workItem of existing) {
			const identity = `${workItem.provider}:${workItem.kind}:${workItem.key}`;
			if (!nextIdentities.has(identity)) items.push({
				identity,
				externalKey: workItem.key,
				title: workItem.title,
				kind: workItem.kind,
				change: "removed",
				changedPaths: ["removed"],
				workItemUid: workItem.uid
			});
		}
		const preview = {
			schema: "dsh-sdd/import-preview@1",
			uid: randomUUID(),
			bundleKey: bundle.externalKey,
			bundleTitle: bundle.title,
			provider: bundle.provider,
			fetchedAt: bundle.fetchedAt,
			executionMode,
			...parent === void 0 ? {} : {
				parentWorkItemUid: parent.uid,
				parentWorkItemKey: parent.key,
				parentWorkItemTitle: parent.title
			},
			items
		};
		const staged = {
			preview,
			bundle
		};
		await writeFile(join(snapshot.workspace.path, ".sdd", "imports", "pending", `${preview.uid}.yaml`), stringify(staged), "utf8");
		return preview;
	}
	async readStagedImport(workspaceId, previewUid, includeArtifacts = false) {
		if (!/^[0-9a-f-]{36}$/i.test(previewUid)) throw new Error("invalid import preview id");
		const snapshot = await this.importProjectContext(await this.workspace(workspaceId), includeArtifacts);
		const path = join(snapshot.workspace.path, ".sdd", "imports", "pending", `${previewUid}.yaml`);
		if (!await exists(path)) throw new Error("import preview not found or expired");
		const staged = parse(await readFile(path, "utf8"));
		if (staged.preview?.schema !== "dsh-sdd/import-preview@1" || staged.preview.uid !== previewUid) throw new Error("invalid staged import");
		return {
			snapshot,
			path,
			staged
		};
	}
	async readSourceImportDetail(workspaceId, previewUid, identity) {
		const { snapshot, staged } = await this.readStagedImport(workspaceId, previewUid);
		const previewItem = staged.preview.items.find((item) => item.identity === identity);
		const workItem = previewItem?.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === previewItem.workItemUid);
		const previous = workItem?.sourceUid === void 0 ? void 0 : snapshot.sources.find((item) => item.uid === workItem.sourceUid);
		const source = staged.bundle.items.find((item) => sourceIdentity(item) === identity) ?? previous;
		if (source === void 0) throw new Error(`staged source is missing: ${identity}`);
		return {
			previewUid,
			identity,
			source,
			...previous === void 0 ? {} : { previous },
			...staged.bundle.root === void 0 ? {} : { root: staged.bundle.root },
			relations: staged.bundle.relations.filter((relation) => relation.from === (source.externalKey ?? source.uid) || relation.to === (source.externalKey ?? source.uid))
		};
	}
	async writeSourceSnapshot(workspacePath, sources, source) {
		const hash = sourceHash(source);
		const versionHash = sourceVersionHash(source);
		const same = sources.find((item) => sourceIdentity(item) === sourceIdentity(source) && sourceVersionHash(item) === versionHash);
		if (same !== void 0) return same.uid;
		const uid = sources.some((item) => item.uid === source.uid) ? `${source.uid}@${versionHash.slice(0, 12)}` : source.uid;
		const normalized = {
			...source,
			uid,
			contentHash: hash
		};
		const filename = `${slug(normalized.provider)}-${slug(normalized.externalKey ?? normalized.uid)}-${versionHash.slice(0, 12)}.yaml`;
		await writeFile(join(workspacePath, ".sdd", "sources", filename), stringify(normalized), "utf8");
		sources.push({
			...normalized,
			relativePath: relative(workspacePath, join(workspacePath, ".sdd", "sources", filename)),
			validationErrors: []
		});
		return uid;
	}
	async applySourceImport(workspaceId, previewUid, identities) {
		const { snapshot, path, staged } = await this.readStagedImport(workspaceId, previewUid, true);
		const executionMode = staged.preview.executionMode ?? "standalone";
		const parent = staged.preview.parentWorkItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === staged.preview.parentWorkItemUid);
		if (executionMode === "attached" && parent === void 0) throw new Error("attached defect target no longer exists");
		const selected = new Set(identities);
		const incoming = staged.bundle.items;
		const sources = [...snapshot.sources];
		const actionable = staged.preview.items.filter((item) => selected.has(item.identity) && item.change !== "unchanged");
		const affectedParentUids = new Set([parent?.uid, ...actionable.map((item) => item.workItemUid === void 0 ? void 0 : snapshot.workItems.find((workItem) => workItem.uid === item.workItemUid)?.parentWorkItemUid)].filter((uid) => uid !== void 0));
		const bundleSourceUid = staged.bundle.root !== void 0 && actionable.some((item) => item.change !== "removed") ? await this.writeSourceSnapshot(snapshot.workspace.path, sources, staged.bundle.root) : void 0;
		for (const previewItem of actionable) {
			const existing = previewItem.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === previewItem.workItemUid);
			if (existing !== void 0 && ((existing.executionMode ?? "standalone") !== executionMode || existing.parentWorkItemUid !== parent?.uid) && snapshot.artifacts.some((item) => item.workItemUid === existing.uid)) throw new Error(`cannot change delivery ownership for ${existing.key} after it has stage artifacts`);
			if (previewItem.change === "removed") {
				if (existing === void 0) continue;
				const artifacts = snapshot.artifacts.filter((item) => item.workItemUid === existing.uid && item.status === "accepted");
				const workItem = {
					...existing,
					status: "removed-pending",
					updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
					change: {
						kind: "removed",
						detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
						changedPaths: ["removed"],
						previousSourceUid: existing.sourceUid,
						reviewRequiredStages: [...new Set(artifacts.map((item) => item.stage))]
					}
				};
				await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", existing.uid, "work-item.yaml"), stringify(workItem), "utf8");
				await appendEvent(snapshot.workspace.path, "work-item.removal-detected", existing.key, void 0, {
					workItemUid: existing.uid,
					bundleKey: staged.bundle.externalKey
				});
				continue;
			}
			const source = incoming.find((item) => sourceIdentity(item) === previewItem.identity);
			if (source === void 0) throw new Error(`staged source is missing: ${previewItem.identity}`);
			const sourceUid = await this.writeSourceSnapshot(snapshot.workspace.path, sources, source);
			const now = (/* @__PURE__ */ new Date()).toISOString();
			const uid = existing?.uid ?? randomUUID();
			const acceptedStages = snapshot.artifacts.filter((item) => item.workItemUid === uid && item.status === "accepted").map((item) => item.stage);
			const workItem = {
				schema: "dsh-sdd/work-item@1",
				uid,
				key: source.externalKey ?? source.uid,
				title: source.title,
				kind: source.kind,
				provider: source.provider,
				bundleKey: staged.bundle.externalKey,
				sourceUid,
				executionMode,
				...parent === void 0 ? {} : { parentWorkItemUid: parent.uid },
				...bundleSourceUid === void 0 ? {} : { bundleSourceUid },
				relations: staged.bundle.relations.filter((relation) => relation.from === (source.externalKey ?? source.uid) || relation.to === (source.externalKey ?? source.uid)),
				status: existing === void 0 || executionMode === "attached" ? "active" : "change-pending",
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
				...existing?.repositoryScope === void 0 ? {} : { repositoryScope: existing.repositoryScope },
				...existing?.developmentTargets === void 0 ? {} : { developmentTargets: existing.developmentTargets },
				...existing?.developmentTargetDetails === void 0 ? {} : { developmentTargetDetails: existing.developmentTargetDetails },
				...existing?.stageApplicability === void 0 ? {} : { stageApplicability: existing.stageApplicability },
				...existing?.openSpec === void 0 ? {} : { openSpec: existing.openSpec },
				...existing === void 0 || executionMode === "attached" ? {} : { change: {
					kind: "modified",
					detectedAt: now,
					changedPaths: previewItem.changedPaths,
					previousSourceUid: existing.sourceUid,
					reviewRequiredStages: [.../* @__PURE__ */ new Set(["requirements", ...acceptedStages])]
				} }
			};
			await mkdir(join(snapshot.workspace.path, ".sdd", "work-items", uid), { recursive: true });
			await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", uid, "work-item.yaml"), stringify(workItem), "utf8");
			await appendEvent(snapshot.workspace.path, existing === void 0 ? "work-item.created" : "work-item.change-detected", workItem.key, void 0, {
				workItemUid: uid,
				bundleKey: staged.bundle.externalKey,
				changedPaths: previewItem.changedPaths
			});
		}
		for (const affectedParentUid of affectedParentUids) {
			const affectedParent = snapshot.workItems.find((item) => item.uid === affectedParentUid);
			if (affectedParent === void 0 || actionable.length === 0) continue;
			const now = (/* @__PURE__ */ new Date()).toISOString();
			const acceptedAffectedStages = snapshot.artifacts.filter((item) => item.workItemUid === affectedParent.uid && item.status === "accepted" && (item.stage === "specification" || item.stage === "development")).map((item) => item.stage);
			const changedPaths = actionable.map((item) => `attachedDefects.${item.externalKey}.${item.change}`);
			const updatedParent = {
				...affectedParent,
				status: "change-pending",
				updatedAt: now,
				change: {
					kind: affectedParent.change?.kind ?? "modified",
					detectedAt: now,
					changedPaths: [.../* @__PURE__ */ new Set([...affectedParent.change?.changedPaths ?? [], ...changedPaths])],
					reviewRequiredStages: [.../* @__PURE__ */ new Set([
						...affectedParent.change?.reviewRequiredStages ?? [],
						...acceptedAffectedStages,
						"development"
					])],
					...affectedParent.change?.previousSourceUid === void 0 ? {} : { previousSourceUid: affectedParent.change.previousSourceUid }
				}
			};
			await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", affectedParent.uid, "work-item.yaml"), stringify(updatedParent), "utf8");
			await appendEvent(snapshot.workspace.path, "work-item.defects-updated", affectedParent.key, void 0, {
				workItemUid: affectedParent.uid,
				defects: actionable.map((item) => item.externalKey)
			});
		}
		await appendEvent(snapshot.workspace.path, "source-bundle.applied", staged.bundle.externalKey, void 0, {
			previewUid,
			selected: actionable.length,
			total: staged.preview.items.length
		});
		const historyName = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${previewUid}.yaml`;
		await writeFile(join(snapshot.workspace.path, ".sdd", "imports", "history", historyName), stringify({
			schema: "dsh-sdd/import-record@1",
			preview: staged.preview,
			appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
			identities: [...selected],
			relations: staged.bundle.relations
		}), "utf8");
		await unlink(path);
	}
	async resolveWorkItemRemoval(workspaceId, workItemUid, decision) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const workItem = snapshot.workItems.find((item) => item.uid === workItemUid);
		if (workItem === void 0) throw new Error(`work item not found: ${workItemUid}`);
		if (workItem.status !== "removed-pending") throw new Error(`work item ${workItem.key} has no pending removal`);
		const updated = {
			...workItem,
			status: decision === "archive" ? "completed" : "active",
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			change: void 0
		};
		await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify(updated), "utf8");
		if (decision === "archive" && workItem.executionMode === "attached" && workItem.parentWorkItemUid !== void 0) {
			const parent = snapshot.workItems.find((item) => item.uid === workItem.parentWorkItemUid);
			if (parent !== void 0) {
				const reviewRequiredStages = snapshot.artifacts.filter((item) => item.workItemUid === parent.uid && item.status === "accepted" && (item.stage === "specification" || item.stage === "development")).map((item) => item.stage);
				const now = (/* @__PURE__ */ new Date()).toISOString();
				const parentUpdated = {
					...parent,
					status: "change-pending",
					updatedAt: now,
					change: {
						kind: parent.change?.kind ?? "modified",
						detectedAt: now,
						changedPaths: [.../* @__PURE__ */ new Set([...parent.change?.changedPaths ?? [], `attachedDefects.${workItem.key}.archived`])],
						reviewRequiredStages: [.../* @__PURE__ */ new Set([
							...parent.change?.reviewRequiredStages ?? [],
							...reviewRequiredStages,
							"development"
						])],
						...parent.change?.previousSourceUid === void 0 ? {} : { previousSourceUid: parent.change.previousSourceUid }
					}
				};
				await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", parent.uid, "work-item.yaml"), stringify(parentUpdated), "utf8");
			}
		}
		await appendEvent(snapshot.workspace.path, decision === "archive" ? "work-item.archived" : "work-item.removal-dismissed", workItem.key, void 0, { workItemUid });
	}
	hasCurrentChangeEvidence(snapshot, artifact, workItem) {
		if (workItem.change === void 0 || !workItem.change.reviewRequiredStages.includes(artifact.stage)) return true;
		const currentSources = new Set(this.currentSourceUids(snapshot, workItem, artifact.stage));
		if (currentSources.size > 0 && [...currentSources].every((uid) => artifact.derivedFrom.some((reference) => reference.uid === uid))) return true;
		const detectedAt = Date.parse(workItem.change.detectedAt);
		return artifact.basedOn.some((reference) => {
			const input = snapshot.artifacts.find((item) => item.uid === reference.uid);
			return input?.workItemUid === workItem.uid && input.status === "accepted" && Date.parse(input.updatedAt) >= detectedAt;
		});
	}
	staleInputLabels(snapshot, artifact) {
		const labels = [];
		for (const reference of artifact.basedOn) {
			const previous = snapshot.artifacts.find((item) => item.uid === reference.uid);
			if (previous === void 0) {
				labels.push(`缺失上游交付件 ${reference.uid}`);
				continue;
			}
			const current = snapshot.artifacts.filter((item) => item.stage === previous.stage && item.status === "accepted" && item.workItemUid === artifact.workItemUid).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
			if (current !== void 0 && (current.uid !== reference.uid || current.version !== reference.version || current.contentHash !== reference.contentHash)) labels.push(`${stageDefinition(previous.stage).label}已从 ${previous.version} 更新到 ${current.version}`);
		}
		if (artifact.workItemUid !== void 0) {
			const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
			if (workItem !== void 0) {
				const bound = new Set(artifact.derivedFrom.map((reference) => reference.uid));
				if (this.currentSourceUids(snapshot, workItem, artifact.stage).some((uid) => !bound.has(uid))) labels.push("原始需求或关联缺陷来源已更新");
			}
		}
		return labels;
	}
	stageSettingsError(snapshot, artifact) {
		if (artifact.workItemUid === void 0) return void 0;
		const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		if (workItem === void 0) return "bound work item is missing";
		const configured = new Set(snapshot.project?.development.repositories.map((item) => item.id) ?? []);
		if (artifact.stage === "development") {
			if ((workItem.developmentTargets ?? []).length === 0) return "开发测试阶段必须先在本需求开发设置中选择目标代码仓库";
			if (workItem.developmentTargets.some((id) => !configured.has(id))) return "开发目标包含未配置的项目代码仓库";
			if (workItem.developmentTargets.some((id) => (workItem.developmentTargetDetails?.[id] ?? "").trim() === "")) return "每个开发目标仓库都必须填写本需求的具体改动目标";
		}
	}
	async accept(workspaceId, artifactUid, checklist) {
		let snapshot = await this.snapshot(workspaceId);
		let artifact = snapshot.artifacts.find((item) => item.uid === artifactUid);
		if (artifact === void 0) throw new Error(`artifact not found: ${artifactUid}`);
		if (artifact.status !== "draft" && artifact.status !== "in-review") throw new Error(`artifact cannot be accepted from ${artifact.status}`);
		if (artifact.validationErrors.length > 0) throw new Error(`artifact validation failed: ${artifact.validationErrors.join("; ")}`);
		const changedWorkItem = artifact.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		if (changedWorkItem?.status === "removed-pending") throw new Error(`work item ${changedWorkItem.key} was removed externally; resolve the removal before accepting artifacts`);
		if (changedWorkItem !== void 0 && !this.hasCurrentChangeEvidence(snapshot, artifact, changedWorkItem)) throw new Error(`artifact does not include current change evidence for work item ${changedWorkItem.key}`);
		const staleInputs = this.staleInputLabels(snapshot, artifact);
		if (staleInputs.length > 0) throw new Error(`artifact inputs are stale: ${staleInputs.join("; ")}`);
		const settingsError = this.stageSettingsError(snapshot, artifact);
		if (settingsError !== void 0) throw new Error(settingsError);
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
		manifest.files = await artifactFiles(directory);
		manifest.contentHash = artifactBundleHash(manifest.files);
		if (manifest.supersedes !== void 0) {
			if (snapshot.artifacts.find((item) => item.uid === manifest.supersedes.uid)?.contentHash === manifest.contentHash) throw new Error("revision deliverable content is unchanged from the accepted version");
		}
		await writeFile(manifestPath, stringify(manifest), "utf8");
		if (manifest.supersedes !== void 0) {
			const previous = snapshot.artifacts.find((item) => item.uid === manifest.supersedes.uid);
			if (previous === void 0 || previous.status !== "accepted") throw new Error("superseded artifact must still be accepted");
			const previousPath = join(snapshot.workspace.path, previous.relativeDirectory, "manifest.yaml");
			const previousManifest = parse(await readFile(previousPath, "utf8"));
			previousManifest.status = "superseded";
			previousManifest.updatedAt = manifest.updatedAt;
			await writeFile(previousPath, stringify(previousManifest), "utf8");
		}
		if (artifact.workItemUid !== void 0) {
			const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
			if (workItem?.change !== void 0 && workItem.status === "change-pending") {
				const reviewRequiredStages = workItem.change.reviewRequiredStages.filter((stage) => stage !== artifact.stage);
				const updated = reviewRequiredStages.length === 0 ? {
					...workItem,
					status: "active",
					updatedAt: manifest.updatedAt,
					change: void 0
				} : {
					...workItem,
					updatedAt: manifest.updatedAt,
					change: {
						...workItem.change,
						reviewRequiredStages
					}
				};
				await writeFile(join(snapshot.workspace.path, ".sdd", "work-items", workItem.uid, "work-item.yaml"), stringify(updated), "utf8");
			}
		}
		await appendEvent(snapshot.workspace.path, "artifact.accepted", artifact.key, artifact.stage, { artifactUid });
	}
	async context(workspaceId, stage, artifactUid, artifactUids, sourceUids, preparedCodeReferences) {
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
		const workItem = target.workItemUid === void 0 ? void 0 : snapshot.workItems.find((item) => item.uid === target.workItemUid);
		if (workItem?.status === "removed-pending") throw new Error(`work item ${workItem.key} was removed externally; its stage conversations are blocked`);
		if (workItem !== void 0 && !this.hasCurrentChangeEvidence(snapshot, target, workItem)) throw new Error(`bound artifact does not include current change evidence for work item ${workItem.key}; create a new revision from the latest source and upstream artifacts`);
		const staleInputs = this.staleInputLabels(snapshot, target);
		if (staleInputs.length > 0) throw new Error(`bound artifact uses stale inputs: ${staleInputs.join("; ")}`);
		const settingsError = this.stageSettingsError(snapshot, target);
		if (settingsError !== void 0) throw new Error(settingsError);
		const definition = stageDefinition(stage);
		const runtime = runtimeDefinition(stage);
		const required = snapshot.project.workflow?.mode === "strict" ? Object.entries(snapshot.project.dependencies[stage] ?? {}).filter(([, mode]) => mode === "required").map(([id]) => id) : [];
		for (const requiredStage of required) if (!selected.some((item) => item.stage === requiredStage)) throw new Error(`conversation input is missing required ${requiredStage} artifact`);
		const codeReferences = preparedCodeReferences ?? (stage === "development" || snapshot.project.development.repositories.length === 0 ? [] : await this.git.prepareCodeReferences(snapshot.workspace.path, snapshot.project));
		const availableCode = codeReferences.filter((item) => item.available && item.path !== void 0 && item.baseCommit !== void 0);
		const unavailableCode = codeReferences.filter((item) => !item.available);
		const inputs = [];
		for (const artifact of selected) {
			const manifestPath = join(artifact.relativeDirectory, "manifest.yaml");
			const entryPath = join(artifact.relativeDirectory, artifact.entry);
			const inventory = artifact.files.map((file) => `- ${fileMention(join(artifact.relativeDirectory, file.path))} · ${file.kind} · ${file.contentHash}`).join("\n");
			inputs.push(`\n## 输入 ${artifact.key} v${artifact.version}\n交付件清单：${fileMention(manifestPath)}\n主文档：${fileMention(entryPath)}\n交付包哈希：${artifact.contentHash ?? "未记录"}\n文件清单：\n${inventory || "- 无"}\n读取要求：先读取清单和主文档；附件仅在当前问题需要时按清单读取。`);
		}
		for (const uid of sourceUids) {
			const source = snapshot.sources.find((item) => item.uid === uid);
			if (source === void 0) throw new Error(`source not found: ${uid}`);
			if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join("; ")}`);
			inputs.push(`\n## 原始来源 ${source.externalKey ?? source.uid} · ${source.title}\n来源文件：${fileMention(source.relativePath)}\nProvider：${source.provider}\n类型：${source.kind}\n内容哈希：${source.contentHash}\n读取要求：使用 read 工具读取来源文件后再提取需求，不得仅根据标题推断内容。`);
		}
		const targetManifestPath = join(target.relativeDirectory, "manifest.yaml");
		const targetEntryPath = join(target.relativeDirectory, target.entry);
		return [
			`你正在执行 DSH SDD 的“${definition.label}”阶段，角色侧重：${definition.role}。`,
			`项目仓库：${snapshot.workspace.path}`,
			availableCode.length === 0 ? "" : `项目代码仓库只读参考（自动提供，无需逐阶段选择）：\n${availableCode.map((reference) => `- ${reference.repositoryId}：${reference.path}\n  基线：${reference.baseBranch} @ ${reference.baseCommit.slice(0, 12)}\n  使用要求：按需读取当前实现；不得修改、提交、切换分支或清理该目录。`).join("\n")}`,
			unavailableCode.length === 0 ? "" : `暂不可用的项目代码参考（不阻止非开发阶段继续）：\n${unavailableCode.map((reference) => `- ${reference.repositoryId}：${reference.error ?? "准备失败"}`).join("\n")}`,
			`本次固定绑定交付件：${target.key}\n交付件清单：${fileMention(targetManifestPath)}\n交付件正文：${fileMention(targetEntryPath)}`,
			`阶段目标：${runtime.objective}`,
			workItem === void 0 ? "" : `本需求选择的仓库范围：${(workItem.repositoryScope ?? []).join("、") || "未配置"}\n本需求开发目标：${(workItem.developmentTargets ?? []).map((id) => `${id}${workItem.developmentTargetDetails?.[id] ? `（${workItem.developmentTargetDetails[id]}）` : ""}`).join("、") || "未配置"}\nOpenSpec：${openSpecDescription(workItem, snapshot.openSpecValidation[workItem.uid])}`,
			`完成清单：\n${runtime.completionChecklist.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
			target.template === void 0 ? "" : `本交付件固定模板快照：${fileMention(join(target.relativeDirectory, target.template.snapshotPath))}\n模板配置：${fileMention(join(target.relativeDirectory, target.template.configSnapshotPath))}\n模板版本：${target.template.version}\n模板哈希：${target.template.contentHash}`,
			target.revision === void 0 ? "" : `本次修订类型：${target.revision.kind === "upstream" ? "上游输入变更" : "用户主动调整"}\n变更原因：${target.revision.reason ?? "由结构化输入差异触发"}\n影响范围：${target.revision.affectedAreas?.join("、") || "待讨论确认"}\n输入差异：\n${target.revision.changes.map((change) => `- ${change.label}：${change.previous?.version ?? change.previous?.contentHash ?? "无"} → ${change.current?.version ?? change.current?.contentHash ?? "无"}`).join("\n") || "- 用户主动调整，上游输入未变化"}\n历史阶段运行：${target.revision.previousRunUid ?? "无"}`,
			"文件引用只提供定位信息，不代表文件内容已经进入上下文。首次回答前必须使用 read 工具读取绑定交付件、固定模板、全部所选来源及上游主文档，再检查输入完整性并与用户讨论；其他附件按需读取。每轮形成的确定结论必须同步写入绑定交付件；不得创建或切换到另一个交付件。",
			...inputs
		].filter(Boolean).join("\n\n");
	}
	async bindSession(workspaceId, runUid, stage, artifactUid, sessionId, artifactUids, sourceUids) {
		const snapshot = await this.requireSnapshot(workspaceId);
		const artifact = this.requireArtifact(snapshot, artifactUid);
		if (runUid === void 0 && snapshot.runs.some((item) => item.artifactUid === artifactUid && item.status !== "completed")) throw new Error("artifact already has an active stage run; resume that run instead");
		const existing = runUid === void 0 ? void 0 : snapshot.runs.find((item) => item.uid === runUid);
		if (runUid !== void 0 && existing === void 0) throw new Error(`stage run not found: ${runUid}`);
		if (existing !== void 0 && existing.artifactUid !== artifactUid) throw new Error("stage run is bound to another artifact");
		if (existing?.status === "completed") throw new Error("completed stage run cannot be resumed");
		const codeReferences = stage === "development" || snapshot.project.development.repositories.length === 0 ? [] : await this.git.prepareCodeReferences(snapshot.workspace.path, snapshot.project, existing?.codeReferences ?? []);
		const prompt = await this.context(workspaceId, stage, artifactUid, artifactUids, sourceUids, codeReferences);
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
			sourceUids: [...sourceUids],
			...codeReferences.length === 0 ? {} : { codeReferences },
			...artifact.revision?.previousRunUid === void 0 ? {} : { previousRunUid: artifact.revision.previousRunUid }
		} : {
			...existing,
			sessionId,
			status: "active",
			updatedAt: now,
			inputArtifactUids: [...artifactUids],
			sourceUids: [...sourceUids],
			...codeReferences.length === 0 ? { codeReferences: void 0 } : { codeReferences }
		};
		if (this.sessionController === void 0) throw new Error("stage session runtime is unavailable");
		const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
		this.bindRuntime(sessionId, stage, snapshot.workspace.path, snapshot.project, artifact, snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifactUid), workItem, workItem === void 0 ? void 0 : snapshot.openSpecValidation[workItem.uid], codeReferences);
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
	bindRuntime(sessionId, stage, workspacePath, project, artifact, development, workItem, openSpecValidation, codeReferences = []) {
		const templatePath = artifact.template === void 0 ? join(".sdd", "templates", artifact.stage, "deliverable.md") : join(artifact.relativeDirectory, artifact.template.snapshotPath);
		const templateConfigPath = artifact.template === void 0 ? join(".sdd", "templates", artifact.stage, "template.yaml") : join(artifact.relativeDirectory, artifact.template.configSnapshotPath);
		const openSpecRepository = workItem?.openSpec?.enabled === true ? development?.repositories.find((item) => item.id === workItem.openSpec?.repositoryId) : void 0;
		const openSpecTarget = openSpecRepository === void 0 || workItem?.openSpec?.path === void 0 ? void 0 : resolve(openSpecRepository.path, workItem.openSpec.path);
		const openSpecRuntime = openSpecTarget === void 0 || openSpecValidation?.status !== "valid" ? "" : `OpenSpec 已启用并通过检查。OpenSpec 项目根目录：${dirname(openSpecTarget)}。当前 Schema：${openSpecValidation.schema ?? "spec-driven"}。当前需求 Change：${openSpecValidation.changeExists === true ? openSpecValidation.changeId : "尚未创建，不能假设已有 proposal/specs/design/tasks"}。官方生成的共享 skills 位于 ${join(dirname(openSpecTarget), ".agents", "skills")}；由于代码仓是当前 SDD 工作空间内的隔离 Worktree，执行 OpenSpec 工作流前必须先读取匹配的 openspec-*/SKILL.md 并遵循，在 OpenSpec 项目根目录运行 openspec 命令。`;
		const repositoryContext = stage !== "development" || development === void 0 ? "" : `开发仓库上下文加载协议：\n${development.repositories.map((repository) => `- ${repository.id} 根目录：${repository.path}\n  具体开发目标：${workItem?.developmentTargetDetails?.[repository.id] ?? "未填写"}\n  首次修改前先在该根目录查找并读取 AGENTS.md、README、构建入口、CI 配置及 .agents/skills 下与当前工作匹配的 SKILL.md；读取仓库内文件后遵循更深层 AGENTS.md。`).join("\n")}\n会话 cwd 保持为外层 SDD 项目以维护交付件；代码操作必须使用上面绑定的仓库根目录。Skill 即使未自动出现在会话技能列表，也必须按明确路径读取后遵循。多仓库不得混用 workdir。`;
		const readOnlyRepositoryContext = stage === "development" || codeReferences.length === 0 ? "" : `项目关联代码仓库自动只读参考：\n${codeReferences.map((reference) => reference.available && reference.path !== void 0 && reference.baseCommit !== void 0 ? `- ${reference.repositoryId}: ${reference.path}\n  ${reference.baseBranch} @ ${reference.baseCommit.slice(0, 12)}；按需读取，禁止修改` : `- ${reference.repositoryId}: 暂不可用（${reference.error ?? "准备失败"}）`).join("\n")}`;
		this.sessionController?.bind({
			sessionId,
			stage,
			artifactUid: artifact.uid,
			projectPath: workspacePath,
			artifactDirectory: resolve(workspacePath, artifact.relativeDirectory),
			developmentDirectories: development?.repositories.map((item) => item.path) ?? [],
			developmentRepositories: development?.repositories.map((item) => ({
				id: item.id,
				path: item.path
			})) ?? [],
			codeReferences,
			artifactTemplateReference: fileMention(templatePath),
			artifactTemplateConfigReference: fileMention(templateConfigPath),
			requiredSections: artifact.template?.requiredSections ?? runtimeDefinition(stage).requiredSections.slice(),
			systemPrompt: [
				`绑定项目：${project.project.key} · ${project.project.name}`,
				`绑定交付件：${artifact.key} (${artifact.uid})`,
				`交付件入口：${resolve(workspacePath, artifact.relativeDirectory, artifact.entry)}`,
				workItem === void 0 ? "" : `仓库范围：${(workItem.repositoryScope ?? []).join("、") || "未配置"}\n开发目标：${(workItem.developmentTargets ?? []).map((id) => `${id}${workItem.developmentTargetDetails?.[id] ? `（${workItem.developmentTargetDetails[id]}）` : ""}`).join("、") || "未配置"}\nOpenSpec：${openSpecDescription(workItem, openSpecValidation)}`,
				openSpecRuntime,
				development === void 0 ? "" : `隔离代码目录：\n${development.repositories.map((item) => `- ${item.id}: ${item.path}`).join("\n")}`,
				repositoryContext,
				readOnlyRepositoryContext
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
			workItems: {
				total: 0,
				requirements: 0,
				standaloneDefects: 0,
				custom: 0,
				pendingChanges: 0,
				completed: 0
			},
			requirements: {
				packages: 0,
				total: 0,
				traced: 0,
				completed: 0
			},
			defects: {
				total: 0,
				standalone: 0,
				attached: 0,
				open: 0,
				resolved: 0,
				deliveryPending: 0,
				deliveryCovered: 0
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
			stageFlow: [],
			deliveryMatrix: [],
			burnup: [],
			traceability: 100,
			blockers: [],
			recentEvents: []
		};
	}
	dashboard(artifacts, sources, workItems, quality, workspaces, recentEvents) {
		const deliveryWorkItems = workItems.filter((item) => item.executionMode !== "attached" && item.status !== "completed");
		const deliveryWorkItemUids = new Set(deliveryWorkItems.map((item) => item.uid));
		const workItemByUid = new Map(workItems.map((item) => [item.uid, item]));
		const sourceByUid = new Map(sources.map((item) => [item.uid, item]));
		const artifactByUid = new Map(artifacts.map((item) => [item.uid, item]));
		const artifactsByStage = new Map(STAGES.map((stage) => [stage.id, []]));
		const artifactsByWorkItemStage = /* @__PURE__ */ new Map();
		for (const artifact of artifacts) {
			artifactsByStage.get(artifact.stage).push(artifact);
			if (artifact.workItemUid === void 0) continue;
			const key = `${artifact.workItemUid}:${artifact.stage}`;
			const group = artifactsByWorkItemStage.get(key) ?? [];
			group.push(artifact);
			artifactsByWorkItemStage.set(key, group);
		}
		const attachedByParent = /* @__PURE__ */ new Map();
		for (const workItem of workItems) {
			if (workItem.executionMode !== "attached" || workItem.parentWorkItemUid === void 0 || workItem.status === "completed") continue;
			const children = attachedByParent.get(workItem.parentWorkItemUid) ?? [];
			children.push(workItem);
			attachedByParent.set(workItem.parentWorkItemUid, children);
		}
		const latestAcceptedByWorkItemStage = /* @__PURE__ */ new Map();
		for (const [key, group] of artifactsByWorkItemStage) {
			const latest = group.filter((item) => item.status === "accepted").reduce((current, item) => current === void 0 || item.updatedAt > current.updatedAt ? item : current, void 0);
			if (latest !== void 0) latestAcceptedByWorkItemStage.set(key, latest);
		}
		const currentSourceUidsFor = (workItem, stage) => {
			const owned = stage === "specification" || stage === "development" ? [workItem, ...attachedByParent.get(workItem.uid) ?? []] : [workItem];
			return [...new Set(owned.flatMap((item) => [item.sourceUid, item.bundleSourceUid]).filter((uid) => uid !== void 0))];
		};
		const staleInputCache = /* @__PURE__ */ new Map();
		const staleInputs = (artifact) => {
			const cached = staleInputCache.get(artifact.uid);
			if (cached !== void 0) return cached;
			const labels = [];
			for (const reference of artifact.basedOn) {
				const previous = artifactByUid.get(reference.uid);
				if (previous === void 0) {
					labels.push(`缺失上游交付件 ${reference.uid}`);
					continue;
				}
				const current = artifact.workItemUid === void 0 ? (artifactsByStage.get(previous.stage) ?? []).filter((item) => item.workItemUid === void 0 && item.status === "accepted").reduce((latest, item) => latest === void 0 || item.updatedAt > latest.updatedAt ? item : latest, void 0) : latestAcceptedByWorkItemStage.get(`${artifact.workItemUid}:${previous.stage}`);
				if (current !== void 0 && (current.uid !== reference.uid || current.version !== reference.version || current.contentHash !== reference.contentHash)) labels.push(`${stageDefinition(previous.stage).label}已从 ${previous.version} 更新到 ${current.version}`);
			}
			if (artifact.workItemUid !== void 0) {
				const workItem = workItemByUid.get(artifact.workItemUid);
				if (workItem !== void 0) {
					const bound = new Set(artifact.derivedFrom.map((reference) => reference.uid));
					if (currentSourceUidsFor(workItem, artifact.stage).some((uid) => !bound.has(uid))) labels.push("原始需求或关联缺陷来源已更新");
				}
			}
			staleInputCache.set(artifact.uid, labels);
			return labels;
		};
		const developmentAcceptedByWorkItem = /* @__PURE__ */ new Map();
		for (const artifact of artifactsByStage.get("development") ?? []) {
			if (artifact.workItemUid === void 0 || artifact.status !== "accepted") continue;
			const accepted = developmentAcceptedByWorkItem.get(artifact.workItemUid) ?? [];
			accepted.push(artifact);
			developmentAcceptedByWorkItem.set(artifact.workItemUid, accepted);
		}
		const attachedDefectCovered = (defect) => defect.parentWorkItemUid !== void 0 && defect.sourceUid !== void 0 && (developmentAcceptedByWorkItem.get(defect.parentWorkItemUid) ?? []).some((artifact) => Date.parse(artifact.updatedAt) >= Date.parse(defect.updatedAt) && artifact.derivedFrom.some((reference) => reference.uid === defect.sourceUid));
		const deliveryMatrix = deliveryWorkItems.map((workItem) => {
			const children = attachedByParent.get(workItem.uid) ?? [];
			const covered = children.filter(attachedDefectCovered).length;
			const cells = STAGES.map((stage) => {
				const stageArtifacts = artifactsByWorkItemStage.get(`${workItem.uid}:${stage.id}`) ?? [];
				const artifact = stageArtifacts.find((item) => item.status === "draft" || item.status === "in-review") ?? stageArtifacts.filter((item) => item.status === "accepted").reduce((latest, item) => latest === void 0 || item.updatedAt > latest.updatedAt ? item : latest, void 0);
				let status = "not-started";
				if (artifact === void 0 && workItem.stageApplicability?.[stage.id]?.status === "not-applicable") status = "not-applicable";
				else if (workItem.change?.reviewRequiredStages.includes(stage.id) === true || artifact !== void 0 && staleInputs(artifact).length > 0) status = "blocked";
				else if (artifact?.status === "accepted") status = "completed";
				else if (artifact !== void 0 && quality[artifact.uid]?.ready === true) status = "ready-for-review";
				else if (artifact !== void 0) status = "in-progress";
				if (artifact !== void 0 && stage.id === "development" && ((workItem.developmentTargets ?? []).length === 0 || workItem.developmentTargets?.some((id) => (workItem.developmentTargetDetails?.[id] ?? "").trim() === ""))) status = "blocked";
				return {
					stage: stage.id,
					status,
					...artifact === void 0 ? {} : {
						artifactUid: artifact.uid,
						artifactKey: artifact.key,
						version: artifact.version
					}
				};
			});
			return {
				workItemUid: workItem.uid,
				key: workItem.key,
				title: workItem.title,
				kind: workItem.kind,
				workItemStatus: workItem.status,
				attachedDefects: {
					total: children.length,
					covered,
					pending: children.length - covered
				},
				cells
			};
		});
		const stageFlow = STAGES.map((stage) => {
			const cells = deliveryMatrix.map((row) => row.cells.find((cell) => cell.stage === stage.id));
			return {
				stage: stage.id,
				notStarted: cells.filter((cell) => cell.status === "not-started").length,
				inProgress: cells.filter((cell) => cell.status === "in-progress").length,
				readyForReview: cells.filter((cell) => cell.status === "ready-for-review").length,
				completed: cells.filter((cell) => cell.status === "completed").length,
				blocked: cells.filter((cell) => cell.status === "blocked").length,
				notApplicable: cells.filter((cell) => cell.status === "not-applicable").length
			};
		});
		const stages = STAGES.map((definition) => {
			const items = artifactsByStage.get(definition.id) ?? [];
			const flow = stageFlow.find((item) => item.stage === definition.id);
			const total = deliveryWorkItems.length;
			const completedCount = flow.completed + flow.notApplicable;
			const failedChecks = items.map((item) => quality[item.uid]).filter((item) => item !== void 0).reduce((sum, report) => sum + report.checks.filter((item) => item.status === "failed").length, 0);
			const completion = total === 0 ? 0 : Math.round(completedCount / total * 100);
			const status = total > 0 && flow.notApplicable === total ? "not-applicable" : total > 0 && completedCount === total ? "completed" : flow.blocked > 0 ? "blocked" : flow.readyForReview > 0 ? "ready-for-review" : flow.inProgress > 0 ? "in-progress" : "not-started";
			return {
				stage: definition.id,
				status,
				completion,
				drafts: items.filter((item) => item.status === "draft" || item.status === "in-review").length,
				accepted: items.filter((item) => item.status === "accepted").length,
				failedChecks
			};
		});
		const currentSourceUids = new Set(workItems.filter((item) => item.status !== "completed").map((item) => item.sourceUid).filter((uid) => uid !== void 0));
		const currentSources = workItems.length === 0 ? sources : sources.filter((item) => currentSourceUids.has(item.uid));
		const requirementWorkItems = deliveryWorkItems.filter((item) => item.kind === "requirement" && item.status !== "completed");
		const standaloneDefects = deliveryWorkItems.filter((item) => item.kind === "defect" && item.status !== "completed");
		const attachedDefects = workItems.filter((item) => item.kind === "defect" && item.executionMode === "attached" && item.status !== "completed");
		const activeDefects = [...standaloneDefects, ...attachedDefects];
		const requirementSources = requirementWorkItems.map((item) => item.sourceUid === void 0 ? void 0 : sourceByUid.get(item.sourceUid)).filter((item) => item !== void 0);
		const defectSources = activeDefects.map((item) => item.sourceUid === void 0 ? void 0 : sourceByUid.get(item.sourceUid)).filter((item) => item !== void 0);
		const tracedSources = new Set(artifacts.flatMap((item) => item.derivedFrom.map((reference) => reference.uid)));
		const tests = workspaces.flatMap((item) => item.repositories.flatMap((repository) => repository.tests ?? [])).filter((item) => !item.stale);
		const typeLabel = (workItem) => workItem.kind === "defect" ? "独立缺陷" : workItem.kind === "requirement" ? "需求" : workItem.kind;
		const blockers = [
			...deliveryWorkItems.filter((item) => item.change !== void 0).map((item) => `${item.key}（${typeLabel(item)}）：${item.status === "removed-pending" ? "外部事项已移除，等待确认" : `来源或关联缺陷有变化，需重审 ${item.change.reviewRequiredStages.map((stage) => stageDefinition(stage).label).join("、")}`}`),
			...deliveryWorkItems.filter((item) => (artifactsByWorkItemStage.get(`${item.uid}:development`) ?? []).length > 0 && (item.developmentTargets ?? []).length === 0).map((item) => `${item.key}：开发测试尚未配置目标代码仓库`),
			...artifacts.filter((item) => item.status === "accepted").flatMap((item) => staleInputs(item).map((label) => `${item.key} v${item.version}：${label}，需要创建变更修订`)),
			...Object.values(quality).flatMap((report) => report.checks.filter((item) => item.status === "failed").map((item) => `${stageDefinition(report.stage).label}：${item.label}`))
		].slice(0, 12);
		const resolvedStatuses = /* @__PURE__ */ new Set([
			"resolved",
			"done",
			"cancelled"
		]);
		const workload = /* @__PURE__ */ new Map();
		for (const source of currentSources) {
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
		const scope = /* @__PURE__ */ new Set();
		const delivered = /* @__PURE__ */ new Set();
		const burnupByDate = /* @__PURE__ */ new Map();
		const artifactWorkItem = new Map(artifacts.filter((item) => item.workItemUid !== void 0).map((item) => [item.uid, item.workItemUid]));
		const recordBurnup = (date) => burnupByDate.set(date, {
			total: scope.size,
			completed: [...delivered].filter((uid) => scope.has(uid)).length
		});
		for (const event of [...recentEvents].sort((left, right) => left.time.localeCompare(right.time))) {
			const workItemUid = typeof event.detail?.workItemUid === "string" ? event.detail.workItemUid : void 0;
			let changed = false;
			if (event.type === "work-item.created" && workItemUid !== void 0 && workItemByUid.get(workItemUid)?.executionMode !== "attached") {
				scope.add(workItemUid);
				changed = true;
			} else if (event.type === "work-item.archived" && workItemUid !== void 0) {
				scope.delete(workItemUid);
				delivered.delete(workItemUid);
				changed = true;
			} else if (event.type === "artifact.accepted" && event.stage === "development" && typeof event.detail?.artifactUid === "string") {
				const uid = artifactWorkItem.get(event.detail.artifactUid);
				if (uid !== void 0 && deliveryWorkItemUids.has(uid)) {
					delivered.add(uid);
					changed = true;
				}
			}
			if (changed) recordBurnup(event.time.slice(0, 10));
		}
		scope.clear();
		delivered.clear();
		for (const workItem of deliveryWorkItems.filter((item) => item.status !== "completed")) scope.add(workItem.uid);
		for (const artifact of artifacts.filter((item) => item.stage === "development" && item.status === "accepted" && item.workItemUid !== void 0)) delivered.add(artifact.workItemUid);
		recordBurnup((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
		let burnup = [...burnupByDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, value]) => ({
			date,
			...value
		}));
		if (burnup.length > 30) burnup = [burnup[0], ...burnup.slice(-29)];
		const applicableCells = deliveryMatrix.flatMap((row) => row.cells).filter((cell) => cell.status !== "not-applicable");
		const overallCompletion = applicableCells.length === 0 ? 0 : Math.round(applicableCells.filter((cell) => cell.status === "completed").length / applicableCells.length * 100);
		const completedWorkItems = deliveryMatrix.filter((row) => row.cells.some((cell) => cell.status === "completed") && row.cells.every((cell) => cell.status === "completed" || cell.status === "not-applicable")).length;
		const standaloneCovered = standaloneDefects.filter((defect) => (developmentAcceptedByWorkItem.get(defect.uid) ?? []).length > 0).length;
		const attachedCovered = attachedDefects.filter(attachedDefectCovered).length;
		return {
			overallCompletion,
			stages,
			workItems: {
				total: deliveryWorkItems.filter((item) => item.status !== "completed").length,
				requirements: requirementWorkItems.length,
				standaloneDefects: standaloneDefects.length,
				custom: deliveryWorkItems.filter((item) => item.status !== "completed" && item.kind !== "requirement" && item.kind !== "defect").length,
				pendingChanges: deliveryWorkItems.filter((item) => item.change !== void 0).length,
				completed: completedWorkItems
			},
			requirements: {
				packages: new Set(requirementWorkItems.map((item) => `${item.provider}:${item.bundleKey}`)).size,
				total: requirementWorkItems.length,
				traced: requirementSources.filter((item) => tracedSources.has(item.uid)).length,
				completed: requirementSources.filter((item) => item.tracking?.normalizedStatus === "done").length
			},
			defects: {
				total: activeDefects.length,
				standalone: standaloneDefects.length,
				attached: attachedDefects.length,
				open: defectSources.filter((item) => !resolvedStatuses.has(item.tracking?.normalizedStatus ?? "")).length,
				resolved: defectSources.filter((item) => resolvedStatuses.has(item.tracking?.normalizedStatus ?? "")).length,
				deliveryPending: activeDefects.length - standaloneCovered - attachedCovered,
				deliveryCovered: standaloneCovered + attachedCovered
			},
			artifacts: {
				total: artifacts.length,
				drafts: artifacts.filter((item) => item.status === "draft" || item.status === "in-review").length,
				accepted: artifacts.filter((item) => item.status === "accepted").length
			},
			development: {
				workspaces: workspaces.length,
				changedFiles: workspaces.flatMap((item) => item.repositories).reduce((sum, item) => sum + item.changedFiles, 0),
				passingTests: tests.filter((item) => item.passed && !item.skipped).length,
				failingTests: tests.filter((item) => !item.passed).length,
				commits: workspaces.flatMap((item) => item.repositories).filter((item) => item.headCommit !== item.baseCommit).length
			},
			workload: [...workload.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({
				unit,
				...value
			})),
			stageFlow,
			deliveryMatrix,
			burnup,
			traceability: currentSources.length === 0 ? 100 : Math.round(currentSources.filter((item) => tracedSources.has(item.uid)).length / currentSources.length * 100),
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
				if ("artifactFile" in result) return writeJson(res, 200, {
					ok: true,
					artifactFile: result.artifactFile
				});
				if ("identity" in result && "source" in result && "relations" in result) return writeJson(res, 200, {
					ok: true,
					sourceImportDetail: result
				});
				if ("contentPath" in result) return writeJson(res, 200, {
					ok: true,
					template: result
				});
				if ("sourceKind" in result && "branches" in result) return writeJson(res, 200, {
					ok: true,
					repositoryInspection: result
				});
				if ("revisionPreview" in result) return writeJson(res, 200, {
					ok: true,
					revisionPreview: result.revisionPreview
				});
				if ("openSpecTemplates" in result) return writeJson(res, 200, {
					ok: true,
					openSpecTemplates: result.openSpecTemplates
				});
				if ("opened" in result) return writeJson(res, 200, {
					ok: true,
					opened: true
				});
				if ("schema" in result && result.schema === "dsh-sdd/import-preview@1") return writeJson(res, 200, {
					ok: true,
					preview: result
				});
				if ("workspace" in result) return writeJson(res, 200, {
					ok: true,
					snapshot: result
				});
				throw new Error("unexpected SDD response");
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
function inside(root, candidate) {
	const path = relative(root, candidate);
	return path === "" || !path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path);
}
function commandArguments(config, connector, request) {
	const workspaceRoot = resolve(request.workspace.path);
	const adapterRoot = resolve(connector.adapterRoot);
	return config.command.map((argument, index) => {
		const normalized = argument.replaceAll("\\", "/");
		const logicalPrefix = ".sdd/business/adapters/";
		const logicalPath = normalized.startsWith("./") ? normalized.slice(2) : normalized;
		if (logicalPath.startsWith(logicalPrefix)) {
			const candidate = resolve(adapterRoot, logicalPath.slice(23));
			if (!inside(adapterRoot, candidate)) throw new Error(`connector adapter path escapes its adapter directory: ${argument}`);
			return candidate;
		}
		if (!isAbsolute(argument) && !argument.startsWith(".") && !argument.includes("/") && !argument.includes("\\")) return argument;
		const candidate = resolve(workspaceRoot, argument);
		if (inside(workspaceRoot, candidate) && !inside(adapterRoot, candidate)) throw new Error(`connector project file must be under its business/adapters directory: ${argument}`);
		if (isAbsolute(argument) && index > 0 && inside(adapterRoot, argument)) return argument;
		return argument;
	});
}
async function execute(config, connector, request) {
	const [file, ...args] = commandArguments(config, connector, request);
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
/** Built-in adapter for plugin-installed and project-owned CLI scripts. It never invokes a shell. */
var CommandSourceProvider = class {
	connectors;
	name = "command";
	kinds = ["*"];
	constructor(connectors = new ConnectorCatalog(resolve(process.cwd(), "business"))) {
		this.connectors = connectors;
	}
	async get(request) {
		const connectorId = request.connector;
		if (connectorId === void 0 || !CONNECTOR_ID.test(connectorId)) throw new Error("command source provider needs a kebab-case connector id");
		const connector = await this.connectors.resolve(request.workspace.path, connectorId);
		const source = validateSourceBundle(await execute(parseConfig(parse(await readFile(connector.configPath, "utf8")), connectorId), connector, request));
		if (source.provider !== connectorId && source.provider !== this.name) throw new Error(`source.provider must be "${connectorId}" or "command"`);
		if (source.kind !== request.kind) throw new Error(`source.kind must equal requested kind "${request.kind}"`);
		return {
			...source,
			provider: connectorId,
			...source.root === void 0 ? {} : { root: {
				...source.root,
				provider: connectorId
			} },
			items: source.items.map((item) => ({
				...item,
				provider: connectorId
			}))
		};
	}
};
//#endregion
//#region src/providers/manual-source.ts
function input(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("手工录入需要标题和初始描述");
	const result = value;
	if (typeof result.title !== "string" || result.title.trim() === "") throw new Error("手工录入标题不能为空");
	if (result.description !== void 0 && typeof result.description !== "string") throw new Error("手工录入描述必须是文本");
	if (result.items !== void 0 && (!Array.isArray(result.items) || result.items.some((item) => typeof item !== "object" || item === null || typeof item.title !== "string" || item.title.trim() === ""))) throw new Error("手工子项必须包含标题");
	return {
		title: result.title.trim(),
		description: result.description?.trim(),
		items: result.items?.map((item) => ({
			key: item.key?.trim(),
			title: item.title.trim(),
			description: item.description?.trim()
		}))
	};
}
function envelope(kind, key, title, description, fetchedAt) {
	return {
		schema: "dsh-sdd/source@1",
		uid: randomUUID(),
		provider: "manual",
		kind,
		externalKey: key,
		title,
		fetchedAt,
		content: {
			format: "manual-intake@1",
			description: description ?? "",
			note: "由项目用户手工录入，后续确认结论由需求讨论阶段写入正式交付件。"
		}
	};
}
/** Built-in zero-configuration intake. It normalizes user-entered facts into the regular bundle contract. */
var ManualSourceProvider = class {
	name = "manual";
	kinds = ["*"];
	async get(request) {
		const manual = input(request.input);
		const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
		const bundleKey = request.key.trim();
		if (bundleKey === "") throw new Error("手工录入编号不能为空");
		const childInputs = manual.items?.filter((item) => item.title.trim() !== "") ?? [];
		if (childInputs.length === 0) {
			const item = envelope(request.kind, bundleKey, manual.title, manual.description, fetchedAt);
			return {
				schema: "dsh-sdd/source-bundle@1",
				uid: randomUUID(),
				provider: this.name,
				kind: request.kind,
				externalKey: bundleKey,
				title: manual.title,
				fetchedAt,
				items: [item],
				relations: []
			};
		}
		const root = envelope(request.kind, bundleKey, manual.title, manual.description, fetchedAt);
		const items = childInputs.map((item, index) => envelope(request.kind, item.key || `${bundleKey}-${String(index + 1).padStart(2, "0")}`, item.title, item.description, fetchedAt));
		return {
			schema: "dsh-sdd/source-bundle@1",
			uid: randomUUID(),
			provider: this.name,
			kind: request.kind,
			externalKey: bundleKey,
			title: manual.title,
			fetchedAt,
			root,
			items,
			relations: items.map((item) => ({
				from: item.externalKey,
				to: bundleKey,
				type: "child-of"
			}))
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
/** DSH reserves {{name}} for prompt variables; project-authored text is always literal. */
function promptLiteral(value) {
	return value.replaceAll("{{", "{​{").replaceAll("}}", "}​}");
}
var StageSessionController = class {
	ctx;
	recordAiTest;
	active = /* @__PURE__ */ new Map();
	desired = /* @__PURE__ */ new Map();
	constructor(ctx, recordAiTest) {
		this.ctx = ctx;
		this.recordAiTest = recordAiTest;
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
		const templateSnapshotRoot = resolve(spec.artifactDirectory, ".template");
		const developmentRoots = spec.developmentDirectories.map((path) => resolve(path));
		const disposers = [];
		try {
			disposers.push(agent.ctx.systemPrompt.section({
				name: "sdd:stage-runtime",
				order: 20,
				text: `${definition.systemPrompt}\n\n交付件输出必须遵循创建草稿时固定绑定的 Markdown 模板快照：\n${promptLiteral(spec.artifactTemplateReference)}\n${spec.artifactTemplateConfigReference === void 0 ? "" : `模板配置：\n${promptLiteral(spec.artifactTemplateConfigReference)}\n`}首次回答和恢复会话后必须先使用 read 工具读取该模板、绑定交付件及输入索引中列出的必要文件；文件引用本身不代表已经读取。不得删除、改名或打乱以下必填二级章节：${spec.requiredSections.map(promptLiteral).join("、")}。可以增加三级章节和附件引用。交付件是整个绑定目录，可在其中维护图表、原型、样例和附件，并从主文档使用相对路径引用。写入前删除已完成章节中的“待补充。”占位符；没有内容的待决或遗留问题要明确写“无”。不得仅凭路径、文件名、清单或哈希推断文件内容。${spec.codeReferences?.some((item) => item.available) === true ? "\n非开发阶段提供的项目代码仓库全部是辅助只读输入；只在当前问题需要时按需读取，禁止通过任何工具修改、提交、切换或清理这些仓库。" : ""}\n\n${promptLiteral(spec.systemPrompt)}`
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
					if (contained(templateSnapshotRoot, resolved)) return "交付件模板快照不可修改；请编辑正文或项目级 .sdd/templates";
					if (!allowedWriteRoots.some((root) => contained(root, resolved))) return "当前阶段只能修改绑定交付件或绑定的隔离代码空间";
				}
				if (execution.name === "str_replace_editor") {
					if (stringArgument(execution.arguments, "command") !== "view") {
						const filePath = stringArgument(execution.arguments, "path");
						if (filePath === void 0) return "str_replace_editor 缺少可校验的 path";
						const resolved = resolve(spec.projectPath, filePath);
						if (contained(templateSnapshotRoot, resolved)) return "交付件模板快照不可修改；请编辑正文或项目级 .sdd/templates";
						if (!allowedWriteRoots.some((root) => contained(root, resolved))) return "当前阶段只能修改绑定交付件或绑定的隔离代码空间";
					}
				}
			}));
			disposers.push(agent.ctx.on("tools/post-execute", async (execution, result, next) => {
				const decision = await next();
				if (this.recordAiTest === void 0 || spec.stage !== "development" || spec.artifactUid === void 0 || execution.name !== "bash" && execution.name !== "pwsh" || result.isError) return decision;
				const description = stringArgument(execution.arguments, "description");
				const command = stringArgument(execution.arguments, "command");
				const workdir = stringArgument(execution.arguments, "workdir");
				if (description === void 0 || !/^SDD测试[:：]/.test(description) || command === void 0 || workdir === void 0) return decision;
				const resolvedWorkdir = resolve(spec.projectPath, workdir);
				const repository = spec.developmentRepositories?.find((item) => contained(resolve(item.path), resolvedWorkdir));
				if (repository === void 0 || typeof result.value !== "object" || result.value === null || Array.isArray(result.value)) return decision;
				const value = result.value;
				if (value.kind === "background" || typeof value.exitCode !== "number" && value.exitCode !== null) return decision;
				const streamText = (stream) => typeof stream === "object" && stream !== null && typeof stream.text === "string" ? String(stream.text) : "";
				const exitCode = value.exitCode;
				try {
					await this.recordAiTest({
						projectPath: spec.projectPath,
						artifactUid: spec.artifactUid,
						repositoryId: repository.id,
						command,
						description: description.replace(/^SDD测试[:：]\s*/, ""),
						exitCode,
						output: `${streamText(value.stdout)}${streamText(value.stderr)}`,
						sessionId: spec.sessionId,
						passed: exitCode === 0 && value.timedOut !== true && value.aborted !== true
					});
				} catch {}
				return decision;
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
const connectorCatalog = new ConnectorCatalog(fileURLToPath(new URL("../business/", import.meta.url)));
function apply(ctx) {
	ctx.plugin(SddSourceRegistry);
	ctx.plugin(installBuiltins);
	ctx.plugin(installHostApi);
}
installBuiltins.inject = ["dshSddSources"];
function installBuiltins(ctx) {
	ctx.dshSddSources.register(new ManualSourceProvider());
	ctx.dshSddSources.register(new CommandSourceProvider(connectorCatalog));
}
installHostApi.inject = [
	"apiProxy",
	"webServer",
	"agents",
	"systemPrompt",
	"tools",
	"dshSddSources"
];
function installHostApi(ctx) {
	const git = new GitDevelopmentService();
	const sessions = new StageSessionController(ctx, async (evidence) => {
		await git.recordAiTest(evidence.projectPath, evidence.artifactUid, evidence.repositoryId, evidence);
	});
	const service = new SddProjectService(ctx.apiProxy, ctx.dshSddSources, sessions, git, new ProjectGitService(), connectorCatalog);
	ctx.effect(() => ctx.webServer.register(makeSddRoute(service)), "dsh-sdd: host api");
}
//#endregion
export { STAGES, STAGE_ARTIFACT_TEMPLATES, SddSourceRegistry, apply, artifactTemplate, isStageId, name, parseAction, stageDefinition, validateSourceBundle, validateSourceEnvelope };
