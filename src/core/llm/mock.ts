import {
  BibleSchema,
  ChapterGenerationSchema,
  FrameworkSchema,
  OutlineSchema
} from '../model/schemas'
import type { Bible, ChapterGeneration, Framework, Outline, Seed } from '../model/types'
import type { ChapterContext } from '../context/assembler'
import {
  buildBibleFromSeed,
  buildChapterGeneration,
  buildFrameworkFromBible,
  buildOutlineFromFramework
} from './deterministic'
import type { LLMProvider } from './provider'

/** 纯本地确定性 Provider：无 API key 即可跑通全流程，兼作测试 oracle。 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock'

  async bibleFromSeed(seed: Seed): Promise<Bible> {
    return BibleSchema.parse(buildBibleFromSeed(seed))
  }

  async frameworkFromBible(bible: Bible): Promise<Framework> {
    return FrameworkSchema.parse(buildFrameworkFromBible(bible))
  }

  async outlineFromFramework(bible: Bible, framework: Framework): Promise<Outline> {
    return OutlineSchema.parse(buildOutlineFromFramework(bible, framework))
  }

  async generateChapter(context: ChapterContext): Promise<ChapterGeneration> {
    return ChapterGenerationSchema.parse(buildChapterGeneration(context))
  }
}
