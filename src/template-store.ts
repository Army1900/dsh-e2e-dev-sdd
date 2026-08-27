import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { parse, stringify } from 'yaml'
import { STAGES, STAGE_ARTIFACT_TEMPLATES, artifactTemplate, type ArtifactTemplateBinding, type StageId } from './protocol.ts'

export interface StageTemplateConfig {
  schema: 'dsh-sdd/artifact-template@1'
  stage: StageId
  version: string
  documentName: string
  maintenanceGuide: string
  requiredSections: string[]
}

export interface StageTemplateBundle {
  config: StageTemplateConfig
  content: string
  directory: string
  directoryRelative: string
  configRelative: string
  contentRelative: string
  contentHash: string
}

function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false)
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function defaultConfig(stage: StageId): StageTemplateConfig {
  const template = STAGE_ARTIFACT_TEMPLATES[stage]
  return {
    schema: 'dsh-sdd/artifact-template@1', stage, version: '1.0.0', documentName: template.documentName,
    maintenanceGuide: template.maintenanceGuide, requiredSections: template.sections.map(section => section.title),
  }
}

function validateConfig(value: unknown, stage: StageId): StageTemplateConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${stage} template.yaml must be an object`)
  const config = value as Partial<StageTemplateConfig>
  if (config.schema !== 'dsh-sdd/artifact-template@1') throw new Error(`${stage} template schema must be dsh-sdd/artifact-template@1`)
  if (config.stage !== stage) throw new Error(`${stage} template stage must be ${stage}`)
  for (const field of ['version', 'documentName', 'maintenanceGuide'] as const) {
    if (typeof config[field] !== 'string' || config[field]!.trim() === '') throw new Error(`${stage} template ${field} is required`)
  }
  if (!Array.isArray(config.requiredSections) || config.requiredSections.length === 0 || config.requiredSections.some(item => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${stage} template requiredSections must contain non-empty section names`)
  }
  return { ...config, requiredSections: [...new Set(config.requiredSections.map(item => item.trim()))] } as StageTemplateConfig
}

export async function ensureProjectTemplates(workspacePath: string): Promise<void> {
  const root = join(workspacePath, '.sdd', 'templates')
  await mkdir(root, { recursive: true })
  for (const stage of STAGES) {
    const directory = join(root, stage.id)
    const configPath = join(directory, 'template.yaml')
    const contentPath = join(directory, 'deliverable.md')
    await mkdir(directory, { recursive: true })
    if (!(await exists(configPath))) await writeFile(configPath, stringify(defaultConfig(stage.id)), 'utf8')
    if (!(await exists(contentPath))) await writeFile(contentPath, artifactTemplate(stage.id, '{{artifactKey}}', '{{artifactTitle}}'), 'utf8')
  }
  const readme = join(root, 'README.md')
  if (!(await exists(readme))) await writeFile(readme, `# SDD 项目交付件模板\n\n每个阶段包含 \`template.yaml\` 和 \`deliverable.md\`。可以编辑并提交到当前项目仓库。\n\n- \`requiredSections\` 是质量检查必须存在且非空的二级章节。\n- \`deliverable.md\` 使用 \`{{artifactKey}}\` 和 \`{{artifactTitle}}\` 占位符。\n- 已创建交付件保存自己的模板快照；修改项目模板只影响之后创建的草稿。\n`, 'utf8')
}

export async function loadStageTemplate(workspacePath: string, stage: StageId): Promise<StageTemplateBundle> {
  await ensureProjectTemplates(workspacePath)
  const directory = join(workspacePath, '.sdd', 'templates', stage)
  const configPath = join(directory, 'template.yaml')
  const contentPath = join(directory, 'deliverable.md')
  const config = validateConfig(parse(await readFile(configPath, 'utf8')), stage)
  const content = await readFile(contentPath, 'utf8')
  if (content.trim() === '') throw new Error(`${stage} deliverable template is empty`)
  for (const section of config.requiredSections) {
    if (!new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`, 'm').test(content)) throw new Error(`${stage} deliverable template is missing required section: ${section}`)
  }
  return {
    config, content, directory, directoryRelative: relative(workspacePath, directory).split('\\').join('/'),
    configRelative: relative(workspacePath, configPath).split('\\').join('/'), contentRelative: relative(workspacePath, contentPath).split('\\').join('/'),
    contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
  }
}

export function renderStageTemplate(bundle: StageTemplateBundle, key: string, title: string): string {
  return bundle.content.replaceAll('{{artifactKey}}', key).replaceAll('{{artifactTitle}}', title)
}

export async function snapshotStageTemplate(artifactDirectory: string, bundle: StageTemplateBundle): Promise<ArtifactTemplateBinding> {
  const directory = join(artifactDirectory, '.template')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'template.yaml'), stringify(bundle.config), 'utf8')
  await writeFile(join(directory, 'deliverable.md'), bundle.content, 'utf8')
  return {
    stage: bundle.config.stage, version: bundle.config.version, sourcePath: bundle.contentRelative,
    snapshotPath: '.template/deliverable.md', configSnapshotPath: '.template/template.yaml',
    contentHash: bundle.contentHash, requiredSections: bundle.config.requiredSections,
  }
}
