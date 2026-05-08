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
  selected: string[];
  onChange: (uids: string[]) => void;
  currentUserUid?: string;
}

export function AssigneePicker({ label, members, selected, onChange, currentUserUid }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  function handleOpen() {
    setDraft(selected);
    setOpen(true);
  }

  function handleToggle(uid: string) {
    setDraft((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  }

  function handleConfirm() {
    onChange(draft);
    setOpen(false);
  }

  const triggerLabel = selected.length === 0
    ? '—'
    : selected
        .map((uid) => members.find((m) => m.uid === uid)?.displayName ?? uid)
        .join(', ');

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={handleOpen} activeOpacity={0.7}>
        <Text
          style={[styles.triggerText, selected.length === 0 && styles.triggerEmpty]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleConfirm}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={handleConfirm} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
                <Text style={styles.doneBtn}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {members.map((m) => {
                const checked = draft.includes(m.uid);
                const isMe = m.uid === currentUserUid;
                return (
                  <TouchableOpacity
                    key={m.uid}
                    style={styles.memberRow}
                    onPress={() => handleToggle(m.uid)}
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
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkMark}>✓</Text>}
                    </View>
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
  doneBtn: { fontSize: 16, fontWeight: '600', color: COLORS.primary },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  memberName: { flex: 1, fontSize: 15, color: COLORS.text },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkMark: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
});
