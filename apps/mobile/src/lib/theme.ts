import { colors } from '@cherri/shared';

export { colors };

/** Loaded in the root layout from @expo-google-fonts. */
export const fonts = {
  display: 'Figtree_700Bold',
  displayBold: 'Figtree_600SemiBold',
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const radius = { md: 18, lg: 24, card: 28, pill: 999 } as const;

/** Calming bluish tints matching the web app. */
export const tones = {
  paper: { bg: colors.paper, border: colors.line },
  cream: { bg: colors.creamDeep, border: colors.line },
  matcha: { bg: '#E0F0FE', border: '#BDE0FE' },
  sunshine: { bg: '#ECF5FF', border: '#A2D2FF' },
  periwinkle: { bg: '#F4EEF9', border: '#CDB4DB' },
  tangerine: { bg: '#FFEDF3', border: '#FFAFCC' },
  sage: { bg: '#EAF4FE', border: '#BDE0FE' },
  apricot: { bg: '#FFEDF3', border: '#FFAFCC' },
  ink: { bg: colors.ink, border: colors.ink },
} as const;

export type Tone = keyof typeof tones;
