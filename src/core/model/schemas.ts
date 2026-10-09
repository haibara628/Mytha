import { z } from 'zod'

// ---- 项目种子（用户输入） ----
export const CharacterSeedSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  description: z.string().optional()
})

export const SeedSchema = z.object({
  premise: z.string(), // 背景
  synopsis: z.string(), // 梗概
  characterSeeds: z.array(CharacterSeedSchema) // 主要人物
})

// ---- 世界观 ----
export const WorldSchema = z.object({
  era: z.string(), // 时代
  rules: z.array(z.string()), // 规则
  powerSystem: z.string(), // 力量体系
  geography: z.string(), // 地理
  tone: z.string(), // 基调
  background: z.string().optional() // 世界观背景
})

// ---- 人物卡 ----
export const RelationshipSchema = z.object({
  targetId: z.string(),
  type: z.string(),
  intensity: z.number().min(0).max(1)
})

export const CharacterStaticSchema = z.object({
  role: z.string(),
  traits: z.array(z.string()),
  background: z.string(),
  goal: z.string(),
  flaw: z.string()
})

export const CharacterDynamicSchema = z.object({
  location: z.string(),
  inventory: z.array(z.string()),
  relationships: z.array(RelationshipSchema),
  knowledge: z.array(z.string()),
  emotionalState: z.string()
})

export const CharacterArcSchema = z.object({
  stage: z.string(),
  nextBeat: z.string()
})

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  static: CharacterStaticSchema,
  dynamic: CharacterDynamicSchema,
  arc: CharacterArcSchema,
  voice: z.string()
})

// ---- 伏笔 / 情节线 ----
export const PlotThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['planted', 'advanced', 'revealed', 'resolved']),
  relatedCharacterIds: z.array(z.string())
})

// ---- 专有名词 ----
export const GlossaryEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
  category: z.string()
})

// ---- 文风卡 ----
export const StyleCardSchema = z.object({
  pov: z.string(),
  tense: z.string(),
  tone: z.string(),
  sentenceStyle: z.string(),
  dialogueStyle: z.string(),
  prohibitions: z.array(z.string())
})

// ---- M0 占位实体（后续阶段填充） ----
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
})
export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  goal: z.string()
})
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  significance: z.string()
})
export const TimelineEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  description: z.string(),
  chapterRef: z.string().optional()
})

// ---- 故事圣经（唯一真相源） ----
export const BibleSchema = z.object({
  world: WorldSchema,
  characters: z.array(CharacterSchema),
  plotThreads: z.array(PlotThreadSchema),
  glossary: z.array(GlossaryEntrySchema),
  style: StyleCardSchema,
  locations: z.array(LocationSchema),
  factions: z.array(FactionSchema),
  items: z.array(ItemSchema),
  timeline: z.array(TimelineEventSchema)
})

// ---- 框架 ----
export const ActSchema = z.object({
  id: z.string(),
  index: z.number(),
  title: z.string(),
  goal: z.string(),
  conflict: z.string(),
  turningPoint: z.string(),
  summary: z.string()
})

export const ArcEntrySchema = z.object({
  characterId: z.string(),
  characterName: z.string(),
  arc: z.array(z.string())
})

export const FrameworkSchema = z.object({
  acts: z.array(ActSchema),
  arcs: z.array(ArcEntrySchema)
})

// ---- 项目 ----
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string(),
  seed: SeedSchema,
  createdAt: z.string(),
  updatedAt: z.string()
})

// ---- 提纲（阶段2） ----
export const SceneCardSchema = z.object({
  id: z.string(),
  index: z.number(),
  goal: z.string(),
  conflict: z.string(),
  turningPoint: z.string(),
  characterIds: z.array(z.string()), // 出场人物
  plotThreadIds: z.array(z.string()), // 推进的伏笔
  summary: z.string()
})

export const ChapterSchema = z.object({
  id: z.string(),
  index: z.number(),
  title: z.string(),
  goal: z.string(),
  summary: z.string(),
  scenes: z.array(SceneCardSchema)
})

export const OutlineSchema = z.object({
  chapters: z.array(ChapterSchema)
})

// ---- 正文（阶段3） ----
export const SceneDraftSchema = z.object({
  sceneId: z.string(),
  content: z.string(),
  summary: z.string() // 场景摘要（分层摘要链第 1 层）
})

export const RelationshipUpsertSchema = z.object({
  targetId: z.string(),
  type: z.string(),
  intensity: z.number().min(0).max(1)
})

export const CharacterStateChangeSchema = z.object({
  characterId: z.string(),
  location: z.string().optional(),
  inventoryGained: z.array(z.string()).optional(),
  inventoryLost: z.array(z.string()).optional(),
  knowledgeGained: z.array(z.string()).optional(),
  emotionalState: z.string().optional(),
  relationshipUpserts: z.array(RelationshipUpsertSchema).optional()
})

export const PlotThreadAdvanceSchema = z.object({
  plotThreadId: z.string(),
  status: z.enum(['planted', 'advanced', 'revealed', 'resolved'])
})

export const ChapterStateChangesSchema = z.object({
  characters: z.array(CharacterStateChangeSchema),
  plotThreads: z.array(PlotThreadAdvanceSchema)
})

export const FindingSchema = z.object({
  severity: z.enum(['error', 'warning']),
  rule: z.string(),
  message: z.string(),
  chapterId: z.string().optional(),
  sceneId: z.string().optional(),
  characterId: z.string().optional(),
  plotThreadId: z.string().optional()
})

export const ChapterManuscriptSchema = z.object({
  chapterId: z.string(),
  scenes: z.array(SceneDraftSchema),
  stateChanges: ChapterStateChangesSchema,
  findings: z.array(FindingSchema)
})

export const ChapterGenerationSchema = z.object({
  scenes: z.array(SceneDraftSchema),
  stateChanges: ChapterStateChangesSchema,
  chapterSummary: z.string()
})

// ---- 摘要（分层摘要链） ----
export const ChapterSummarySchema = z.object({
  chapterId: z.string(),
  title: z.string(),
  summary: z.string()
})

export const BookSummarySchema = z.object({
  summary: z.string()
})
