import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../theme';
import { tokenStorage } from '../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      setListErrorVisible(false);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API_URL}/users/me/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setListErrorVisible(true);
        setAddresses([]);
        return;
      }

      const data: any = await res.json();
      const list = data.data ?? data ?? [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log('Error loading addresses:', error);
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
      'Adresse löschen',
      'Möchtest du diese Adresse wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await tokenStorage.getAccessToken();
              const res = await fetch(`${API_URL}/users/me/addresses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                setAddresses(prev => prev.filter(a => a.id !== id));
              }
            } catch (error) {
              console.log('Error deleting address:', error);
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
      const token = await tokenStorage.getAccessToken();
      await fetch(`${API_URL}/users/me/addresses/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDefault: true })
      }).catch(() => ({}));
    } catch (error) {
      console.log('Error setting default:', error);
      loadAddresses(); // Revert on error
    }
  };

  const handleSave = async () => {
    if (!label || !street || !houseNumber || !postalCode || !city) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }

    try {
      setIsSaving(true);
      const token = await tokenStorage.getAccessToken();
      const payload = { label, street, houseNumber, postalCode, city, isDefault };
      
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${API_URL}/users/me/addresses/${editingId}` : `${API_URL}/users/me/addresses`;

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        Alert.alert('Fehler', 'Die Adresse konnte nicht gespeichert werden.');
        return;
      }

      setShowModal(false);
      await loadAddresses();
    } catch (error) {
      console.log('Error saving address:', error);
      Alert.alert('Fehler', 'Die Adresse konnte nicht gespeichert werden.');
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
              <Text style={styles.defaultBadgeText}>Standard</Text>
            </View>
          )}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.iconButton}>
            <Feather name="edit-2" size={18} color={colors.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeletePress(item.id)} style={[styles.iconButton, { marginLeft: 12 }]}>
            <Feather name="trash-2" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addressText}>{item.street} {item.houseNumber}</Text>
      <Text style={styles.addressText}>{item.postalCode} {item.city}</Text>

      {!item.isDefault && (
        <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.setDefaultButton}>
          <Text style={styles.setDefaultText}>Als Standard setzen</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Feather name="map-pin" size={64} color={colors.borderStrong} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Noch keine Adressen gespeichert</Text>
        <Text style={styles.emptySub}>Füge eine Adresse hinzu für mobile Services</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddPress}>
          <Text style={styles.emptyButtonText}>Adresse hinzufügen</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meine Adressen</Text>
        <View style={{ width: 40 }} />
      </View>

      {listErrorVisible && !isLoading && (
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
          <Text style={{ fontFamily: fonts.body, color: colors.error, fontSize: fontSizes.sm }}>
            Adressen konnten nicht geladen werden. Bitte erneut versuchen.
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
        <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
          <Feather name="plus" size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      {/* ADD/EDIT MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Adresse bearbeiten' : 'Adresse hinzufügen'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Bezeichnung</Text>
            <TextInput
              style={styles.input}
              placeholder="Zuhause, Arbeit, Eltern..."
              value={label}
              onChangeText={setLabel}
              placeholderTextColor={colors.textTertiary}
            />

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: spacing.md }]}>
                <Text style={styles.inputLabel}>Straße</Text>
                <TextInput
                  style={styles.input}
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Hausnummer</Text>
                <TextInput
                  style={styles.input}
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.md }]}>
                <Text style={styles.inputLabel}>PLZ</Text>
                <TextInput
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Stadt</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Als Standardadresse festlegen</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: '#EEEEEE', true: colors.teal }}
                thumbColor={colors.background}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Speichern</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { padding: spacing.xl, paddingBottom: 100 },

  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardLabel: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary, marginRight: spacing.sm },
  defaultBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  defaultBadgeText: { color: '#2E7D32', fontFamily: fonts.bodyBold, fontSize: 10 },
  
  actionsRow: { flexDirection: 'row' },
  iconButton: { padding: 4 },

  addressText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 2 },

  setDefaultButton: { marginTop: spacing.md },
  setDefaultText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { backgroundColor: colors.coral, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 24 },
  emptyButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  modalContent: { flex: 1, padding: spacing.lg },
  
  row: { flexDirection: 'row', marginBottom: spacing.md },
  inputGroup: { flex: 1 },
  
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  switchLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },

  modalFooter: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg },
  saveButton: { backgroundColor: colors.coral, paddingVertical: spacing.md, borderRadius: 24, alignItems: 'center' },
  saveButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
});
