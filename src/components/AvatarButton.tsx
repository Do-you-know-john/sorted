import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Avatar } from './Avatar';

export function AvatarButton() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/profile')}
      hitSlop={8}
    >
      <Avatar
        avatarId={appUser?.avatarId}
        photoURL={appUser?.photoURL}
        name={appUser?.displayName ?? appUser?.email}
        size={34}
        selfHighlight
      />
    </TouchableOpacity>
  );
}
