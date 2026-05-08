import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import { useAllHouseholds } from '../hooks/useAllHouseholds';
import { emojiForHouseholdAvatar } from '../constants/avatars';
import { db } from '../services/firebase';
import { useTheme } from '../hooks/useTheme';
import { Colors, SPACING } from '../constants';

interface Props {
  /** Visual weight of the trigger — 'large' for the household tab header, 'normal' for todos */
  size?: 'normal' | 'large';
}

const makeStyles = (c: Colors) => StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 10, maxWidth: 220,
  },
  triggerLarge: { maxWidth: '100%' },
  triggerEmoji: { fontSize: 18 },
  triggerEmojiLarge: { fontSize: 28 },
  triggerName: { fontSize: 17, fontWeight: '700', color: c.text, flexShrink: 1 },
  triggerNameLarge: { fontSize: 24, fontWeight: '800' },
  chevron: { fontSize: 13, color: c.textSecondary, marginLeft: 2 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start', paddingTop: 100,
    paddingHorizontal: SPACING.md,
  },
  sheet: {
    backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', maxHeight: 320,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  itemActive: { backgroundColor: c.primaryLight },
  itemEmoji: { fontSize: 22 },
  itemName: { flex: 1, fontSize: 16, fontWeight: '500', color: c.text },
  itemNameActive: { color: c.primary, fontWeight: '700' },
  check: { fontSize: 16, color: c.primary, fontWeight: '700' },
});

export function HouseholdSwitcher({ size = 'normal' }: Props) {
  const appUser = useAuthStore((s) => s.appUser);
  const households = useAllHouseholds(appUser?.householdIds ?? []);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const current = households.find((h) => h.id === appUser?.activeHouseholdId);
  const canSwitch = households.length > 1;

  async function handleSwitch(householdId: string) {
    if (!appUser || householdId === appUser.activeHouseholdId) { setOpen(false); return; }
    setSwitching(true);
    setOpen(false);
    try {
      await updateDoc(doc(db, 'users', appUser.uid), { activeHouseholdId: householdId });
    } finally {
      setSwitching(false);
    }
  }

  if (!current) return null;

  const emoji = emojiForHouseholdAvatar(current.avatarId);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, size === 'large' && styles.triggerLarge]}
        onPress={() => canSwitch && setOpen(true)}
        activeOpacity={canSwitch ? 0.7 : 1}
        disabled={!canSwitch}
      >
        <Text style={[styles.triggerEmoji, size === 'large' && styles.triggerEmojiLarge]}>
          {emoji}
        </Text>
        <Text
          style={[styles.triggerName, size === 'large' && styles.triggerNameLarge]}
          numberOfLines={1}
        >
          {current.name}
        </Text>
        {switching
          ? <ActivityIndicator size="small" color={c.primary} style={{ marginLeft: 4 }} />
          : canSwitch
            ? <Text style={styles.chevron}>▾</Text>
            : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView bounces={false}>
              {households.map((h) => {
                const isActive = h.id === appUser?.activeHouseholdId;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => handleSwitch(h.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemEmoji}>{emojiForHouseholdAvatar(h.avatarId)}</Text>
                    <Text style={[styles.itemName, isActive && styles.itemNameActive]} numberOfLines={1}>
                      {h.name}
                    </Text>
                    {isActive && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
