import React, { useMemo } from 'react';
import { TextInput as RNTextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors, SPACING } from '../../constants';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: '500', color: c.text },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.card,
  },
  inputError: { borderColor: c.danger },
  error: { fontSize: 12, color: c.danger },
});

export function TextInput({ label, error, style, ...props }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
          // Inline object placed last so iOS UIKit cannot override text/bg color
          { color: c.text, backgroundColor: c.card },
        ]}
        placeholderTextColor={c.textSecondary}
        keyboardAppearance="light"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
