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

/** Soft tints matching the web app (no pink: light reds become apricot). */
export const tones = {
  paper: { bg: colors.paper, border: colors.line },
  cream: { bg: colors.creamDeep, border: colors.line },
  matcha: { bg: '#F8E6EE', border: '#EDC9D8' },
  sunshine: { bg: '#F8EED8', border: '#EBD9AE' },
  periwinkle: { bg: '#EFEBFA', border: '#D9D1F2' },
  tangerine: { bg: '#FBEBE2', border: '#F1D2C0' },
  sage: { bg: '#E6F2EC', border: '#C9E2D6' },
  apricot: { bg: '#FBE4E7', border: '#F2C6CD' },
  ink: { bg: colors.ink, border: colors.ink },
} as const;

export type Tone = keyof typeof tones;
