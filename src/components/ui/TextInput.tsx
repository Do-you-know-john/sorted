import React, { useMemo } from 'react';
import { TextInput as RNTextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors, SPACING } from '../../constants';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: '500', color: c.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.card,
  },
  inputRowError: { borderColor: c.danger },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 16,
    color: c.text,
  },
  rightSlot: { paddingRight: SPACING.md },
  error: { fontSize: 12, color: c.danger },
});

export function TextInput({ label, error, style, rightElement, ...props }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <RNTextInput
          style={[
            styles.input,
            style,
            // Inline object placed last so iOS UIKit cannot override text/bg color
            { color: c.text, backgroundColor: 'transparent' },
          ]}
          placeholderTextColor={c.textSecondary}
          keyboardAppearance="light"
          {...props}
        />
        {rightElement && <View style={styles.rightSlot}>{rightElement}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
