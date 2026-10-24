import type OpenAI from 'openai';

/** `chat`: quality conversation · `fast`: cheap structured extraction · `vision`: images. */
export type LlmTask = 'chat' | 'fast' | 'vision';

export type LlmMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type LlmTool = OpenAI.Chat.Completions.ChatCompletionTool;

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmRequest {
  task: LlmTask;
  messages: LlmMessage[];
  tools?: LlmTool[];
  /** Ask for a JSON object response. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResult {
  provider: string;
  model: string;
  content: string;
  toolCalls: LlmToolCall[];
}

export interface LlmProvider {
  readonly name: string;
  /** Model used for a task, or undefined if this provider can't do it. */
  modelFor(task: LlmTask): string | undefined;
  readonly canTranscribe: boolean;
  complete(request: LlmRequest): Promise<LlmResult>;
  stream(request: LlmRequest, onText: (delta: string) => void): Promise<LlmResult>;
  transcribe(audio: Buffer, filename: string, language?: string): Promise<string>;
  listModels(): Promise<string[]>;
}

export const LLM_PROVIDERS = Symbol('LLM_PROVIDERS');

/** Thrown when no configured provider could serve a request; callers fall back to offline logic. */
export class LlmUnavailableError extends Error {
  constructor(task: string, readonly attempts: string[]) {
    super(`No AI provider available for "${task}"${attempts.length ? ` (tried ${attempts.join(', ')})` : ''}`);
    this.name = 'LlmUnavailableError';
  }
}
