import type { CyclePhase, EvidenceLevel, FlowLevel, LabFlag, MythVerdict, RiskBand } from '../constants';

/**
 * Cherri's palette: boho grove. Cream linen and cocoa ink with olive, sage, clay, ochre
 * and eucalyptus accents. Deliberately no pink anywhere: light reds become sand.
 */
export const colors = {
  cream: '#FAF5F3',
  creamDeep: '#F2E7E8',
  paper: '#FFFCFB',
  ink: '#2E2230',
  inkSoft: '#6E5A6B',
  inkFaint: '#A897A6',
  line: '#ECDDE0',
  olive: '#D69AB5',
  oliveDeep: '#8A3E66',
  forest: '#4A2340',
  clay: '#E3A487',
  clayDeep: '#8A4B30',
  ochre: '#D4A65A',
  ochreDeep: '#7A5A1E',
  dusk: '#A99BD6',
  duskDeep: '#4F4486',
  sage: '#9CC5B4',
  sageDeep: '#2F5E4E',
  cherry: '#B4354A',
  cherryDeep: '#7A1E2E',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'Plus Jakarta Sans',
  body: 'Inter',
} as const;

export const radii = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;

/** One earth tone per phase: rust, olive, ochre, eucalyptus. */
export const phaseColors: Record<CyclePhase, { fill: string; soft: string; ink: string }> = {
  MENSTRUAL: { fill: '#B5512F', soft: '#F1DFC8', ink: '#6B2416' },
  FOLLICULAR: { fill: '#8E9F55', soft: '#E6E9D3', ink: '#3F4A1E' },
  OVULATORY: { fill: '#D9AA55', soft: '#F3E6C6', ink: '#6B4F12' },
  LUTEAL: { fill: '#6F8F88', soft: '#DFE7E3', ink: '#2F4842' },
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
  LOW: { label: 'Low', bg: '#E6E9D3', ink: '#3F4A1E' },
  MODERATE: { label: 'Moderate', bg: '#F3E6C6', ink: '#6B4F12' },
  HIGH: { label: 'Worth a doctor visit', bg: '#EED9BE', ink: '#74461F' },
};

export const severityStyles: Record<'INFO' | 'WARNING' | 'URGENT', { label: string; bg: string; ink: string; emoji: string }> = {
  INFO: { label: 'Heads up', bg: '#DFE7E3', ink: '#2F4842', emoji: '' },
  WARNING: { label: 'Check this', bg: '#F0E0CC', ink: '#74461F', emoji: '' },
  URGENT: { label: 'Act now', bg: '#E9CDA9', ink: '#6B2416', emoji: '' },
};

export const labFlagStyles: Record<LabFlag, { label: string; bg: string; ink: string }> = {
  LOW: { label: 'Low', bg: '#F0E0CC', ink: '#74461F' },
  HIGH: { label: 'High', bg: '#E9CDA9', ink: '#6B2416' },
  NORMAL: { label: 'Normal', bg: '#E6E9D3', ink: '#3F4A1E' },
  UNKNOWN: { label: '—', bg: '#ECE3D3', ink: '#6B5A4A' },
};

export const evidenceStyles: Record<EvidenceLevel, { label: string; meter: number; ink: string }> = {
  STRONG: { label: 'Strong evidence', meter: 4, ink: '#3F4A1E' },
  MODERATE: { label: 'Moderate evidence', meter: 3, ink: '#3F5038' },
  EMERGING: { label: 'Emerging evidence', meter: 2, ink: '#6B4F12' },
  TREND_ONLY: { label: 'Just a trend', meter: 1, ink: '#74461F' },
};

export const verdictStyles: Record<MythVerdict, { label: string; emoji: string; bg: string; ink: string }> = {
  TRUE: { label: 'True', emoji: '', bg: '#E6E9D3', ink: '#3F4A1E' },
  MYTH: { label: 'Myth', emoji: '', bg: '#E9CDA9', ink: '#6B2416' },
  MISLEADING: { label: 'Misleading', emoji: '', bg: '#F3E6C6', ink: '#6B4F12' },
  UNPROVEN: { label: 'Unproven', emoji: '', bg: '#DFE7E3', ink: '#2F4842' },
};
