import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, fonts, fontSizes, spacing } from '../theme';

interface Props {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  locale?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function DateTimePickerModal({
  visible,
  mode,
  value,
  minimumDate,
  locale,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props): React.ReactElement | null {
  const [tempDate, setTempDate] = useState<Date>(value);

  useEffect(() => {
    setTempDate(value);
  }, [value, visible]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android' && event?.type === 'dismissed') {
      onCancel();
      return;
    }
    if (!selected) return;
    setTempDate(selected);
    if (Platform.OS === 'android') {
      onConfirm(selected);
    }
  };

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={tempDate}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={onCancel} style={styles.toolbarBtn}>
              <Text style={styles.cancelText}>{cancelLabel ?? 'Abbrechen'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(tempDate)} style={styles.toolbarBtn}>
              <Text style={styles.confirmText}>{confirmLabel ?? 'Fertig'}</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            onChange={handleChange}
            locale={locale}
            textColor={colors.textPrimary as any}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.xl + spacing.xxxs,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarBtn: { padding: spacing.xs },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  confirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
});
