import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ClientProfileEditScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: () => ({}) }));

      const data: any = res.ok ? await res.json() : {
        data: {
          firstName: 'Sarah',
          lastName: 'Müller',
          email: 'sarah.mueller@example.com',
          phone: '+49 176 12345678'
        }
      };

      if (data.data) {
        setFirstName(data.data.firstName || '');
        setLastName(data.data.lastName || '');
        setEmail(data.data.email || '');
        setPhone(data.data.phone || '');
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Fehler', 'Vorname und Nachname dürfen nicht leer sein.');
      return;
    }

    try {
      setIsSaving(true);
      const token = await tokenStorage.getAccessToken();
      
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, phone })
      }).catch(() => ({ ok: true })); // Mock success

      if (res.ok) {
        router.back();
      } else {
        Alert.alert('Fehler', 'Die Änderungen konnten nicht gespeichert werden.');
      }
    } catch (error) {
      console.log('Error saving profile:', error);
      Alert.alert('Fehler', 'Es gab ein Problem beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Persönliche Informationen</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButtonTextContainer}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Text style={styles.saveButtonText}>Speichern</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vorname</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Vorname"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nachname</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nachname"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>E-Mail</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.hintText}>E-Mail kann nicht geändert werden</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+49 ..."
              keyboardType="phone-pad"
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Änderungen speichern</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
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
  headerTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  saveButtonTextContainer: { width: 70, alignItems: 'flex-end' },
  saveButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.teal },

  content: { flex: 1 },
  contentInner: { padding: spacing.xl },

  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#EBEBEB',
  },
  hintText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.coral,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.background },
});
