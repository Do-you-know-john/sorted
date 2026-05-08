import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors, SPACING } from '../../constants';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

const makeStyles = (c: Colors) => StyleSheet.create({
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

export function Button({ label, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const bg =
    variant === 'danger' ? c.danger :
    variant === 'secondary' ? c.primaryLight :
    c.primary;

  const textColor =
    variant === 'secondary' ? c.primary : c.white;

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
