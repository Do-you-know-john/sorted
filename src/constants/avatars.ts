export const AVATAR_COLORS = [
  { id: 'indigo',  bg: '#4F46E5' },
  { id: 'rose',    bg: '#F43F5E' },
  { id: 'orange',  bg: '#F97316' },
  { id: 'amber',   bg: '#F59E0B' },
  { id: 'emerald', bg: '#10B981' },
  { id: 'teal',    bg: '#14B8A6' },
  { id: 'sky',     bg: '#0EA5E9' },
  { id: 'violet',  bg: '#7C3AED' },
  { id: 'pink',    bg: '#EC4899' },
  { id: 'slate',   bg: '#64748B' },
] as const;

export type AvatarColorId = (typeof AVATAR_COLORS)[number]['id'];

export function bgForColor(id: string | null | undefined): string | null {
  if (!id) return null;
  return AVATAR_COLORS.find((c) => c.id === id)?.bg ?? null;
}

export const HOUSEHOLD_AVATARS = [
  { id: 'house',     color: '#4F46E5' },
  { id: 'garden',    color: '#10B981' },
  { id: 'building',  color: '#64748B' },
  { id: 'castle',    color: '#7C3AED' },
  { id: 'hut',       color: '#F97316' },
  { id: 'tent',      color: '#F59E0B' },
  { id: 'tree',      color: '#16A34A' },
  { id: 'sunflower', color: '#EF4444' },
  { id: 'wave',      color: '#0EA5E9' },
  { id: 'mountain',  color: '#6B7280' },
  { id: 'island',    color: '#14B8A6' },
  { id: 'rainbow',   color: '#EC4899' },
] as const;

export type HouseholdAvatarId = (typeof HOUSEHOLD_AVATARS)[number]['id'];

export function householdAvatarMeta(id: string | null | undefined): { color: string } {
  return HOUSEHOLD_AVATARS.find((a) => a.id === id) ?? HOUSEHOLD_AVATARS[0];
}

export const PRESET_AVATARS = [
  { id: 'bear',      emoji: '🐻' },
  { id: 'fox',       emoji: '🦊' },
  { id: 'panda',     emoji: '🐼' },
  { id: 'lion',      emoji: '🦁' },
  { id: 'tiger',     emoji: '🐯' },
  { id: 'koala',     emoji: '🐨' },
  { id: 'frog',      emoji: '🐸' },
  { id: 'penguin',   emoji: '🐧' },
  { id: 'butterfly', emoji: '🦋' },
  { id: 'blossom',   emoji: '🌸' },
  { id: 'rocket',    emoji: '🚀' },
  { id: 'star',      emoji: '⭐' },
] as const;

export type PresetAvatarId = (typeof PRESET_AVATARS)[number]['id'];

export function emojiForAvatar(id: string | null | undefined): string | null {
  if (!id) return null;
  return PRESET_AVATARS.find((a) => a.id === id)?.emoji ?? null;
}
