export const GEMINI_MODELS = {
  FLASH: 'gemini-1.5-flash',
  FLASH_LITE: 'gemini-1.5-flash-8b',
  PRO: 'gemini-1.5-pro',
  FLASH_2: 'gemini-2.0-flash-lite',
} as const;

export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  O3_MINI: 'o3-mini',
} as const;

export const CLAUDE_MODELS = {
  OPUS_4: 'claude-opus-4-7',
  SONNET_4: 'claude-sonnet-4-6',
  HAIKU_4: 'claude-haiku-4-5-20251001',
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];
export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];
export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
