import type { ScreeningType } from '../constants';
import type { ISODate } from '../dates';
import type { ChatRequest, ChatStreamEvent, MythCheckRequest, ParseLogRequest } from '../schemas/ai';
import type { GuestInput, LoginInput, RegisterInput, UpgradeGuestInput } from '../schemas/auth';
import type {
  CreatePeriodInput,
  ManualLabReportInput,
  OnboardingInput,
  UpdatePeriodInput,
  UpdateProfileInput,
  UpsertLogInput,
} from '../schemas/health';
import type { CreateReportInput } from '../schemas/reports';
import type { HealthBackgroundInput, MedicationInput, MedicationUpdate, TrustedContactInput } from '../schemas/visit';
import type { Myth } from '../content/myths';
import type { PhaseGuide } from '../content/phases';
import type { CyclePhase } from '../constants';
import type { FhirBundle } from '../fhir/bundle';
import type { ScreeningDefinition } from '../screenings/definitions';
import type { MindCheckType } from '../screenings/mind';
import type { SymptomDef } from '../catalog/symptoms';
import type { SaveStoryInput } from '../visit/story';
import type {
  Article,
  ArticleMeta,
  AuthResult,
  ChatMessageDto,
  ChatReply,
  ChatSessionSummary,
  CycleResponse,
  DashboardResponse,
  DemoLoadResult,
  DoctorReport,
  HealthBackground,
  HealthResponse,
  HelpResources,
  InsightsResponse,
  LabReportDto,
  LabTrend,
  LogDto,
  MedicationDto,
  MindCheckRecord,
  MindChecksResponse,
  MotherhoodResponse,
  MythCheck,
  NearbyCare,
  ParsedLog,
  PeriodDto,
  PublicUser,
  ScreeningDetail,
  ScreeningOverviewItem,
  ScreeningRecord,
  ShareAccessItem,
  ShareCreated,
  ShareListItem,
  ShareView,
  StructuredStoryResult,
  SymptomStoryDto,
  TranscribeResult,
  TrustedContactDto,
  WrappedResponse,
} from './types';

export type DemoPersona = 'ananya' | 'meera';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

/** Where a platform keeps the session: localStorage on web, SecureStore on mobile. */
export interface SessionStore {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession | null): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  session: SessionStore;
  /** Defaults to the global fetch (expo/fetch on native, which supports streaming). */
  fetch?: typeof fetch;
  /** Called when the session can no longer be refreshed, so the app can show sign-in. */
  onSignedOut?: () => void;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  body?: unknown;
  form?: FormData;
  query?: Query;
  auth?: boolean;
  signal?: AbortSignal;
}

