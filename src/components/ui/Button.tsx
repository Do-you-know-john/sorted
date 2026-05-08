import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function Button({ label, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const bg =
    variant === 'danger' ? COLORS.danger :
    variant === 'secondary' ? COLORS.primaryLight :
    COLORS.primary;

  const textColor =
    variant === 'secondary' ? COLORS.primary : COLORS.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
