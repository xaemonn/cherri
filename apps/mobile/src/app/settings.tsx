import { COMPANION_TONES, LANGUAGES, type CompanionTone, type Language } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Chip, Screen, SectionTitle, T } from '@/components/ui';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const TONE_LABELS: Record<CompanionTone, string> = { BESTIE: 'Bestie 💅', BIG_SIS: 'Big sis 🫶', CLINICAL: 'Straight facts 🩺' };
const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', hinglish: 'Hinglish', hi: 'हिंदी', kn: 'ಕನ್ನಡ' };

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
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
