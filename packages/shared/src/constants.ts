export const APP_NAME = 'Cherri';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const LIFE_STAGES = ['CYCLE', 'TTC', 'PREGNANCY', 'POSTPARTUM', 'PERIMENOPAUSE', 'MENOPAUSE'] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

/** Life stages where period prediction is meaningful. */
export const PREDICTABLE_LIFE_STAGES: readonly LifeStage[] = ['CYCLE', 'TTC', 'PERIMENOPAUSE'];

export const LANGUAGES = ['en', 'hi', 'hinglish', 'kn'] as const;
export type Language = (typeof LANGUAGES)[number];

export const COMPANION_TONES = ['BESTIE', 'BIG_SIS', 'CLINICAL'] as const;
export type CompanionTone = (typeof COMPANION_TONES)[number];

export const FLOW_LEVELS = ['NONE', 'SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY'] as const;
export type FlowLevel = (typeof FLOW_LEVELS)[number];

/** Flow levels that count as menstrual bleeding (spotting does not start a period). */
export const BLEEDING_FLOWS: readonly FlowLevel[] = ['LIGHT', 'MEDIUM', 'HEAVY'];

export const LOG_SOURCES = ['MANUAL', 'VOICE', 'CHAT'] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

export const CONDITIONS = ['PCOS', 'ENDOMETRIOSIS', 'THYROID', 'ANEMIA', 'PMDD', 'DIABETES'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Conditions in her mother or sisters that change what a doctor looks for. */
export const FAMILY_CONDITIONS = [
  'PCOS',
  'ENDOMETRIOSIS',
  'THYROID',
  'DIABETES',
  'HYPERTENSION',
  'HEART_DISEASE',
  'BREAST_CANCER',
  'OVARIAN_CANCER',
] as const;
export type FamilyCondition = (typeof FAMILY_CONDITIONS)[number];

export const FAMILY_CONDITION_LABELS: Record<FamilyCondition, string> = {
  PCOS: 'PCOS',
  ENDOMETRIOSIS: 'Endometriosis',
  THYROID: 'Thyroid problems',
  DIABETES: 'Diabetes',
  HYPERTENSION: 'High blood pressure',
  HEART_DISEASE: 'Heart disease',
  BREAST_CANCER: 'Breast cancer',
  OVARIAN_CANCER: 'Ovarian cancer',
};

export const CYCLE_PHASES = ['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL'] as const;
export type CyclePhase = (typeof CYCLE_PHASES)[number];

export const BODY_REGIONS = [
  'HEAD',
  'BREASTS',
  'UPPER_ABDOMEN',
  'LOWER_ABDOMEN',
  'PELVIS',
  'LOWER_BACK',
  'THIGHS',
  'JOINTS',
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export const SCREENING_TYPES = ['PCOS', 'ENDOMETRIOSIS', 'PMDD', 'ANEMIA', 'THYROID'] as const;
export type ScreeningType = (typeof SCREENING_TYPES)[number];

export const RISK_BANDS = ['LOW', 'MODERATE', 'HIGH'] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const LAB_FLAGS = ['LOW', 'NORMAL', 'HIGH', 'UNKNOWN'] as const;
export type LabFlag = (typeof LAB_FLAGS)[number];

export const EVIDENCE_LEVELS = ['STRONG', 'MODERATE', 'EMERGING', 'TREND_ONLY'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const MYTH_VERDICTS = ['TRUE', 'MYTH', 'MISLEADING', 'UNPROVEN'] as const;
export type MythVerdict = (typeof MYTH_VERDICTS)[number];

export const MEDICAL_DISCLAIMER =
  'Cherri gives health information, not a diagnosis. Always talk to a qualified doctor about your symptoms.';
