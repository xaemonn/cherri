import { ApiError } from '@cherri/shared';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordInput } from '@/components/password-input';
import { tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const LOCK_KEY = 'cherri.locked';

const store = {
  async get() {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(LOCK_KEY) === '1';
    return (await SecureStore.getItemAsync(LOCK_KEY)) === '1';
  },
  async set(locked: boolean) {
    if (Platform.OS === 'web') {
      if (locked) globalThis.localStorage?.setItem(LOCK_KEY, '1');
      else globalThis.localStorage?.removeItem(LOCK_KEY);
    } else if (locked) await SecureStore.setItemAsync(LOCK_KEY, '1');
    else await SecureStore.deleteItemAsync(LOCK_KEY);
  },
};

const ShieldContext = createContext<() => void>(() => undefined);

/** Quick exit for phones: a weather screen covers everything at once, and stays until her PIN is entered (even after the app restarts). */
export function ShieldProvider({ children }: { children: ReactNode }) {
  const [shielded, setShielded] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    void store.get().then((locked) => locked && setShielded(true));
  }, []);

  const engage = useCallback(() => {
    setShielded(true);
    void store.set(true);
    queryClient.clear();
  }, [queryClient]);

  return (
    <ShieldContext.Provider value={engage}>
      {children}
      {shielded && (
        <View style={StyleSheet.absoluteFill}>
          <Decoy
            onUnlocked={() => {
              setShielded(false);
              void store.set(false);
              router.replace('/home');
            }}
          />
        </View>
      )}
    </ShieldContext.Provider>
  );
}

export const useQuickExit = () => useContext(ShieldContext);

export function QuickExitButton() {
  const quickExit = useQuickExit();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Quick exit" onPress={quickExit} style={styles.exit}>
      <Ionicons name="eye-off-outline" size={15} color="#6B2416" />
      <Text style={styles.exitText}>Quick exit</Text>
    </Pressable>
  );
}

function forecast() {
  const now = new Date();
  const base = [24, 27, 31, 34, 35, 32, 29, 29, 29, 29, 27, 24][now.getMonth()]!;
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() + i * 86_400_000);
    const wobble = ((now.getDate() * 7 + i * 3) % 5) - 2;
    return { day: i === 0 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' }), high: base + wobble + 2, low: base - 6 + (i % 3), icon: i % 3 === 1 ? '⛅' : '☀️' };
  });
}

function Decoy({ onUnlocked }: { onUnlocked: () => void }) {
  const { status, user } = useAuth();
  const [days] = useState(forecast);
  const [pad, setPad] = useState(false);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usePin = Boolean(user?.hasPin);
  const nothingToCheck = status !== 'signedIn' || (!usePin && user?.isGuest);

  const attempt = useMemo(
    () => async (value: string) => {
      setError(null);
      try {
        if (!nothingToCheck) await api.me.unlock(usePin ? { pin: value } : { password: value });
        setSecret('');
        setPad(false);
        onUnlocked();
      } catch (e) {
        setSecret('');
        setError(e instanceof ApiError && e.status === 429 ? 'Too many tries. Wait a minute.' : 'Incorrect. Try again.');
      }
    },
    [nothingToCheck, usePin, onUnlocked],
  );

  return (
    <SafeAreaView style={styles.decoy}>
      <View style={styles.decoyHeader}>
        <Text style={styles.decoySmall}>Weather</Text>
        <Pressable accessibilityLabel="Menu" onPress={() => setPad(true)} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.city}>Your city</Text>
      <Text style={styles.temp}>{days[0]!.high - 2}°</Text>
      <Text style={styles.decoyText}>☀️ Mostly clear · H:{days[0]!.high}° L:{days[0]!.low}°</Text>
      <View style={styles.forecast}>
        {days.map((d) => (
          <View key={d.day} style={styles.row}>
            <Text style={[styles.decoyText, { width: 60 }]}>{d.day}</Text>
            <Text style={styles.decoyText}>{d.icon}</Text>
            <Text style={styles.decoyText}>
              {d.low}° — {d.high}°
            </Text>
          </View>
        ))}
      </View>

      {pad && (
        <View style={styles.padWrap}>
          <View style={styles.padCard}>
            <Text style={styles.padTitle}>{nothingToCheck ? 'Open?' : usePin ? 'Enter passcode' : 'Enter password'}</Text>
            {nothingToCheck ? (
              <Pressable style={styles.padButton} onPress={() => void attempt('')}>
                <Text style={styles.padButtonText}>Continue</Text>
              </Pressable>
            ) : (
              <>
                <PasswordInput
                  autoFocus
                  value={secret}
                  iconColor="#5f6368"
                  keyboardType={usePin ? 'number-pad' : 'default'}
                  maxLength={usePin ? 4 : 200}
                  onChangeText={(v) => {
                    setSecret(v);
                    if (usePin && v.length === 4) void attempt(v);
                  }}
                  onSubmitEditing={() => !usePin && void attempt(secret)}
                  style={styles.padInput}
                />
                {!usePin && (
                  <Pressable style={styles.padButton} onPress={() => void attempt(secret)}>
                    <Text style={styles.padButtonText}>Open</Text>
                  </Pressable>
                )}
              </>
            )}
            {error && <Text style={styles.padError}>{error}</Text>}
            <Pressable
              onPress={() => {
                tap();
                setPad(false);
              }}
            >
              <Text style={styles.padCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  exit: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', backgroundColor: '#F1DFC8', borderColor: '#E5CDB0', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  exitText: { color: '#6B2416', fontWeight: '700', fontSize: 13 },
  decoy: { flex: 1, backgroundColor: '#4a6fa5', paddingHorizontal: 20 },
  decoyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  decoySmall: { color: '#fff', fontSize: 14, opacity: 0.9 },
  city: { color: '#fff', fontSize: 26, textAlign: 'center', marginTop: 24 },
  temp: { color: '#fff', fontSize: 92, fontWeight: '200', textAlign: 'center' },
  decoyText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  forecast: { marginTop: 28, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  padWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  padCard: { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 12, alignItems: 'center' },
  padTitle: { fontSize: 17, fontWeight: '600', color: '#202124' },
  padInput: { width: '100%', height: 48, borderWidth: 1, borderColor: '#dadce0', borderRadius: 10, textAlign: 'center', fontSize: 22, letterSpacing: 8, color: '#202124' },
  padButton: { width: '100%', height: 46, borderRadius: 999, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center' },
  padButtonText: { color: '#fff', fontWeight: '600' },
  padError: { color: '#d93025' },
  padCancel: { color: '#5f6368', marginTop: 4 },
});
