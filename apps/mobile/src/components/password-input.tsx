import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

/** A secure text field with a show/hide eye button. */
export function PasswordInput({ style, containerStyle, iconColor = colors.inkSoft, ...props }: TextInputProps & { containerStyle?: StyleProp<ViewStyle>; iconColor?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput {...props} secureTextEntry={!visible} style={[style, { paddingRight: 48 }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={styles.eye}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'stretch' },
  eye: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
});
