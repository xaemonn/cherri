import { colors } from '@cherri/shared';

export { colors };

/** Loaded in the root layout from @expo-google-fonts. */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
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
  matcha: { bg: '#E6F3C8', border: '#CFE39B' },
  sunshine: { bg: '#FFEFC2', border: '#F6DC8F' },
  periwinkle: { bg: '#E1E4FF', border: '#C6CCFF' },
  tangerine: { bg: '#FFE7C2', border: '#F8CF98' },
  sage: { bg: '#DCEFE0', border: '#BCDCC2' },
  apricot: { bg: '#FFE2C6', border: '#F6C99E' },
  ink: { bg: colors.ink, border: colors.ink },
} as const;

export type Tone = keyof typeof tones;
