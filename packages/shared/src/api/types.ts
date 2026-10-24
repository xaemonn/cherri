/**
 * Response shapes of the Cherri API. The API imports these too, so web, mobile
 * and backend can't drift apart.
 */
import type {
  CompanionTone,
  CyclePhase,
  EvidenceLevel,
  FlowLevel,
  LabFlag,
  Language,
  LifeStage,
  LogSource,
  MythVerdict,
  RiskBand,
  ScreeningType,
} from '../constants';
import type { InterpretedLabResult } from '../catalog/labs';
import type { CareResource } from '../content/resources';
import type { PhaseGuide } from '../content/phases';
import type { CyclePrediction, CycleStats } from '../cycle/predict';
import type { PeriodRecord } from '../cycle/phases';
import type { ISODate } from '../dates';
import type { PatternInsight, PatternReport } from '../insights/patterns';
import type { RedFlag } from '../insights/redFlags';
import type { SymptomSummary, WrappedStats } from '../insights/summary';
import type { BloodPressureReading } from '../insights/vitals';
import type { MoodShift } from '../insights/medicationMood';
import type { LogDraft } from '../nlp/extractLog';
import type { CareStep, CareStepStatus, GestationalAge, MaternalScheme, PostpartumAge } from '../pregnancy/care';
import type { Helpline } from '../safety';
import type { ScreeningDefinition } from '../screenings/definitions';
import type { MindCheckResult, MindCheckType } from '../screenings/mind';
import type { ScreeningResult } from '../screenings/scoring';
import type { AuthTokens } from '../schemas/auth';
import type { ChatAction, Citation } from '../schemas/ai';
import type { FamilyCondition } from '../constants';
import type { StructuredStory } from '../visit/story';

export interface ApiErrorBody {
  error: { status: number; code: string; message: string; details?: unknown };
}

