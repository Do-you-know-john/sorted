import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../constants';

export function AvatarButton() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const initial = (appUser?.displayName ?? appUser?.email ?? '?')[0].toUpperCase();

  return (
    <TouchableOpacity
      style={styles.avatar}
      onPress={() => router.push('/(app)/profile')}
      hitSlop={8}
    >
      <Text style={styles.initial}>{initial}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
