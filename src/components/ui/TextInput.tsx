import React from 'react';
import { TextInput as RNTextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
          // Inline object placed last so iOS UIKit cannot override text/bg color
          { color: COLORS.text, backgroundColor: COLORS.white },
        ]}
        placeholderTextColor={COLORS.textSecondary}
        keyboardAppearance="light"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputError: { borderColor: COLORS.danger },
  error: { fontSize: 12, color: COLORS.danger },
});
