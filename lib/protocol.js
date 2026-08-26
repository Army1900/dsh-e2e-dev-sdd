//#region src/protocol.ts
/** Shared, browser-safe protocol and domain definitions. */
const STAGES = [
	{
		id: "requirements",
		label: "需求讨论",
		role: "产品与业务分析",
		outputType: "requirement-spec",
		prefix: "REQ"
	},
	{
		id: "prototype",
		label: "原型输出",
		role: "产品设计与 UX",
		outputType: "prototype-spec",
		prefix: "UX"
	},
	{
		id: "architecture",
		label: "系统设计",
		role: "架构师与技术负责人",
		outputType: "architecture-spec",
		prefix: "ARCH"
	},
	{
		id: "specification",
		label: "规格设计",
		role: "技术负责人、开发与测试",
		outputType: "implementation-spec",
		prefix: "SPEC"
	},
	{
		id: "development",
		label: "开发测试",
		role: "开发、测试与 Reviewer",
		outputType: "development-delivery",
		prefix: "DEV"
	}
];
function isStageId(value) {
	return STAGES.some((stage) => stage.id === value);
}
function stageDefinition(id) {
	return STAGES.find((stage) => stage.id === id);
}
function parseAction(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const action = value;
	if (typeof action.kind !== "string" || typeof action.workspaceId !== "string") return void 0;
	if (action.kind === "snapshot" || action.kind === "initialize" || action.kind === "reinitialize") return action;
	if ((action.kind === "accept" || action.kind === "quality") && typeof action.artifactUid === "string") return action;
	if (action.kind === "context" && isStageId(action.stage) && typeof action.artifactUid === "string" && stringArray(action.artifactUids) && (action.sourceUids === void 0 || stringArray(action.sourceUids))) return action;
	if (action.kind === "bind-session" && isStageId(action.stage) && typeof action.artifactUid === "string" && typeof action.sessionId === "string" && stringArray(action.artifactUids) && (action.runUid === void 0 || typeof action.runUid === "string") && (action.sourceUids === void 0 || stringArray(action.sourceUids))) return action;
	if ((action.kind === "sync-run" || action.kind === "complete-run") && typeof action.runUid === "string") return action;
	if ((action.kind === "development-create" || action.kind === "development-status") && typeof action.artifactUid === "string" && (action.kind === "development-status" || typeof action.repositoryId === "string")) return action;
	if (action.kind === "development-test" && typeof action.artifactUid === "string" && typeof action.repositoryId === "string" && typeof action.testId === "string") return action;
	if (action.kind === "development-commit" && typeof action.artifactUid === "string" && typeof action.repositoryId === "string" && typeof action.message === "string" && action.message.trim() !== "") return action;
	if ((action.kind === "import-source" || action.kind === "preview-source-import") && typeof action.provider === "string" && typeof action.sourceKind === "string" && typeof action.key === "string" && (action.connector === void 0 || typeof action.connector === "string")) return action;
	if (action.kind === "apply-source-import" && typeof action.previewUid === "string" && stringArray(action.identities)) return action;
	if (action.kind === "resolve-work-item-removal" && typeof action.workItemUid === "string" && (action.decision === "keep" || action.decision === "archive")) return action;
	if (action.kind === "create-draft" && isStageId(action.stage) && typeof action.title === "string" && (action.key === void 0 || typeof action.key === "string") && stringArray(action.basedOn) && (action.sourceUids === void 0 || stringArray(action.sourceUids)) && (action.workItemUid === void 0 || typeof action.workItemUid === "string")) return action;
}
function stringArray(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//#endregion
export { STAGES, isStageId, parseAction, stageDefinition };
