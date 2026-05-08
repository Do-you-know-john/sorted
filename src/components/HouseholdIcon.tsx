import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { householdAvatarMeta } from '../constants/avatars';

// All paths use viewBox "0 0 24 24"
// Stroke-based icons (fill="none"), strokeLinecap/join="round", strokeWidth=2 SVG units
const ICONS: Record<string, string[]> = {
  // House: peaked roof + walls + arched door
  house: [
    'M3 10L12 3L21 10V21H3V10',
    'M9 21V15H15V21',
  ],
  // Garden: round tree canopy + trunk
  garden: [
    'M12 21V13',
    'M12 13C9 13 7 10.5 7 8C7 5.5 9.2 3 12 3C14.8 3 17 5.5 17 8C17 10.5 15 13 12 13Z',
  ],
  // Building: rectangle + 4 windows + door
  building: [
    'M4 21V4H20V21H4',
    'M9 9H11M13 9H15M9 14H11M13 14H15',
    'M10 21V17H14V21',
  ],
  // Castle: main body + 3 battlements + arched gate
  castle: [
    'M4 21V8H20V21H4',
    'M5 8V5H8V8M10 8V5H14V8M16 8V5H19V8',
    'M10 21V15C10 13 14 13 14 15V21',
  ],
  // Hut: wide A-frame roof + walls + door
  hut: [
    'M1 13L12 2L23 13',
    'M4 13V21H20V13',
    'M9 21V16H15V21',
  ],
  // Tent: triangle + center seam + entry opening
  tent: [
    'M12 4L22 21H2L12 4Z',
    'M12 21V13',
    'M10 21L12 17L14 21',
  ],
  // Pine tree: two stacked triangle layers + trunk
  tree: [
    'M12 21V14',
    'M6 14L12 5L18 14H6Z',
    'M8 18L12 11L16 18H8Z',
  ],
  // Flower/sunflower: circle center + 8 petals as short lines
  sunflower: [
    'M12 15A3 3 0 1 0 12 9A3 3 0 1 0 12 15Z',
    'M12 3V6M12 18V21M3 12H6M18 12H21M5.6 5.6L7.8 7.8M16.2 16.2L18.4 18.4M5.6 18.4L7.8 16.2M16.2 7.8L18.4 5.6',
  ],
  // Wave: S-curve sine wave
  wave: [
    'M2 12C4.5 7 6.5 17 9 12C11.5 7 13.5 17 16 12C18.5 7 20.5 12 22 12',
  ],
  // Mountain: two peaks with valley
  mountain: [
    'M2 21L10 6L14 14L17 8L22 21H2',
  ],
  // Island/palm: curved ground + trunk + two fronds
  island: [
    'M3 20C6 16 9 18 12 19C15 20 18 16 21 20',
    'M12 19V11',
    'M12 11C10 9 7 8 8 5M12 11C14 9 17 8 16 5',
  ],
  // Rainbow: two concentric arcs
  rainbow: [
    'M3 19C3 12.4 7 7 12 7C17 7 21 12.4 21 19',
    'M7 19C7 14.2 9.5 11 12 11C14.5 11 17 14.2 17 19',
  ],
};

interface Props {
  avatarId?: string | null;
  size?: number;
}

export function HouseholdIcon({ avatarId, size = 40 }: Props) {
  const { color } = householdAvatarMeta(avatarId);
  const id = avatarId ?? 'house';
  const paths = ICONS[id] ?? ICONS.house;
  const radius = size * 0.26;

  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke="rgba(255,255,255,0.93)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}
