import { MockProvider } from './mock'
import { OllamaProvider } from './local'
import type { LLMProvider } from './provider'

export type { LLMProvider } from './provider'
export { OllamaProvider } from './local'

/** 默认本地模型（RTX 4080 / 16GB 上质量与稳定性的甜点位）。 */
export const DEFAULT_MODEL = 'qwen2.5:14b'

export interface LLMConfig {
  provider?: 'mock' | 'ollama' | 'anthropic'
  baseUrl?: string
  model?: string
}

/**
 * Provider 工厂。默认回落 mock（保证测试确定性）；
 * 通过 env（MYTHA_LLM_PROVIDER / MYTHA_LLM_MODEL / MYTHA_LLM_BASE_URL）或 config 显式开启本地模型。
 */
export function getProvider(config: LLMConfig = {}): LLMProvider {
  const provider =
    config.provider ??
    (process.env.MYTHA_LLM_PROVIDER as LLMConfig['provider'] | undefined) ??
    'mock'

  if (provider === 'ollama') {
    return new OllamaProvider({
      baseUrl: config.baseUrl ?? process.env.MYTHA_LLM_BASE_URL,
      model: config.model ?? process.env.MYTHA_LLM_MODEL ?? DEFAULT_MODEL
    })
  }
  if (provider === 'anthropic') {
    throw new Error('AnthropicProvider 尚未实现。')
  }
  return new MockProvider()
}
