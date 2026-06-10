import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch, ScrollView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../theme';
import { apiFetch, apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';


interface Address {
  id: string;
  label: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  isDefault: boolean;
}

export default function AddressesScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const backLabel = t('back');
  const addLabel = t('addressesAdd');
  const closeLabel = t('close');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listErrorVisible, setListErrorVisible] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [label, setLabel] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const labelRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const houseNumberRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      setListErrorVisible(false);
      const data: any = await apiJson('/users/me/addresses', { auth: true });
      const list = data.data ?? data ?? [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch (error) {
      debugError('Address list load failed', error);
      setListErrorVisible(true);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPress = () => {
    setEditingId(null);
    setLabel('');
    setStreet('');
    setHouseNumber('');
    setPostalCode('');
    setCity('');
    setIsDefault(addresses.length === 0); // Make default if it's the first one
    setShowModal(true);
  };

  const handleEditPress = (address: Address) => {
    setEditingId(address.id);
    setLabel(address.label);
    setStreet(address.street);
    setHouseNumber(address.houseNumber);
    setPostalCode(address.postalCode);
    setCity(address.city);
    setIsDefault(address.isDefault);
    setShowModal(true);
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      t('addressesDeleteTitle'),
      t('addressesDeleteBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiFetch(`/users/me/addresses/${id}`, { auth: true, method: 'DELETE' });

              if (res.ok) {
                setAddresses(prev => prev.filter(a => a.id !== id));
              }
            } catch (error) {
              debugError('Address delete failed', error);
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (id: string) => {
    // Optimistic update
    setAddresses(prev => prev.map(a => ({
      ...a,
      isDefault: a.id === id
    })));

    try {
      await apiFetch(`/users/me/addresses/${id}`, {
        auth: true,
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDefault: true })
      }).catch(() => ({}));
    } catch (error) {
      debugError('Address default update failed', error);
      loadAddresses(); // Revert on error
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!label || !street || !houseNumber || !postalCode || !city) {
      Alert.alert(t('error'), t('addressesFillAllFields'));
      return;
    }

    try {
      setIsSaving(true);
      const payload = { label, street, houseNumber, postalCode, city, isDefault };
      
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `/users/me/addresses/${editingId}` : `/users/me/addresses`;

      await apiJson(url, {
        auth: true,
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      await loadAddresses();
    } catch (error) {
      debugError('Address save failed', error);
      Alert.alert(t('error'), t('addressesSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Address }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.labelRow}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('addressesDefault')}</Text>
            </View>
          )}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`${t('edit')}: ${item.label}`}>
            <Feather name="edit-2" size={fontSizes.lg} color={colors.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeletePress(item.id)} style={[styles.iconButton, { marginLeft: spacing.sm }]} accessibilityRole="button" accessibilityLabel={`${t('delete')}: ${item.label}`}>
            <Feather name="trash-2" size={fontSizes.lg} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addressText}>{item.street} {item.houseNumber}</Text>
      <Text style={styles.addressText}>{item.postalCode} {item.city}</Text>

      {!item.isDefault && (
        <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.setDefaultButton}>
          <Text style={styles.setDefaultText}>{t('addressesSetDefault')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
    return (
      <View style={styles.emptyContainer}>
        <Feather name="map-pin" size={spacing.xxxl} color={colors.borderStrong} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>{t('addressesEmpty')}</Text>
        <Text style={styles.emptySub}>{t('addressesEmptySub')}</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddPress}>
          <Text style={styles.emptyButtonText}>{t('addressesAdd')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={backLabel}>
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addressesTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      {listErrorVisible && !isLoading && (
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
          <Text style={{ fontFamily: fonts.body, color: colors.error, fontSize: fontSizes.sm }}>
            {t('addressesLoadError')}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={addresses.length === 0 ? { flex: 1 } : styles.listContent}
        />
      )}

      {addresses.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddPress} accessibilityRole="button" accessibilityLabel={addLabel}>
          <Feather name="plus" size={fontSizes.xxl} color={colors.background} />
        </TouchableOpacity>
      )}

      {/* ADD/EDIT MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? t('addressesEdit') : t('addressesAdd')}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} accessibilityRole="button" accessibilityLabel={closeLabel}>
              <Feather name="x" size={fontSizes.xxl} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.inputLabel}>{t('addressesLabel')}</Text>
            <TextInput
              ref={labelRef}
              style={styles.input}
              placeholder={t('addressesLabelPlaceholder')}
              value={label}
              onChangeText={setLabel}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => streetRef.current?.focus()}
            />

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: spacing.md }]}>
                <Text style={styles.inputLabel}>{t('addressesStreet')}</Text>
                <TextInput
                  ref={streetRef}
                  style={styles.input}
                  value={street}
                  onChangeText={setStreet}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => houseNumberRef.current?.focus()}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('addressesHouseNumber')}</Text>
                <TextInput
                  ref={houseNumberRef}
                  style={styles.input}
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => postalCodeRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.md }]}>
                <Text style={styles.inputLabel}>{t('addressesPostalCode')}</Text>
                <TextInput
                  ref={postalCodeRef}
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  inputMode="numeric"
                  maxLength={5}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => cityRef.current?.focus()}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>{t('addressesCity')}</Text>
                <TextInput
                  ref={cityRef}
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('addressesSetDefaultToggle')}</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: colors.border, true: colors.teal }}
                thumbColor={colors.background}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>{t('addressesSave')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { padding: spacing.xl, paddingBottom: spacing.xxxxxl },

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: spacing.unit,
    borderColor: colors.surfaceAlt,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginRight: spacing.sm },
  defaultBadge: { backgroundColor: colors.greenLight, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs },
  defaultBadgeText: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: fontSizes.xxs },
  
  actionsRow: { flexDirection: 'row' },
  iconButton: { padding: spacing.xxs },

  addressText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xxxs },

  setDefaultButton: { marginTop: spacing.md },
  setDefaultText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: layout.fabSize / 2,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { backgroundColor: colors.coral, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  emptyButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  modalContent: { flex: 1 },
  modalContentContainer: { padding: spacing.lg },
  
  row: { flexDirection: 'row', marginBottom: spacing.md },
  inputGroup: { flex: 1 },
  
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  switchLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },

  modalFooter: { padding: spacing.lg, borderTopWidth: spacing.unit, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? layout.iconButton : spacing.lg },
  saveButton: { backgroundColor: colors.coral, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  saveButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
});
