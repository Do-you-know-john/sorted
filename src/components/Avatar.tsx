import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { emojiForAvatar, bgForColor } from '../constants/avatars';
import { useTheme } from '../hooks/useTheme';
import { Colors } from '../constants';

interface AvatarProps {
  avatarId?: string | null;
  photoURL?: string | null;
  avatarColor?: string | null;
  name?: string | null;
  size?: number;
  selfHighlight?: boolean;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  ring: { borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  selfRing: { borderColor: c.primary },
  initial: { fontWeight: '700' },
});

export function Avatar({
  avatarId, photoURL, avatarColor, name, size = 34, selfHighlight = false,
}: AvatarProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const radius = size / 2;
  const emoji = emojiForAvatar(avatarId);
  const customBg = bgForColor(avatarColor);

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

  // Custom color overrides the indigo default; selfHighlight acts as fallback when no custom color
  const bg = customBg ?? (selfHighlight ? c.primary : c.primaryLight);
  const hasColor = !!customBg || selfHighlight;
  const initial = (name ?? '?')[0].toUpperCase();

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
      {emoji ? (
        <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.7 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42, color: hasColor ? c.white : c.primary }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}
