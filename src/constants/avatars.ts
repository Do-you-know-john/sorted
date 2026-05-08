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
