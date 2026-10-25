import type { ConsultEmergency } from '@cherri/shared';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

/** The red alert shown instead of queueing an emergency for a doctor's reply. */
export function EmergencyBox({ emergency, onAcknowledge }: { emergency: ConsultEmergency; onAcknowledge?: () => void }) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>{emergency.title}</Text>
      <Text style={styles.text}>{emergency.message}</Text>
      {emergency.helplines.map((h) => (
        <Pressable key={h.number} onPress={() => void Linking.openURL(`tel:${h.number}`)} style={styles.call}>
          <Text style={styles.callText}>
            Call {h.number} · {h.name}
          </Text>
        </Pressable>
      ))}
      {onAcknowledge && (
        <Pressable onPress={onAcknowledge}>
          <Text style={styles.ack}>I am safe now / I have had emergency care. Resume the chat</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#FEE4E2', borderColor: '#B42318', borderWidth: 2, borderRadius: 20, padding: 14, gap: 8 },
  title: { color: '#7A1D14', fontWeight: '800', fontSize: 16, textTransform: 'uppercase' },
  text: { color: '#7A1D14', fontSize: 15 },
  call: { backgroundColor: '#B42318', borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  callText: { color: '#fff', fontWeight: '700' },
  ack: { color: '#7A1D14', fontWeight: '700', textDecorationLine: 'underline' },
});
