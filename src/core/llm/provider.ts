import type {
  Bible,
  ChapterGeneration,
  Finding,
  Framework,
  Outline,
  Seed
} from '../model/types'
import type { ChapterContext } from '../context/assembler'
import type { SemanticReviewInput } from '../review/semantic'

/**
 * 模型接入抽象。M0 只实现 MockProvider；
 * 后续 AnthropicProvider 在同一接口下实现（内部用结构化输出 + prompt 模板）。
 *
 * 接口用「领域方法」而非泛型 generateJSON，保证类型安全，
 * 也让 Mock 能确定性地、可解释地生成结果（兼作测试 oracle）。
 */
export interface LLMProvider {
  readonly name: string
  /** 阶段0：设定深化 —— 由种子（背景/梗概/人物）生成完整故事圣经 */
  bibleFromSeed(seed: Seed): Promise<Bible>
  /** 阶段1：框架搭建 —— 由圣经生成三幕结构 + 人物弧线 */
  frameworkFromBible(bible: Bible): Promise<Framework>
  /** 阶段2：提纲生成 —— 由框架 + 圣经生成章节列表与场景卡 */
  outlineFromFramework(bible: Bible, framework: Framework): Promise<Outline>
  /** 阶段3：章节正文 —— 由组装好的上下文生成场景正文、摘要与状态变更 */
  generateChapter(context: ChapterContext): Promise<ChapterGeneration>
  /** 语义校验（LLM-as-judge）：对比新正文 vs 圣经 + 前情摘要，产出语义矛盾清单 */
  reviewChapter(input: SemanticReviewInput): Promise<Finding[]>
}
