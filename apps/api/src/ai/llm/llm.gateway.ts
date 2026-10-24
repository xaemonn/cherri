import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDERS, LlmUnavailableError, type LlmProvider, type LlmRequest, type LlmResult, type LlmTask } from './llm.types';

interface ProviderError {
  status?: number;
  headers?: { get?: (name: string) => string | null };
  message?: string;
}

/**
 * Routes each request through the configured free providers in order. A provider that
 * rate-limits or fails is benched for a cool-down so the next request skips it, which
 * keeps the app responsive when one free tier runs dry.
 */
@Injectable()
export class LlmGateway {
  private readonly logger = new Logger(LlmGateway.name);
  private readonly benchedUntil = new Map<string, number>();

  constructor(@Inject(LLM_PROVIDERS) private readonly providers: LlmProvider[]) {}

  get providerNames(): string[] {
    return this.providers.map((p) => p.name);
  }

  supports(task: LlmTask): boolean {
    return this.providers.some((p) => p.modelFor(task));
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    const attempts: string[] = [];
    for (const provider of this.candidates((p) => Boolean(p.modelFor(request.task)))) {
      attempts.push(provider.name);
      try {
        return await provider.complete(request);
      } catch (error) {
        this.bench(provider, error);
      }
    }
    throw new LlmUnavailableError(request.task, attempts);
  }

  /** Streams text as it arrives. Falls back to the next provider only if nothing was emitted yet. */
  async stream(request: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const attempts: string[] = [];
    for (const provider of this.candidates((p) => Boolean(p.modelFor(request.task)))) {
      attempts.push(provider.name);
      let emitted = false;
      try {
        return await provider.stream(request, (delta) => {
          emitted = true;
          onText(delta);
        });
      } catch (error) {
        this.bench(provider, error);
        if (emitted) throw error;
      }
    }
    throw new LlmUnavailableError(request.task, attempts);
  }

  async transcribe(audio: Buffer, filename: string, language?: string): Promise<{ text: string; provider: string }> {
    const attempts: string[] = [];
    for (const provider of this.candidates((p) => p.canTranscribe)) {
      attempts.push(provider.name);
      try {
        return { text: await provider.transcribe(audio, filename, language), provider: provider.name };
      } catch (error) {
        this.bench(provider, error);
      }
    }
    throw new LlmUnavailableError('transcribe', attempts);
  }

  private candidates(filter: (p: LlmProvider) => boolean): LlmProvider[] {
    const now = Date.now();
    return this.providers.filter((p) => filter(p) && (this.benchedUntil.get(p.name) ?? 0) <= now);
  }

  private bench(provider: LlmProvider, error: unknown): void {
    const { status, headers, message } = (error ?? {}) as ProviderError;
    const retryAfter = Number(headers?.get?.('retry-after'));
    let seconds = 20; // network errors, timeouts, 5xx
    if (status === 429) seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 600) : 60;
    else if (status === 401 || status === 403) seconds = 600; // bad key: don't hammer it
    else if (status === 404) seconds = 300; // model removed from the free tier
    else if (status === 400 || status === 422) seconds = 0; // this request was the problem, not the provider

    if (seconds > 0) this.benchedUntil.set(provider.name, Date.now() + seconds * 1000);
    this.logger.warn(`${provider.name} failed (${status ?? 'network'}): ${message ?? 'unknown error'}${seconds ? `; benched ${seconds}s` : ''}`);
  }
}