export interface PublicUser {
  id: string;
  email: string | null;
  isGuest: boolean;
  name: string | null;
  birthYear: number | null;
  age: number | null;
  lifeStage: LifeStage;
  language: Language;
  companionTone: CompanionTone;
  avgCycleLength: number;
  avgPeriodLength: number;
  conditions: string[];
  timezone: string;
  dueDate: ISODate | null;
  deliveryDate: ISODate | null;
  onboarded: boolean;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface LogDto {
  date: ISODate;
  flow: FlowLevel | null;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleepHours: number | null;
  painLevel: number | null;
  bbt: number | null;
  lhPositive: boolean | null;
  systolic: number | null;
  diastolic: number | null;
  weightKg: number | null;
  notes: string | null;
  source: LogSource;
  symptoms: Array<{ code: string; severity: number; bodyRegion: string | null }>;
  updatedAt: string;
}

export interface PeriodDto {
  id: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export interface Suggestion {
  type: 'LOG_TODAY' | 'SCREENING' | 'UPLOAD_LABS' | 'LOG_BP' | 'DANGER_CHECK' | 'VISIT_PREP';
  title: string;
  reason: string;
  screening?: ScreeningType;
}

export type CareStepView = CareStep & { status: CareStepStatus };

export interface PregnancyStatus {
  stage: 'PREGNANCY';
  age: GestationalAge;
  baby: { emoji: string; name: string } | null;
  steps: CareStepView[];
  /** The next 9th of the month: free PMSMA check-up at government facilities. */
  nextPmsma: ISODate;
  latestBp: BloodPressureReading | null;
}

export interface PostpartumStatus {
  stage: 'POSTPARTUM';
  deliveryDate: ISODate;
  age: PostpartumAge;
  steps: CareStepView[];
  latestBp: BloodPressureReading | null;
}

export type MotherhoodStatus = PregnancyStatus | PostpartumStatus;

export interface MotherhoodResponse {
  today: ISODate;
  lifeStage: LifeStage;
  /** Null when she is pregnant or postpartum but hasn't given a due or delivery date yet. */
  status: MotherhoodStatus | null;
  bloodPressure: BloodPressureReading[];
  weight: Array<{ date: ISODate; weightKg: number }>;
  flags: RedFlag[];
  schemes: readonly MaternalScheme[];
}

export interface DashboardResponse {
  user: { name: string | null; lifeStage: LifeStage; isGuest: boolean; companionTone: CompanionTone };
  today: ISODate;
  cycle: {
    day: number;
    phase: CyclePhase;
    isPeriod: boolean;
    /** What the model expects this cycle to last, and her usual period length (for the wheel). */
    expectedLength: number;
    periodLength: number;
    guide: PhaseGuide;
    nextPeriod: CyclePrediction['nextPeriod'];
    fertileWindow: { start: ISODate; end: ISODate; ovulation: ISODate };
    confidenceNote: string;
  } | null;
  todayLog: LogDto | null;
  streak: number;
  patterns: PatternInsight[];
  patternsReady: boolean;
  redFlags: RedFlag[];
  suggestions: Suggestion[];
  /** Pregnancy or postpartum care, when she is in either stage and has given the date. */
  motherhood: MotherhoodStatus | null;
}

export interface CycleResponse {
  today: ISODate;
  lifeStage: LifeStage;
  prediction: CyclePrediction | null;
  periods: PeriodRecord[];
  guides: Record<CyclePhase, PhaseGuide>;
}

export interface InsightsResponse {
  today: ISODate;
  patterns: PatternReport;
  redFlags: RedFlag[];
  symptoms: SymptomSummary[];
  stats: CycleStats | null;
  /** Medicines after which her logged mood dropped noticeably. */
  moodShifts: MoodShift[];
}

export interface WrappedResponse extends WrappedStats {
  patternsFound: number;
  labsDecoded: number;
  screeningsTaken: number;
  powerPhaseVibe: string | null;
  headline: string;
}

export interface ScreeningRecord {
  id: string;
  type: ScreeningType;
  band: RiskBand;
  createdAt: string;
  result: ScreeningResult;
}

export interface PrefilledAnswer {
  value: boolean;
  reason: string;
}

export type ScreeningOverviewItem = Omit<ScreeningDefinition, 'questions'> & {
  questionCount: number;
  latest: ScreeningRecord | null;
};

export type ScreeningDetail = ScreeningDefinition & {
  prefill: Record<string, PrefilledAnswer>;
  latest: ScreeningRecord | null;
};

export type LabResultDto = InterpretedLabResult & { id: string };

export interface LabReportDto {
  id: string;
  takenAt: ISODate;
  labName: string | null;
  source: string;
  extractor: string | null;
  createdAt: string;
  results: LabResultDto[];
  highlights: LabResultDto[];
  summary: string;
}

export interface LabTrend {
  code: string;
  name: string;
  unit: string | null;
  points: Array<{ takenAt: ISODate; value: number; unit: string | null; flag: LabFlag }>;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface ChatMessageMeta {
  provider?: string;
  citations?: Citation[];
  actions?: ChatAction[];
  safety?: string;
}

export interface ChatMessageDto {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  meta: ChatMessageMeta | null;
  createdAt: string;
}

export interface ChatSafety {
  category: string;
  message: string;
  helplines: Array<{ name: string; number: string }>;
}

export interface ChatReply {
  sessionId: string;
  reply: string;
  actions: ChatAction[];
  citations: Citation[];
  safety: ChatSafety | null;
  messageId?: string;
  provider?: string;
  offline?: boolean;
}

export interface ParsedLog {
  date: ISODate;
  draft: LogDraft;
  summary: string;
  parser: string;
  log: LogDto | null;
}

export interface MythCheck {
  claim: string;
  verdict: MythVerdict;
  evidence: EvidenceLevel;
  explanation: string;
  source: 'curated' | 'ai' | 'library';
  citations: Citation[];
}

export interface TranscribeResult {
  text: string;
  provider: string;
}

export interface DoctorReport {
  version: 1;
  generatedAt: string;
  rangeStart: ISODate;
  rangeEnd: ISODate;
  patient: { firstName: string | null; age: number | null; lifeStage: string; knownConditions: string[] };
  cycle: {
    averageCycleLength: number | null;
    shortestCycle: number | null;
    longestCycle: number | null;
    variability: number | null;
    regularity: string;
    averagePeriodLength: number | null;
    lastPeriodStart: ISODate | null;
    nextExpected: ISODate | null;
    history: Array<{ start: ISODate; end: ISODate | null; periodDays: number | null; cycleLength: number | null }>;
  } | null;
  pain: { averageDuringPeriod: number | null; maximum: number | null; daysAt6OrMore: number };
  symptoms: Array<{
    label: string;
    clinicalTerm: string | null;
    days: number;
    shareOfLoggedDays: number;
    avgSeverity: number;
    peakPhase: string | null;
  }>;
  patterns: string[];
  redFlags: Array<{ severity: string; title: string; detail: string }>;
  screenings: Array<{ title: string; band: RiskBand; summary: string; date: string; basis: string }>;
  labs: Array<{
    name: string;
    value: number;
    unit: string | null;
    flag: LabFlag;
    takenAt: ISODate;
    previous: { value: number; takenAt: ISODate } | null;
    /** LOINC code when the test is in the catalog (used for the FHIR export). */
    loinc?: string | null;
  }>;
  questionsToAsk: string[];
  notes: Array<{ date: ISODate; text: string }>;
  loggedDays: number;
  disclaimer: string;
  // Added after v1 shipped; optional so older share snapshots still render.
  /** A few plain sentences built only from the numbers below. */
  summary?: string;
  story?: ReportStory | null;
  background?: ReportBackground | null;
  medications?: ReportMedication[];
  pregnancy?: ReportPregnancy | null;
  vitals?: {
    bloodPressure: Array<{ date: ISODate; systolic: number; diastolic: number }>;
    weight: Array<{ date: ISODate; weightKg: number }>;
  } | null;
  /** What a clinician would usually want but isn't in her records yet. */
  notYetOnRecord?: string[];
  /** Latest PHQ-9 / GAD-7 totals. */
  mindChecks?: Array<{ type: MindCheckType; title: string; score: number; maxScore: number; label: string; date: ISODate; selfHarm: boolean }>;
}

export interface MindCheckRecord extends MindCheckResult {
  id: string;
  createdAt: string;
}

export interface MindChecksResponse {
  latest: Record<MindCheckType, MindCheckRecord | null>;
  history: MindCheckRecord[];
}

export type ReportStory = StructuredStory & { inHerWords: string; updatedAt: string };

export interface ReportBackground {
  menarcheAge: number | null;
  familyHistory: string[];
  allergies: string | null;
  surgeries: string | null;
}

export interface ReportMedication {
  name: string;
  dose: string | null;
  schedule: string | null;
  reason: string | null;
  since: ISODate | null;
  /** Mean mood (1–5) in the month before she started it and the two months after, when it dropped. */
  moodChange?: { before: number; after: number } | null;
}

export type ReportPregnancy =
  | { stage: 'PREGNANCY'; weeks: number; days: number; trimester: 1 | 2 | 3; dueDate: ISODate }
  | { stage: 'POSTPARTUM'; deliveryDate: ISODate; weeksSinceBirth: number };

export interface MedicationDto {
  id: string;
  name: string;
  dose: string | null;
  schedule: string | null;
  reason: string | null;
  startedOn: ISODate | null;
  active: boolean;
  createdAt: string;
}

export interface HealthBackground {
  menarcheAge: number | null;
  familyHistory: FamilyCondition[];
  allergies: string | null;
  surgeries: string | null;
}

export interface SymptomStoryDto {
  text: string;
  structured: StructuredStory;
  source: 'MANUAL' | 'VOICE';
  updatedAt: string;
}

export interface StructuredStoryResult {
  structured: StructuredStory;
  /** Which AI provider read the story, or "offline". */
  parser: string;
  /** Set when the story mentions a crisis, so helplines can be shown straight away. */
  safety: ChatSafety | null;
}

export interface TrustedContactDto {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
}

export interface ShareCreated {
  id: string;
  url: string;
  token: string;
  expiresAt: string;
  maxViews: number | null;
  qrCode: string;
  report: DoctorReport;
}

export interface ShareListItem {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  maxViews: number | null;
  lastViewedAt: string | null;
  active: boolean;
}

export interface ShareAccessItem {
  viewedAt: string;
  userAgent: string | null;
}

export interface ShareView {
  report: DoctorReport;
  expiresAt: string;
  viewsRemaining: number | null;
}

export interface CarePlace {
  name: string;
  kind: 'GYNAECOLOGY' | 'HOSPITAL' | 'CLINIC';
  lat: number;
  lng: number;
  distanceKm: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapUrl: string;
}

export interface HelpResources {
  helplines: readonly Helpline[];
  resources: readonly CareResource[];
}

export interface NearbyCare extends HelpResources {
  places: CarePlace[];
  source: string;
  degraded: boolean;
}

export interface ArticleMeta {
  id: string;
  title: string;
  source: string;
  url?: string;
  topics: string[];
  summary: string;
}

export interface Article extends ArticleMeta {
  body: string;
}

export interface HealthResponse {
  status: string;
  time: string;
  ai: { providers: string[]; chat: boolean; vision: boolean; offlineFallback: boolean };
}

export interface DemoLoadResult {
  periods: number;
  logs: number;
  labResults: number;
}
