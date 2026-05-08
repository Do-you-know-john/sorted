import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { HouseholdMember } from '../types';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { Colors, SPACING } from '../constants';

interface Props {
  label: string;
  members: HouseholdMember[];
  selected: string | null;
  onChange: (uid: string | null) => void;
  currentUserUid?: string;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  fieldLabel: {
    fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACING.xs,
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: c.border, borderRadius: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    backgroundColor: c.card,
  },
  triggerText: { fontSize: 15, color: c.text, flex: 1 },
  triggerEmpty: { color: c.textSecondary },
  chevron: { fontSize: 14, color: c.textSecondary, marginLeft: SPACING.sm },

  overlay: { flex: 1 },
  dropdown: {
    position: 'absolute',
    backgroundColor: c.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  rowText: { flex: 1, fontSize: 15, color: c.text },
  noneText: { color: c.textSecondary },
  checkMark: { fontSize: 16, fontWeight: '700', color: c.primary },
});

export function AssigneePicker({ label, members, selected, onChange, currentUserUid }: Props) {
  const { t } = useTranslation();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  function handleOpen() {
    triggerRef.current?.measure((_fx, _fy, width, height, px, py) => {
      setDropdownStyle({ top: py + height + 4, left: px, width });
      setOpen(true);
    });
  }

  function handleSelect(uid: string | null) {
    onChange(uid);
    setOpen(false);
  }

  const selectedMember = members.find((m) => m.uid === selected);
  const triggerLabel = selectedMember?.displayName ?? '—';

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        ref={triggerRef}
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerText, !selectedMember && styles.triggerEmpty]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[styles.dropdown, { top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }]}
          >
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {/* None option */}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowText, styles.noneText]}>—</Text>
                {selected === null && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {members.map((m) => {
                const isSelected = m.uid === selected;
                const isMe = m.uid === currentUserUid;
                return (
                  <TouchableOpacity
                    key={m.uid}
                    style={styles.row}
                    onPress={() => handleSelect(m.uid)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      avatarId={m.avatarId}
                      photoURL={m.photoURL}
                      avatarColor={(m as any).avatarColor}
                      name={m.displayName}
                      size={28}
                    />
                    <Text style={styles.rowText} numberOfLines={1}>
                      {m.displayName}
                      {isMe ? `  ${t('household.you')}` : ''}
                    </Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
