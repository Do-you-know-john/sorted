export const EVENT_COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#0EA5E9',
  '#F97316',
  '#EC4899',
] as const;

export type EventColor = typeof EVENT_COLORS[number];
