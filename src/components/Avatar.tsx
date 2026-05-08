import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { emojiForAvatar } from '../constants/avatars';
import { COLORS } from '../constants';

interface AvatarProps {
  avatarId?: string | null;
  photoURL?: string | null;
  name?: string | null;
  size?: number;
  selfHighlight?: boolean;
}

export function Avatar({ avatarId, photoURL, name, size = 34, selfHighlight = false }: AvatarProps) {
  const radius = size / 2;
  const emoji = emojiForAvatar(avatarId);

  if (photoURL) {
    return (
      <View style={[
        styles.ring,
        { width: size, height: size, borderRadius: radius },
        selfHighlight && styles.selfRing,
      ]}>
        <Image
          source={{ uri: photoURL }}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      </View>
    );
  }

  const bg = selfHighlight ? COLORS.primary : COLORS.primaryLight;
  const initial = (name ?? '?')[0].toUpperCase();

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
      {emoji ? (
        <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.7 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42, color: selfHighlight ? COLORS.white : COLORS.primary }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  ring: { borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  selfRing: { borderColor: COLORS.primary },
  initial: { fontWeight: '700' },
});
