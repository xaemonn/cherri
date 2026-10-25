import { COMPANION_TONES, LANGUAGES, type CompanionTone, type Language } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { PasswordInput } from '@/components/password-input';
import { Button, Card, Chip, Screen, SectionTitle, T } from '@/components/ui';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

const TONE_LABELS: Record<CompanionTone, string> = { BESTIE: 'Bestie', BIG_SIS: 'Big sis', CLINICAL: 'Straight facts' };
const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', hinglish: 'Hinglish', hi: 'हिंदी', kn: 'ಕನ್ನಡ' };

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState('');
  if (!user) return null;

  async function update(patch: { companionTone?: CompanionTone; language?: Language }) {
    setSaving(true);
    try {
      setUser(await api.me.update(patch));
      await queryClient.invalidateQueries();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">You, your way</T>
      <T variant="small" style={{ marginTop: 4 }}>
        {user.isGuest ? 'Guest account' : user.email} · {user.name ?? 'No name'}
      </T>

      <SectionTitle title="Cherri’s vibe" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {COMPANION_TONES.map((t) => (
          <Chip key={t} label={TONE_LABELS[t]} selected={user.companionTone === t} onPress={() => void update({ companionTone: t })} />
        ))}
      </View>
      <SectionTitle title="Language" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANGUAGES.map((l) => (
          <Chip key={l} label={LANGUAGE_LABELS[l]} selected={user.language === l} onPress={() => void update({ language: l })} />
        ))}
      </View>
      {saving && <T variant="small">Saving…</T>}

      <SectionTitle eyebrow="Quick exit" title="Privacy PIN" />
      <Card style={{ gap: 10 }}>
        <T variant="small">
          {user.hasPin
            ? 'Quick exit covers Cherri with a weather screen; it reopens only with this 4-digit PIN (⋮ menu on the weather screen).'
            : 'Set a 4-digit PIN so Quick exit stays locked until you return. Until then your password unlocks it.'}
        </T>
        <PasswordInput
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="4 digits"
          placeholderTextColor={colors.inkFaint}
          style={{ height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 18, letterSpacing: 6, color: colors.ink }}
        />
        <Button
          label={user.hasPin ? 'Change PIN' : 'Set PIN'}
          disabled={pin.length !== 4}
          onPress={async () => {
            setUser(await api.me.setPin({ pin }));
            setPin('');
          }}
        />
        {user.hasPin && <Button label="Remove PIN" variant="ghost" onPress={async () => setUser(await api.me.removePin())} />}
      </Card>

      <SectionTitle title="Privacy" />
      <Card style={{ gap: 10 }}>
        <T variant="small">Your notes and chats are encrypted. AI only ever sees summaries.</T>
        <Button
          label="Log out"
          variant="outline"
          onPress={async () => {
            await logout();
            router.replace('/welcome');
          }}
        />
        <Button
          label="Delete my account"
          variant="ghost"
          onPress={() =>
            Alert.alert('Delete everything?', 'This permanently erases every log, report and chat.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await api.me.remove();
                  await logout();
                  router.replace('/welcome');
                },
              },
            ])
          }
        />
      </Card>
      <T variant="small" style={{ marginTop: 16, textAlign: 'center' }}>
        Connected to {API_URL}
      </T>
    </Screen>
  );
}
