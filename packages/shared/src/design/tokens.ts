import type { CyclePhase, EvidenceLevel, FlowLevel, LabFlag, MythVerdict, RiskBand } from '../constants';

/**
 * Cherri's palette: Modern calming bluish tones with soft lavender and rose accents.
 * Coolors palette: #cdb4db, #ffc8dd, #ffafcc, #bde0fe, #a2d2ff (more bluish side).
 */
export const colors = {
  cream: '#F0F6FC',
  creamDeep: '#E1EEF9',
  paper: '#FFFFFF',
  ink: '#112239',
  inkSoft: '#435B75',
  inkFaint: '#7F99B7',
  line: '#D1E3F5',
  olive: '#60A5FA',
  oliveDeep: '#1D4ED8',
  forest: '#0C1D35',
  clay: '#FFAFCC',
  clayDeep: '#B82D60',
  ochre: '#A2D2FF',
  ochreDeep: '#1D5CA6',
  dusk: '#CDB4DB',
  duskDeep: '#5B3E7A',
  sage: '#BDE0FE',
  sageDeep: '#1B538C',
  cherry: '#E04A74',
  cherryDeep: '#8F1737',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'Plus Jakarta Sans',
  body: 'Inter',
  devanagari: 'Noto Sans Devanagari',
} as const;

export const radii = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;

/** One calming tone per phase. */
export const phaseColors: Record<CyclePhase, { fill: string; soft: string; ink: string }> = {
  MENSTRUAL: { fill: '#D1477A', soft: '#FBE4EC', ink: '#8A1F48' },
  FOLLICULAR: { fill: '#A99BD6', soft: '#EFEBFA', ink: '#4F4486' },
  OVULATORY: { fill: '#D4A65A', soft: '#F8EED8', ink: '#7A5A1E' },
  LUTEAL: { fill: '#6FB3A0', soft: '#E6F2EC', ink: '#2F5E4E' },
};

export const flowStyles: Record<FlowLevel, { label: string; emoji: string; drops: number }> = {
  NONE: { label: 'None', emoji: '', drops: 0 },
  SPOTTING: { label: 'Spotting', emoji: '', drops: 1 },
  LIGHT: { label: 'Light', emoji: '', drops: 1 },
  MEDIUM: { label: 'Medium', emoji: '', drops: 2 },
  HEAVY: { label: 'Heavy', emoji: '', drops: 3 },
};

export const moodScale = [
  { value: 1, emoji: '', label: 'Awful' },
  { value: 2, emoji: '', label: 'Low' },
  { value: 3, emoji: '', label: 'Okay' },
  { value: 4, emoji: '', label: 'Good' },
  { value: 5, emoji: '', label: 'Great' },
] as const;

export const energyScale = [
  { value: 1, emoji: '', label: 'Drained' },
  { value: 2, emoji: '', label: 'Tired' },
  { value: 3, emoji: '', label: 'Steady' },
  { value: 4, emoji: '', label: 'Strong' },
  { value: 5, emoji: '', label: 'Buzzing' },
] as const;

export const bandStyles: Record<RiskBand, { label: string; bg: string; ink: string }> = {
  LOW: { label: 'Low', bg: '#E0F0FE', ink: '#1D4ED8' },
  MODERATE: { label: 'Moderate', bg: '#ECF5FF', ink: '#1D5CA6' },
  HIGH: { label: 'Worth a doctor visit', bg: '#FFEDF3', ink: '#8F1737' },
};

export const severityStyles: Record<'INFO' | 'WARNING' | 'URGENT', { label: string; bg: string; ink: string; emoji: string }> = {
  INFO: { label: 'Heads up', bg: '#EAF4FE', ink: '#1B538C', emoji: '' },
  WARNING: { label: 'Check this', bg: '#F4EEF9', ink: '#5B3E7A', emoji: '' },
  URGENT: { label: 'Act now', bg: '#FFEDF3', ink: '#8F1737', emoji: '' },
};

export const labFlagStyles: Record<LabFlag, { label: string; bg: string; ink: string }> = {
  LOW: { label: 'Low', bg: '#ECF5FF', ink: '#1D5CA6' },
  HIGH: { label: 'High', bg: '#FFEDF3', ink: '#8F1737' },
  NORMAL: { label: 'Normal', bg: '#E0F0FE', ink: '#1D4ED8' },
  UNKNOWN: { label: '—', bg: '#E1EEF9', ink: '#435B75' },
};

export const evidenceStyles: Record<EvidenceLevel, { label: string; meter: number; ink: string }> = {
  STRONG: { label: 'Strong evidence', meter: 4, ink: '#1D4ED8' },
  MODERATE: { label: 'Moderate evidence', meter: 3, ink: '#1B538C' },
  EMERGING: { label: 'Emerging evidence', meter: 2, ink: '#5B3E7A' },
  TREND_ONLY: { label: 'Just a trend', meter: 1, ink: '#8F1737' },
};

export const verdictStyles: Record<MythVerdict, { label: string; emoji: string; bg: string; ink: string }> = {
  TRUE: { label: 'True', emoji: '', bg: '#E0F0FE', ink: '#1D4ED8' },
  MYTH: { label: 'Myth', emoji: '', bg: '#FFEDF3', ink: '#8F1737' },
  MISLEADING: { label: 'Misleading', emoji: '', bg: '#ECF5FF', ink: '#1D5CA6' },
  UNPROVEN: { label: 'Unproven', emoji: '', bg: '#EAF4FE', ink: '#1B538C' },
};
