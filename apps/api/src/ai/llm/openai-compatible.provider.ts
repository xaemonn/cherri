import OpenAI, { toFile } from 'openai';
import type { LlmProvider, LlmRequest, LlmResult, LlmTask, LlmToolCall } from './llm.types';

export interface OpenAICompatibleConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  models: Partial<Record<LlmTask, string>>;
  transcribeModel?: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  /** Provider-specific request fields (e.g. Groq's reasoning_effort for gpt-oss). */
  extraBody?: (model: string) => Record<string, unknown> | undefined;
}

/**
 * Groq, Gemini, OpenRouter and Ollama all speak the OpenAI Chat Completions
 * protocol, so one client covers every free provider.
 */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      timeout: config.timeoutMs,
      maxRetries: 0, // the gateway handles fallback across providers
      defaultHeaders: config.headers,
    });
  }

  get canTranscribe(): boolean {
    return Boolean(this.config.transcribeModel);
  }

  modelFor(task: LlmTask): string | undefined {
    return this.config.models[task];
  }

  private params(request: LlmRequest) {
    const model = this.modelFor(request.task);
    if (!model) throw new Error(`${this.name} has no model for ${request.task}`);
    return {
      model,
      messages: request.messages,
      ...(request.tools?.length && { tools: request.tools, tool_choice: 'auto' as const }),
      ...(request.json && { response_format: { type: 'json_object' as const } }),
      temperature: request.temperature ?? 0.5,
      max_tokens: request.maxTokens ?? 1024,
      ...this.config.extraBody?.(model),
    };
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    const params = this.params(request);
    const response = await this.client.chat.completions.create({ ...params, stream: false });
    const message = response.choices[0]?.message;
    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? []).flatMap((call, i) =>
      call.type === 'function' ? [{ id: call.id || `call_${i}`, name: call.function.name, arguments: call.function.arguments }] : [],
    );
    return { provider: this.name, model: params.model, content: message?.content ?? '', toolCalls };
  }

  async stream(request: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const params = this.params(request);
    const stream = await this.client.chat.completions.create({ ...params, stream: true });
    let content = '';
    const calls = new Map<number, LlmToolCall>();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        onText(delta.content);
      }
      // Tool calls arrive in fragments keyed by index; stitch them back together.
      for (const fragment of delta.tool_calls ?? []) {
        const call = calls.get(fragment.index) ?? { id: '', name: '', arguments: '' };
        if (fragment.id) call.id = fragment.id;
        if (fragment.function?.name && !call.name) call.name = fragment.function.name;
        if (fragment.function?.arguments) call.arguments += fragment.function.arguments;
        calls.set(fragment.index, call);
      }
    }
    const toolCalls = [...calls.values()].map((c, i) => ({ ...c, id: c.id || `call_${i}` }));
    return { provider: this.name, model: params.model, content, toolCalls };
  }

  async transcribe(audio: Buffer, filename: string, language?: string): Promise<string> {
    if (!this.config.transcribeModel) throw new Error(`${this.name} cannot transcribe`);
    const result = await this.client.audio.transcriptions.create({
      file: await toFile(audio, filename),
      model: this.config.transcribeModel,
      ...(language && { language }),
    });
    return result.text;
  }

  async listModels(): Promise<string[]> {
    const ids: string[] = [];
    for await (const model of this.client.models.list()) ids.push(model.id);
    return ids;
  }
}
