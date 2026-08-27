import type { ArtifactSummary, DevelopmentWorkspace, ProjectConfig, ProjectSnapshot, QualityCheck, QualityReport } from './protocol.ts'
import { runtimeDefinition } from './stage-definitions.ts'

const PLACEHOLDERS = ['待补充', 'TODO', 'TBD', '待确认']

function sectionBodies(markdown: string): Map<string, string> {
  const result = new Map<string, string>()
  const matches = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)]
  matches.forEach((match, index) => {
    const start = match.index! + match[0].length
    const end = matches[index + 1]?.index ?? markdown.length
    result.set(match[1]!.trim(), markdown.slice(start, end).trim())
  })
  return result
}

function meaningfulContent(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '').replace(/^#{3,6}\s+.+$/gm, '').trim()
}

function check(code: string, label: string, passed: boolean, message: string, warning = false): QualityCheck {
  return { code, label, status: passed ? 'passed' : warning ? 'warning' : 'failed', message }
}

function developmentChecks(workspace: DevelopmentWorkspace | undefined): QualityCheck[] {
  if (workspace === undefined) return [check('development-workspace', '隔离开发空间', false, '尚未创建隔离代码工作空间')]
  const tests = workspace.repositories.map(repository => repository.lastTest).filter(result => result !== undefined)
  return [
    check('development-workspace', '隔离开发空间', workspace.repositories.length > 0, `已配置 ${workspace.repositories.length} 个代码仓库`),
    check('development-commit', '代码提交', workspace.repositories.some(repository => repository.headCommit !== repository.baseCommit), '至少一个仓库需要形成独立提交'),
    check('development-test', '测试证据', tests.length > 0 && tests.every(result => result.passed), tests.length === 0 ? '尚未执行配置的测试' : '最近测试必须全部通过'),
    check('development-clean', '未提交变更', workspace.repositories.every(repository => repository.changedFiles === 0), '交付前隔离空间不应留有未提交变更'),
  ]
}

export function evaluateQuality(
  artifact: ArtifactSummary,
  content: string,
  project: ProjectConfig,
  snapshot: Pick<ProjectSnapshot, 'artifacts' | 'developmentWorkspaces'>,
  checkedAt = new Date().toISOString(),
): QualityReport {
  const definition = runtimeDefinition(artifact.stage)
  const bodies = sectionBodies(content)
  const checks: QualityCheck[] = []
  const requiredSections = artifact.template?.requiredSections ?? definition.requiredSections
  for (const section of requiredSections) {
    const body = bodies.get(section)
    checks.push(check(`section:${section}`, `章节：${section}`, body !== undefined && meaningfulContent(body).length > 0, body === undefined ? '缺少必填章节' : '章节内容不能为空'))
    if (body !== undefined) {
      checks.push(check(`placeholder:${section}`, `占位内容：${section}`, !PLACEHOLDERS.some(value => body.includes(value)), '章节仍包含待补充或待确认占位内容'))
    }
  }
  const requiredStages = Object.entries(project.dependencies[artifact.stage] ?? {})
    .filter(([, mode]) => mode === 'required').map(([stage]) => stage)
  for (const stage of requiredStages) {
    const traced = artifact.basedOn.some(reference => snapshot.artifacts.some(input => input.uid === reference.uid && input.stage === stage && input.status === 'accepted'))
    checks.push(check(`input:${stage}`, `必需输入：${stage}`, traced, `必须关联一个已接受的 ${stage} 交付件`))
  }
  definition.completionChecklist.forEach((label, index) => {
    const selected = artifact.checklist?.[`item-${index + 1}`] === true
    checks.push(check(`checklist:${index + 1}`, `验收：${label}`, selected, '需要由负责人确认', true))
  })
  if (artifact.stage === 'development') {
    checks.push(...developmentChecks(snapshot.developmentWorkspaces.find(item => item.artifactUid === artifact.uid)))
  }
  checks.push(check('manifest', '交付件 Manifest', artifact.validationErrors.length === 0, artifact.validationErrors.join('; ') || 'Manifest 有效'))
  const failed = checks.filter(item => item.status === 'failed').length
  const checklistReady = checks.filter(item => item.code.startsWith('checklist:')).every(item => item.status === 'passed')
  const passed = checks.filter(item => item.status === 'passed').length
  return {
    artifactUid: artifact.uid,
    stage: artifact.stage,
    checkedAt,
    ready: failed === 0 && checklistReady,
    score: checks.length === 0 ? 100 : Math.round(passed / checks.length * 100),
    checks,
  }
}
