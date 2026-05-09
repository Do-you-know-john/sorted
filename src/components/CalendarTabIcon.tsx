import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

interface Props {
  color: string;
  size?: number;
}

export function CalendarTabIcon({ color, size = 26 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Rect x="7" y="12" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="11" y="12" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="15" y="12" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="7" y="16" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="11" y="16" width="2" height="2" rx="0.5" fill={color} />
    </Svg>
  );
}
