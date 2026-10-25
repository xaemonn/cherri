import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, ErrorText, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const user = await login({ email: email.trim(), password });
      router.replace(user.onboarded ? '/home' : '/onboarding');
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">Welcome back 🍒</T>
      <T variant="small" style={{ marginTop: 6 }}>
        Demo account: demo@cherri.app / cherri-demo-2026
      </T>
      <View style={{ gap: 12, marginTop: 24 }}>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.inkFaint} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.inkFaint} secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} />
        {error !== null && <ErrorText error={error} />}
        <Button label={busy ? 'One sec…' : 'Log in'} onPress={() => void submit()} loading={busy} disabled={!email || !password} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { height: 54, borderRadius: 18, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16, color: colors.ink, outlineWidth: 0 },
});
