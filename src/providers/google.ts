import type {
  ChatProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
} from "../types/index.js";

interface GoogleConfig {
  apiKey: string;
  model?: string;
}

/**
 * Google Gemini (Generative Language API) provider.
 * @see https://ai.google.dev/api/generate-content
 */
export class GoogleProvider implements ChatProvider {
  readonly name = "google";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl =
    "https://generativelanguage.googleapis.com/v1beta";

  constructor(config: GoogleConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "gemini-2.0-flash";
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: this.buildContents(request),
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("") ?? "";

    return {
      content: text,
      provider: this.name,
      model: this.model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(
    request: ChatRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: this.buildContents(request),
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        yield { content: "", done: true };
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const chunk = JSON.parse(trimmed.slice(6)) as GeminiResponse;
        const text =
          chunk.candidates?.[0]?.content?.parts
            ?.map((p) => p.text)
            .join("") ?? "";

        if (text) {
          yield { content: text, done: false };
        }
      }
    }
  }

  private buildContents(
    request: ChatRequest,
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    return request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
  }
}

/** @see https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}
