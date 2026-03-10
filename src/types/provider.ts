/**
 * Provider abstraction types.
 *
 * Each AI provider (OpenAI, Anthropic, Google) implements the
 * ChatProvider interface so the rest of the app stays provider-agnostic.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * All AI providers must implement this interface.
 * @example
 * ```ts
 * const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
 * const response = await provider.chat({ messages: [...] });
 * ```
 */
export interface ChatProvider {
  readonly name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(
    request: ChatRequest,
  ): AsyncGenerator<StreamChunk, void, unknown>;
  isConfigured(): boolean;
}
