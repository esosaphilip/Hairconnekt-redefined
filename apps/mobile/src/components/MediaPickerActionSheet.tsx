import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../theme';

interface Props {
  visible: boolean;
  onPickImage: () => void;
  onPickDocument: () => void;
  onCancel: () => void;
}

export function MediaPickerActionSheet({
  visible,
  onPickImage,
  onPickDocument,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Anhang hinzufügen</Text>

          <TouchableOpacity style={styles.option} onPress={onPickImage}>
            <View style={[styles.iconCircle, { backgroundColor: colors.coralLight }]}>
              <Feather name="image" size={22} color={colors.coral} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Foto senden</Text>
              <Text style={styles.optionSub}>Zeige deinen gewünschten Stil</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onPickDocument}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5F4' }]}>
              <Feather name="file-text" size={22} color={colors.teal} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Dokument senden</Text>
              <Text style={styles.optionSub}>PDF-Dateien</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 34,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSub: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.error,
  },
});

