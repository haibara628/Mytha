import type { z } from 'zod'
import {
  SeedSchema,
  CharacterSeedSchema,
  WorldSchema,
  RelationshipSchema,
  CharacterStaticSchema,
  CharacterDynamicSchema,
  CharacterArcSchema,
  CharacterSchema,
  PlotThreadSchema,
  GlossaryEntrySchema,
  StyleCardSchema,
  LocationSchema,
  FactionSchema,
  ItemSchema,
  TimelineEventSchema,
  BibleSchema,
  ActSchema,
  ArcEntrySchema,
  FrameworkSchema,
  ProjectSchema,
  SceneCardSchema,
  ChapterSchema,
  OutlineSchema,
  SceneDraftSchema,
  CharacterStateChangeSchema,
  PlotThreadAdvanceSchema,
  ChapterStateChangesSchema,
  ChapterManuscriptSchema,
  ChapterGenerationSchema,
  ChapterSummarySchema,
  BookSummarySchema,
  RelationshipUpsertSchema,
  FindingSchema
} from './schemas'

export type CharacterSeed = z.infer<typeof CharacterSeedSchema>
export type Seed = z.infer<typeof SeedSchema>
export type World = z.infer<typeof WorldSchema>
export type Relationship = z.infer<typeof RelationshipSchema>
export type CharacterStatic = z.infer<typeof CharacterStaticSchema>
export type CharacterDynamic = z.infer<typeof CharacterDynamicSchema>
export type CharacterArc = z.infer<typeof CharacterArcSchema>
export type Character = z.infer<typeof CharacterSchema>
export type PlotThreadStatus = z.infer<typeof PlotThreadSchema>['status']
export type PlotThread = z.infer<typeof PlotThreadSchema>
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>
export type StyleCard = z.infer<typeof StyleCardSchema>
export type Location = z.infer<typeof LocationSchema>
export type Faction = z.infer<typeof FactionSchema>
export type Item = z.infer<typeof ItemSchema>
export type TimelineEvent = z.infer<typeof TimelineEventSchema>
export type Bible = z.infer<typeof BibleSchema>
export type Act = z.infer<typeof ActSchema>
export type ArcEntry = z.infer<typeof ArcEntrySchema>
export type Framework = z.infer<typeof FrameworkSchema>
export type Project = z.infer<typeof ProjectSchema>

export type SceneCard = z.infer<typeof SceneCardSchema>
export type Chapter = z.infer<typeof ChapterSchema>
export type Outline = z.infer<typeof OutlineSchema>
export type SceneDraft = z.infer<typeof SceneDraftSchema>
export type CharacterStateChange = z.infer<typeof CharacterStateChangeSchema>
export type PlotThreadAdvance = z.infer<typeof PlotThreadAdvanceSchema>
export type ChapterStateChanges = z.infer<typeof ChapterStateChangesSchema>
export type ChapterManuscript = z.infer<typeof ChapterManuscriptSchema>
export type ChapterGeneration = z.infer<typeof ChapterGenerationSchema>
export type ChapterSummary = z.infer<typeof ChapterSummarySchema>
export type BookSummary = z.infer<typeof BookSummarySchema>
export type RelationshipUpsert = z.infer<typeof RelationshipUpsertSchema>
export type Finding = z.infer<typeof FindingSchema>
