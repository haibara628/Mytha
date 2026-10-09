import { MockProvider } from './mock'
import type { LLMProvider } from './provider'

export type { LLMProvider } from './provider'

export interface LLMConfig {
  provider?: 'mock' | 'anthropic'
}

/** Provider 工厂。M0 仅支持 mock；后续按配置切换 Anthropic。 */
export function getProvider(config: LLMConfig = {}): LLMProvider {
  if (config.provider === 'anthropic') {
    throw new Error('AnthropicProvider 尚未实现（M0 仅提供 Mock）。')
  }
  return new MockProvider()
}
