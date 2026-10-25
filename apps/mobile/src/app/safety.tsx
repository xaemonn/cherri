import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, ErrorText, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { keys, useContacts, useHelp } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const digits = (phone: string) => phone.replace(/\D/g, '');
/** WhatsApp wants the country code and no "+"; assume India for 10-digit numbers. */
const whatsappNumber = (phone: string) => (digits(phone).length === 10 ? `91${digits(phone)}` : digits(phone));

/**
 * SOS that never pretends to dispatch anyone: it writes the message and opens her own SMS or
 * WhatsApp, so nothing is sent without her tap.
 */
export default function SafetyScreen() {
  const { user } = useAuth();
  const contacts = useContacts();
  const help = useHelp();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const list = contacts.data ?? [];

  function prepareSos() {
    Alert.alert('Prepare an SOS?', `A help message for ${list.map((c) => c.name).join(', ')}. You send it yourself.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => setMessage(`SOS from ${user?.name?.split(/\s+/)[0] ?? 'me'}: I need help, please call me or come now.`),
      },
    ]);
  }

  // iOS and Android disagree on how a message body is attached to an sms: link.
  const smsUrl = (body: string) => `sms:${list.map((c) => c.phone).join(',')}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`;

  return (
    <Screen bottomInset={60}>
      <T variant="title">Safety & SOS</T>
      <T style={{ marginTop: 6 }}>If you are in danger right now, call 112.</T>
      <Button label="📞 Call 112" variant="lime" style={{ marginTop: 14 }} onPress={() => void Linking.openURL('tel:112')} />

      <SectionTitle eyebrow="Trusted people" title="SOS message" />
      <Card style={{ gap: 10 }}>
        {list.length === 0 ? (
          <T variant="small">Add a trusted contact below to use SOS.</T>
        ) : message ? (
          <>
            <T>{message}</T>
            <T variant="small">To share where you are, add your location from Google Maps in the message. The web app attaches it for you.</T>
            <Button label="Text everyone" onPress={() => void Linking.openURL(smsUrl(message))} />
            {list.map((c) => (
              <Button
                key={c.id}
                label={`WhatsApp ${c.name}`}
                variant="outline"
                onPress={() => void Linking.openURL(`https://wa.me/${whatsappNumber(c.phone)}?text=${encodeURIComponent(message)}`)}
              />
            ))}
            <Button label="Done" variant="ghost" onPress={() => setMessage(null)} />
          </>
        ) : (
          <Button label="Prepare SOS message" onPress={prepareSos} />
        )}
      </Card>

      <SectionTitle title="Trusted contacts" />
      <View style={{ gap: 8 }}>
        {list.map((c) => (
          <Card key={c.id} style={styles.contact}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <T variant="small">{c.phone}</T>
            </View>
            <Pressable
              accessibilityLabel={`Remove ${c.name}`}
              onPress={async () => {
                await api.contacts.remove(c.id);
                await queryClient.invalidateQueries({ queryKey: keys.contacts });
              }}
            >
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </Card>
        ))}
        {list.length < 5 && (
          <Card style={{ gap: 8 }}>
            <TextInput value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Name" placeholderTextColor={colors.inkFaint} style={styles.input} />
            <TextInput
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.inkFaint}
              keyboardType="phone-pad"
              style={styles.input}
            />
            {error && <ErrorText error={new Error(error)} />}
            <Button
              label="Add contact"
              variant="outline"
              disabled={!form.name.trim() || !form.phone.trim()}
              onPress={async () => {
                setError(null);
                try {
                  await api.contacts.create({ name: form.name, phone: form.phone });
                  setForm({ name: '', phone: '' });
                  await queryClient.invalidateQueries({ queryKey: keys.contacts });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not add.');
                }
              }}
            />
          </Card>
        )}
      </View>

      <SectionTitle eyebrow="24×7, free" title="Helplines" />
      <View style={{ gap: 8 }}>
        {help.data?.helplines.map((h) => (
          <Pressable key={h.number} onPress={() => void Linking.openURL(`tel:${h.number}`)}>
            <Card tone="sunshine" style={styles.contact}>
              <Text style={styles.number}>{h.number}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{h.name}</Text>
                <T variant="small">{h.description}</T>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  number: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, minWidth: 64 },
  remove: { fontFamily: fonts.bold, fontSize: 14, color: colors.cherryDeep },
  input: { height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, outlineWidth: 0 },
});
