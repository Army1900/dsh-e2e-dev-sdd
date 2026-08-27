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
/** Canonical templates shared by draft creation, the browser workbench, and AI prompts. */
const STAGE_ARTIFACT_TEMPLATES = {
	requirements: {
		documentName: "需求规格说明",
		maintenanceGuide: "记录已经确认的业务事实和可验证需求；未确认内容统一放入“待决问题”。",
		sections: [
			{
				title: "背景与目标",
				guidance: "说明业务背景、问题、目标价值和可量化成功指标，不在这里预设技术实现。",
				suggestedSubsections: [
					"业务背景",
					"目标与价值",
					"成功指标",
					"术语说明"
				]
			},
			{
				title: "范围",
				guidance: "明确本次交付的范围内、范围外内容，以及已知约束和假设。",
				suggestedSubsections: [
					"范围内",
					"范围外",
					"约束与假设"
				]
			},
			{
				title: "用户与场景",
				guidance: "列出用户角色、触发条件、核心场景和端到端业务流程。",
				suggestedSubsections: [
					"用户角色",
					"核心场景",
					"业务流程"
				]
			},
			{
				title: "功能需求",
				guidance: "按可追踪编号描述业务规则、前置条件、主流程、分支和异常流程。",
				suggestedSubsections: [
					"功能清单",
					"业务规则",
					"流程与边界"
				]
			},
			{
				title: "非功能需求",
				guidance: "给出可验证的性能、安全、权限、审计、兼容性、可用性等约束。",
				suggestedSubsections: [
					"性能与容量",
					"安全与权限",
					"可用性与兼容性"
				]
			},
			{
				title: "验收条件",
				guidance: "为功能需求提供可测试的验收条件，推荐使用 Given/When/Then 并关联需求编号。",
				suggestedSubsections: [
					"验收场景",
					"验收数据",
					"追踪关系"
				]
			},
			{
				title: "待决问题",
				guidance: "记录未确认事项、影响、责任人和计划确认时间；没有时明确写“无”。",
				suggestedSubsections: ["问题清单"]
			}
		]
	},
	prototype: {
		documentName: "原型与交互规格",
		maintenanceGuide: "以已接受需求为边界，描述可评审的流程、页面、组件状态和原型资源。",
		sections: [
			{
				title: "设计目标",
				guidance: "说明设计服务的用户任务、体验目标、原则和成功标准。",
				suggestedSubsections: [
					"用户任务",
					"体验目标",
					"设计原则"
				]
			},
			{
				title: "用户流程",
				guidance: "描述入口、关键步骤、分支、出口以及跨页面流转关系。",
				suggestedSubsections: [
					"主流程",
					"分支流程",
					"流程图"
				]
			},
			{
				title: "页面清单",
				guidance: "逐页说明页面目的、入口、核心区域、操作和出口。",
				suggestedSubsections: [
					"信息架构",
					"页面明细",
					"组件清单"
				]
			},
			{
				title: "交互规则",
				guidance: "定义触发方式、反馈、校验、导航、撤销和防重复操作规则。",
				suggestedSubsections: [
					"操作与反馈",
					"表单与校验",
					"导航规则"
				]
			},
			{
				title: "状态与异常",
				guidance: "覆盖加载、空态、错误、无权限、离线、超时和并发冲突等状态。",
				suggestedSubsections: [
					"页面状态",
					"异常状态",
					"权限状态"
				]
			},
			{
				title: "原型资源",
				guidance: "记录原型、流程图、设计稿、组件规范的仓库内路径或稳定链接及版本。",
				suggestedSubsections: ["资源索引", "版本说明"]
			},
			{
				title: "待决问题",
				guidance: "记录影响原型确认的未决事项及其责任人、影响和计划确认时间。",
				suggestedSubsections: ["问题清单"]
			}
		]
	},
	architecture: {
		documentName: "系统设计说明",
		maintenanceGuide: "把需求和约束转化为系统边界、仓库范围、模块、数据、接口及可追踪架构决策。",
		sections: [
			{
				title: "设计目标",
				guidance: "说明本次设计要解决的问题、质量属性、设计原则和不做事项。",
				suggestedSubsections: [
					"目标",
					"质量属性",
					"非目标"
				]
			},
			{
				title: "上下文与约束",
				guidance: "描述系统上下文、现状、依赖、技术与组织约束，以及关键假设。",
				suggestedSubsections: [
					"系统上下文",
					"现状与依赖",
					"约束与假设"
				]
			},
			{
				title: "总体架构",
				guidance: "给出整体方案、组件关系、关键调用链和必要的架构图。",
				suggestedSubsections: [
					"方案概览",
					"组件关系",
					"关键调用链"
				]
			},
			{
				title: "模块职责",
				guidance: "明确涉及的代码仓库、模块边界、职责、所有者和变更范围。",
				suggestedSubsections: [
					"代码仓库范围",
					"模块边界",
					"职责与所有者"
				]
			},
			{
				title: "数据设计",
				guidance: "定义核心数据模型、存储、生命周期、一致性、迁移和容量考虑。",
				suggestedSubsections: [
					"数据模型",
					"存储与一致性",
					"迁移与生命周期"
				]
			},
			{
				title: "接口与集成",
				guidance: "定义内部及外部接口、协议、鉴权、幂等、超时、重试和兼容策略。",
				suggestedSubsections: [
					"接口清单",
					"集成契约",
					"失败处理"
				]
			},
			{
				title: "部署与安全",
				guidance: "说明部署拓扑、配置、可观测性、容量、安全、回滚和容灾方案。",
				suggestedSubsections: [
					"部署拓扑",
					"安全设计",
					"可观测性与容灾"
				]
			},
			{
				title: "架构决策",
				guidance: "逐项记录候选方案、权衡、最终决策、后果及适用范围。",
				suggestedSubsections: ["决策记录"]
			}
		]
	},
	specification: {
		documentName: "实现规格说明",
		maintenanceGuide: "把已接受设计细化为开发和测试可无歧义执行的仓库级实现规格。",
		sections: [
			{
				title: "实现目标",
				guidance: "说明本规格实现的能力、边界、成功标准和不包含的工作。",
				suggestedSubsections: [
					"目标",
					"实现边界",
					"成功标准"
				]
			},
			{
				title: "输入依据",
				guidance: "列出需求、原型、系统设计、代码仓库和版本基线，并确认开发目标仓库。",
				suggestedSubsections: [
					"上游交付件",
					"目标代码仓库",
					"版本基线"
				]
			},
			{
				title: "功能规格",
				guidance: "按规格编号给出组件或模块级行为、算法、流程、边界和兼容要求。",
				suggestedSubsections: [
					"变更清单",
					"详细行为",
					"兼容与迁移"
				]
			},
			{
				title: "接口契约",
				guidance: "明确 API、事件或内部接口的输入、输出、校验、错误码、鉴权和示例。",
				suggestedSubsections: [
					"接口清单",
					"请求与响应",
					"错误码与示例"
				]
			},
			{
				title: "状态与数据规则",
				guidance: "定义数据结构、状态机、不变量、事务、一致性及迁移规则。",
				suggestedSubsections: [
					"数据结构",
					"状态机",
					"事务与一致性"
				]
			},
			{
				title: "异常处理",
				guidance: "覆盖非法输入、依赖失败、超时、并发、重试、降级和恢复策略。",
				suggestedSubsections: [
					"异常矩阵",
					"重试与降级",
					"恢复策略"
				]
			},
			{
				title: "验收测试规格",
				guidance: "给出正常、边界、异常、回归和非功能测试及预期结果。",
				suggestedSubsections: [
					"测试场景",
					"测试数据",
					"预期结果"
				]
			},
			{
				title: "追踪关系",
				guidance: "建立需求、设计、规格、测试和目标代码位置之间的编号映射。",
				suggestedSubsections: ["追踪矩阵"]
			}
		]
	},
	development: {
		documentName: "开发测试交付记录",
		maintenanceGuide: "只记录绑定隔离代码空间中的真实实现、命令、测试证据和提交状态。",
		sections: [
			{
				title: "实现范围",
				guidance: "列出实际实现的规格编号、范围、明确未实现项及偏差原因。",
				suggestedSubsections: ["已实现规格", "未实现与偏差"]
			},
			{
				title: "代码仓库与分支",
				guidance: "记录每个目标仓库、基线、工作分支、隔离目录和当前提交。",
				suggestedSubsections: ["仓库清单", "基线与分支"]
			},
			{
				title: "变更摘要",
				guidance: "按仓库和模块说明代码、配置、数据迁移及兼容性变更。",
				suggestedSubsections: [
					"代码变更",
					"配置与迁移",
					"兼容性说明"
				]
			},
			{
				title: "测试计划",
				guidance: "列出计划执行的单元、集成、端到端、回归和非功能测试。",
				suggestedSubsections: [
					"测试范围",
					"测试命令",
					"测试数据"
				]
			},
			{
				title: "测试结果",
				guidance: "记录真实执行时间、环境、命令、结果、失败原因和证据；禁止推测。",
				suggestedSubsections: [
					"执行记录",
					"失败与处置",
					"测试证据"
				]
			},
			{
				title: "提交与合并记录",
				guidance: "记录真实提交、评审或合并请求及其状态；未提交或未合并时明确说明。",
				suggestedSubsections: ["提交记录", "评审与合并状态"]
			},
			{
				title: "遗留问题",
				guidance: "记录技术债、已知风险、未完成测试、后续工作和责任人；没有时明确写“无”。",
				suggestedSubsections: ["问题清单"]
			}
		]
	}
};
function artifactTemplate(stage, key = "{交付件编号}", title = "{交付件标题}") {
	const template = STAGE_ARTIFACT_TEMPLATES[stage];
	const sections = template.sections.map((section) => {
		const suggestions = section.suggestedSubsections.map((item) => `### ${item}\n\n<!-- 按需填写；不适用时可删除本三级章节。 -->`).join("\n\n");
		return `## ${section.title}\n\n<!-- 填写要求：${section.guidance} -->\n待补充。\n\n${suggestions}`;
	}).join("\n\n");
	return `# ${key} ${title}\n\n> 文档类型：${template.documentName}\n> 维护说明：${template.maintenanceGuide}\n> 可以增加三级章节和附件引用，但不得删除或改名模板中的二级章节。\n\n${sections}\n`;
}
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
	if (action.kind === "preview-revision" && typeof action.artifactUid === "string") return action;
	if (action.kind === "create-revision" && typeof action.artifactUid === "string" && (action.revisionKind === "upstream" || action.revisionKind === "user-intent") && (action.reason === void 0 || typeof action.reason === "string") && (action.affectedAreas === void 0 || stringArray(action.affectedAreas))) return action;
	if (action.kind === "discard-draft" && typeof action.artifactUid === "string") return action;
	if ((action.kind === "accept" || action.kind === "quality") && typeof action.artifactUid === "string") return action;
	if (action.kind === "read-artifact-file" && typeof action.artifactUid === "string" && typeof action.path === "string") return action;
	if (action.kind === "open-artifact-path" && typeof action.artifactUid === "string" && typeof action.path === "string") return action;
	if (action.kind === "read-stage-template" && isStageId(action.stage)) return action;
	if (action.kind === "open-stage-template" && isStageId(action.stage) && [
		"directory",
		"config",
		"content"
	].includes(String(action.target))) return action;
	if (action.kind === "update-work-item-settings" && typeof action.workItemUid === "string" && stringArray(action.repositoryScope) && stringArray(action.developmentTargets) && (action.openSpec === void 0 || typeof action.openSpec === "object" && action.openSpec !== null)) return action;
	if (action.kind === "add-project-repository" && typeof action.id === "string" && typeof action.source === "string" && typeof action.baseBranch === "string") return action;
	if (action.kind === "inspect-project-repository" && typeof action.source === "string") return action;
	if (action.kind === "update-project-repository-branch" && typeof action.id === "string" && typeof action.baseBranch === "string") return action;
	if (action.kind === "remove-project-repository" && typeof action.id === "string") return action;
	if (action.kind === "context" && isStageId(action.stage) && typeof action.artifactUid === "string" && stringArray(action.artifactUids) && (action.sourceUids === void 0 || stringArray(action.sourceUids))) return action;
	if (action.kind === "bind-session" && isStageId(action.stage) && typeof action.artifactUid === "string" && typeof action.sessionId === "string" && stringArray(action.artifactUids) && (action.runUid === void 0 || typeof action.runUid === "string") && (action.sourceUids === void 0 || stringArray(action.sourceUids))) return action;
	if ((action.kind === "sync-run" || action.kind === "complete-run") && typeof action.runUid === "string") return action;
	if ((action.kind === "development-create" || action.kind === "development-status") && typeof action.artifactUid === "string" && (action.kind === "development-status" || typeof action.repositoryId === "string")) return action;
	if (action.kind === "development-test" && typeof action.artifactUid === "string" && typeof action.repositoryId === "string" && typeof action.testId === "string") return action;
	if (action.kind === "development-commit" && typeof action.artifactUid === "string" && typeof action.repositoryId === "string" && typeof action.message === "string" && action.message.trim() !== "") return action;
	if ((action.kind === "import-source" || action.kind === "preview-source-import") && typeof action.provider === "string" && typeof action.sourceKind === "string" && typeof action.key === "string" && (action.connector === void 0 || typeof action.connector === "string") && (action.input === void 0 || typeof action.input === "object" && action.input !== null && !Array.isArray(action.input))) return action;
	if (action.kind === "apply-source-import" && typeof action.previewUid === "string" && stringArray(action.identities)) return action;
	if (action.kind === "resolve-work-item-removal" && typeof action.workItemUid === "string" && (action.decision === "keep" || action.decision === "archive")) return action;
	if (action.kind === "create-draft" && isStageId(action.stage) && typeof action.title === "string" && stringArray(action.basedOn) && (action.sourceUids === void 0 || stringArray(action.sourceUids)) && (action.workItemUid === void 0 || typeof action.workItemUid === "string")) return action;
}
function stringArray(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//#endregion
export { STAGES, STAGE_ARTIFACT_TEMPLATES, artifactTemplate, isStageId, parseAction, stageDefinition };
