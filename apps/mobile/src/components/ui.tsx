import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, tones, type Tone } from '@/lib/theme';

export function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}

export function Screen({ children, scroll = true, bottomInset = 120 }: { children: ReactNode; scroll?: boolean; bottomInset?: number }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1, paddingBottom: 0 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'h2' | 'h3' | 'body' | 'small' | 'eyebrow';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[textStyles[variant], style]} />;
}

/** Hard offset shadow (the "sticker" look) that renders identically on iOS, Android and web. */
export function Sticker({ children, style, offset = 4, radius: r = radius.card }: { children: ReactNode; style?: StyleProp<ViewStyle>; offset?: number; radius?: number }) {
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View style={[StyleSheet.absoluteFill, { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: colors.ink, borderRadius: r }]} />
      {children}
    </View>
  );
}

export function Card({ tone = 'paper', sticker = false, style, children }: { tone?: Tone; sticker?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: tones[tone].bg, borderColor: sticker ? colors.ink : tones[tone].border, borderWidth: sticker ? 2 : 1 },
        !sticker && styles.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
  return sticker ? <Sticker>{body}</Sticker> : body;
}

type ButtonVariant = 'primary' | 'lime' | 'outline' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.ink, fg: colors.cream, border: colors.ink },
    lime: { bg: colors.olive, fg: colors.ink, border: colors.ink },
    outline: { bg: 'transparent', fg: colors.ink, border: colors.ink },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  }[variant];
  const button = (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : 1 },
        pressed && variant === 'lime' && { transform: [{ translateX: 2 }, { translateY: 2 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : icon}
      <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
  return variant === 'lime' ? (
    <Sticker radius={radius.pill} offset={3} style={style}>
      {button}
    </Sticker>
  ) : (
    <View style={style}>{button}</View>
  );
}

export function Chip({ label, emoji, selected, onPress, style }: { label: string; emoji?: string; selected?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, selected ? { backgroundColor: colors.ink, borderColor: colors.ink } : { backgroundColor: colors.paper, borderColor: colors.line }, style]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.cream : colors.ink }]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={{ marginTop: 28, marginBottom: 12 }}>
      {eyebrow && <T variant="eyebrow">{eyebrow}</T>}
      <T variant="h2">{title}</T>
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.ink} size="large" />
      {label && <T variant="small">{label}</T>}
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Something went wrong.'}</Text>
    </View>
  );
}

export const textStyles: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: colors.ink, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.display, fontSize: 23, lineHeight: 27, color: colors.ink, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 4 },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 18, paddingTop: 12 },
  card: { borderRadius: radius.card, padding: 18 },
  soft: { shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  button: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 2,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontFamily: fonts.displayBold, fontSize: 16 },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
  error: { backgroundColor: '#FFE2C6', borderRadius: 16, padding: 12, marginVertical: 8 },
  errorText: { fontFamily: fonts.semibold, color: colors.cherryDeep, fontSize: 14 },
});