/** Split a Server-Sent Events buffer into complete events plus the unfinished remainder. */
export function drainSseBuffer(buffer: string): { events: ChatStreamEvent[]; rest: string } {
  const events: ChatStreamEvent[] = [];
  let rest = buffer;
  let index = rest.indexOf('\n\n');
  while (index !== -1) {
    const data = rest
      .slice(0, index)
      .split('\n')
      .find((line) => line.startsWith('data: '));
    if (data) events.push(JSON.parse(data.slice(6)) as ChatStreamEvent);
    rest = rest.slice(index + 2);
    index = rest.indexOf('\n\n');
  }
  return { events, rest };
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch: typeof fetch = (input, init) => (options.fetch ?? globalThis.fetch)(input, init);
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  let session: StoredSession | null | undefined;
  let refreshing: Promise<boolean> | null = null;

  const currentSession = async () => {
    if (session === undefined) session = await options.session.load();
    return session;
  };
  const setSession = async (next: StoredSession | null) => {
    session = next;
    await options.session.save(next);
  };

  // Built by hand: React Native's URL implementation lacks a writable searchParams.
  const urlFor = (path: string, query?: Query) => {
    const qs = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
  };

  const toError = async (res: Response) => {
    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
    return new ApiError(res.status, data?.error?.code ?? 'HTTP_ERROR', data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details);
  };

  /** One refresh at a time, shared by every request that hit a 401 meanwhile. */
  const refresh = (): Promise<boolean> => {
    refreshing ??= (async () => {
      try {
        const current = await currentSession();
        if (!current) return false;
        const res = await doFetch(urlFor('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (!res.ok) {
          await setSession(null);
          options.onSignedOut?.();
          return false;
        }
        const { tokens } = (await res.json()) as AuthResult;
        await setSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        return true;
      } catch {
        return false; // offline: keep the session and let the caller see the network error
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };

  const send = async (method: string, path: string, opts: RequestOptions, retry = true): Promise<Response> => {
    const headers: Record<string, string> = {};
    let body: FormData | string | undefined;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    if (opts.auth !== false) {
      const current = await currentSession();
      if (current) headers.Authorization = `Bearer ${current.accessToken}`;
    }
    const res = await doFetch(urlFor(path, opts.query), { method, headers, body, signal: opts.signal });
    if (res.status === 401 && opts.auth !== false && retry && (await refresh())) return send(method, path, opts, false);
    return res;
  };

  const request = async <T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> => {
    const res = await send(method, path, opts);
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  };

  const authenticate = async (path: string, body: unknown, auth = false): Promise<AuthResult> => {
    const result = await request<AuthResult>('POST', path, { body, auth });
    await setSession({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken });
    return result;
  };

  return {
    hasSession: async () => (await currentSession()) !== null,
    health: () => request<HealthResponse>('GET', '/health', { auth: false }),

    auth: {
      register: (input: RegisterInput) => authenticate('/auth/register', input),
      login: (input: LoginInput) => authenticate('/auth/login', input),
      guest: (input: GuestInput = {}) => authenticate('/auth/guest', input),
      upgrade: (input: UpgradeGuestInput) => authenticate('/auth/upgrade', input, true),
      logout: async () => {
        const current = await currentSession();
        await setSession(null);
        if (current) await request<void>('POST', '/auth/logout', { body: { refreshToken: current.refreshToken }, auth: false }).catch(() => undefined);
      },
    },

    me: {
      get: () => request<PublicUser>('GET', '/me'),
      update: (input: UpdateProfileInput) => request<PublicUser>('PATCH', '/me', { body: input }),
      onboard: (input: OnboardingInput) => request<PublicUser>('POST', '/me/onboarding', { body: input }),
      background: () => request<HealthBackground>('GET', '/me/background'),
      updateBackground: (input: HealthBackgroundInput) => request<HealthBackground>('PUT', '/me/background', { body: input }),
      exportData: () => request<Record<string, unknown>>('GET', '/me/export'),
      remove: async () => {
        await request<void>('DELETE', '/me', { body: { confirm: 'DELETE' } });
        await setSession(null);
      },
    },

    symptoms: () => request<Array<Omit<SymptomDef, 'keywords'>>>('GET', '/symptoms', { auth: false }),
    logs: {
      list: (from?: ISODate, to?: ISODate) => request<LogDto[]>('GET', '/logs', { query: { from, to } }),
      get: (date: ISODate) => request<{ log: LogDto | null }>('GET', `/logs/${date}`),
      upsert: (date: ISODate, input: UpsertLogInput) => request<LogDto>('PUT', `/logs/${date}`, { body: input }),
      remove: (date: ISODate) => request<void>('DELETE', `/logs/${date}`),
    },
    periods: {
      list: () => request<PeriodDto[]>('GET', '/periods'),
      create: (input: CreatePeriodInput) => request<PeriodDto>('POST', '/periods', { body: input }),
      update: (id: string, input: UpdatePeriodInput) => request<PeriodDto>('PATCH', `/periods/${id}`, { body: input }),
      remove: (id: string) => request<void>('DELETE', `/periods/${id}`),
    },

    dashboard: () => request<DashboardResponse>('GET', '/dashboard'),
    motherhood: () => request<MotherhoodResponse>('GET', '/motherhood'),
    cycle: () => request<CycleResponse>('GET', '/cycle'),
    insights: () => request<InsightsResponse>('GET', '/insights'),
    wrapped: (days = 90) => request<WrappedResponse>('GET', '/wrapped', { query: { days } }),

    screenings: {
      overview: () => request<ScreeningOverviewItem[]>('GET', '/screenings'),
      history: () => request<ScreeningRecord[]>('GET', '/screenings/history'),
      detail: (type: ScreeningType) => request<ScreeningDetail>('GET', `/screenings/${type}`),
      submit: (type: ScreeningType, answers: Record<string, boolean>) =>
        request<ScreeningRecord>('POST', `/screenings/${type}`, { body: { answers } }),
    },
    mind: {
      list: () => request<MindChecksResponse>('GET', '/mind-checks'),
      /** Answers are 0–3 per question (not at all … nearly every day). */
      submit: (type: MindCheckType, answers: Record<string, number>) => request<MindCheckRecord>('POST', `/mind-checks/${type}`, { body: { answers } }),
    },

    labs: {
      list: () => request<LabReportDto[]>('GET', '/labs'),
      trends: () => request<LabTrend[]>('GET', '/labs/trends'),
      /** `form` must hold the report under the "file" field. */
      upload: (form: FormData) => request<LabReportDto>('POST', '/labs/upload', { form }),
      manual: (input: ManualLabReportInput) => request<LabReportDto>('POST', '/labs/manual', { body: input }),
      remove: (id: string) => request<void>('DELETE', `/labs/${id}`),
    },

    ai: {
      /** Streams the reply; resolves when the stream ends. */
      chat: async (input: ChatRequest, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal): Promise<void> => {
        const res = await send('POST', '/ai/chat', { body: input, signal });
        if (!res.ok) throw await toError(res);
        const reader = res.body?.getReader();
        if (!reader) {
          drainSseBuffer(`${await res.text()}\n\n`).events.forEach(onEvent);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const drained = drainSseBuffer(buffer + decoder.decode(value, { stream: true }));
          buffer = drained.rest;
          drained.events.forEach(onEvent);
        }
      },
      chatOnce: (input: ChatRequest) => request<ChatReply>('POST', '/ai/chat', { body: input, query: { stream: 'false' } }),
      sessions: () => request<ChatSessionSummary[]>('GET', '/ai/sessions'),
      session: (id: string) => request<ChatMessageDto[]>('GET', `/ai/sessions/${id}`),
      deleteSession: (id: string) => request<void>('DELETE', `/ai/sessions/${id}`),
      parseLog: (input: ParseLogRequest) => request<ParsedLog>('POST', '/ai/parse-log', { body: input }),
      /** `form` must hold the recording under the "audio" field. */
      transcribe: (form: FormData, language?: 'en' | 'hi' | 'kn') =>
        request<TranscribeResult>('POST', '/ai/transcribe', { form, query: { language } }),
      mythCheck: (input: MythCheckRequest) => request<MythCheck>('POST', '/ai/myth-check', { body: input }),
    },

    reports: {
      preview: (rangeDays = 180, includeNotes = false) =>
        request<DoctorReport>('GET', '/reports/preview', { query: { rangeDays, includeNotes } }),
      create: (input: Partial<CreateReportInput> = {}) => request<ShareCreated>('POST', '/reports', { body: input }),
      list: () => request<ShareListItem[]>('GET', '/reports'),
      accesses: (id: string) => request<ShareAccessItem[]>('GET', `/reports/${id}/accesses`),
      revoke: (id: string) => request<void>('DELETE', `/reports/${id}`),
      /** The same report as an HL7 FHIR R4 bundle. */
      fhir: (rangeDays = 180) => request<FhirBundle>('GET', '/reports/fhir', { query: { rangeDays } }),
    },
    share: {
      view: (token: string) => request<ShareView>('GET', `/share/${token}`, { auth: false }),
    },

    medications: {
      list: () => request<MedicationDto[]>('GET', '/medications'),
      create: (input: MedicationInput) => request<MedicationDto>('POST', '/medications', { body: input }),
      update: (id: string, input: MedicationUpdate) => request<MedicationDto>('PATCH', `/medications/${id}`, { body: input }),
      remove: (id: string) => request<void>('DELETE', `/medications/${id}`),
    },
    story: {
      get: () => request<{ story: SymptomStoryDto | null }>('GET', '/story'),
      /** Organise free text into a doctor-style history; nothing is saved until `save`. */
      structure: (text: string) => request<StructuredStoryResult>('POST', '/story/structure', { body: { text } }),
      save: (input: SaveStoryInput) => request<SymptomStoryDto>('PUT', '/story', { body: input }),
      remove: () => request<void>('DELETE', '/story'),
    },
    contacts: {
      list: () => request<TrustedContactDto[]>('GET', '/contacts'),
      create: (input: TrustedContactInput) => request<TrustedContactDto>('POST', '/contacts', { body: input }),
      remove: (id: string) => request<void>('DELETE', `/contacts/${id}`),
    },

    care: {
      resources: () => request<HelpResources>('GET', '/care/resources', { auth: false }),
      nearby: (lat: number, lng: number, radiusKm = 5) => request<NearbyCare>('GET', '/care/nearby', { query: { lat, lng, radiusKm } }),
    },

    content: {
      articles: () => request<ArticleMeta[]>('GET', '/content/articles', { auth: false }),
      article: (id: string) => request<Article>('GET', `/content/articles/${id}`, { auth: false }),
      myths: () => request<Myth[]>('GET', '/content/myths', { auth: false }),
      phases: () => request<Record<CyclePhase, PhaseGuide>>('GET', '/content/phases', { auth: false }),
      screenings: () => request<ScreeningDefinition[]>('GET', '/content/screenings', { auth: false }),
      help: () => request<HelpResources>('GET', '/content/help', { auth: false }),
    },

    demo: {
      /** "ananya" (cycle tracking, the default) or "meera" (30 weeks pregnant). */
      load: (persona: DemoPersona = 'ananya') => request<DemoLoadResult>('POST', '/demo/load', { body: { persona } }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
