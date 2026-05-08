import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { HouseholdMember } from '../types';
import { Avatar } from './Avatar';
import { COLORS, SPACING } from '../constants';

interface Props {
  label: string;
  members: HouseholdMember[];
  selected: string | null;
  onChange: (uid: string | null) => void;
  currentUserUid?: string;
}

export function AssigneePicker({ label, members, selected, onChange, currentUserUid }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleSelect(uid: string | null) {
    onChange(uid);
    setOpen(false);
  }

  const selectedMember = members.find((m) => m.uid === selected);
  const triggerLabel = selectedMember?.displayName ?? '—';

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text
          style={[styles.triggerText, !selectedMember && styles.triggerEmpty]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.closeBtn}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {/* None option */}
              <TouchableOpacity
                style={styles.memberRow}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarPlaceholder} />
                <Text style={[styles.memberName, styles.noneText]}>—</Text>
                {selected === null && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {members.map((m) => {
                const isSelected = m.uid === selected;
                const isMe = m.uid === currentUserUid;
                return (
                  <TouchableOpacity
                    key={m.uid}
                    style={styles.memberRow}
                    onPress={() => handleSelect(m.uid)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      avatarId={m.avatarId}
                      photoURL={m.photoURL}
                      avatarColor={(m as any).avatarColor}
                      name={m.displayName}
                      size={36}
                    />
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.displayName}
                      {isMe ? `  ${t('household.you')}` : ''}
                    </Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs,
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
  },
  triggerText: { fontSize: 15, color: COLORS.text, flex: 1 },
  triggerEmpty: { color: COLORS.textSecondary },
  chevron: { fontSize: 14, color: COLORS.textSecondary, marginLeft: SPACING.sm },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  closeBtn: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatarPlaceholder: { width: 36, height: 36 },
  memberName: { flex: 1, fontSize: 15, color: COLORS.text },
  noneText: { color: COLORS.textSecondary },
  checkMark: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
});
