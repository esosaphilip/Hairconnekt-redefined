import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, borderRadius } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { API } from '../../../utils/api';

export default function ProviderServiceEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    durationMin: 60,
    priceType: 'fixed',
    price: '',
    isActive: true
  });
  
  const [errors, setErrors] = useState<any>({});
  const [httpError, setHttpError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const catRes = await fetch(`${API}/services/categories`);
      let fetchedCategories = [];
      if (catRes.ok) {
        const catData = await catRes.json();
        fetchedCategories = catData.data || catData;
        setCategories(fetchedCategories);
      }

      if (!isNew) {
        const token = await tokenStorage.getAccessToken();
        const svcRes = await fetch(`${API}/providers/me/services`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (svcRes.ok) {
          const allServices = await svcRes.json();
          const target = allServices.find((s: any) => s.id === id);
          if (target) {
            setForm({
              name: target.name,
              categoryId: target.categoryId,
              description: target.description || '',
              durationMin: target.durationMin,
              priceType: target.priceType,
              price: target.price.toString(),
              isActive: target.isActive
            });
          }
        }
      } else if (fetchedCategories.length > 0) {
        setForm(f => ({ ...f, categoryId: fetchedCategories[0].id }));
      }
    } catch (e) {
      console.log('Error loading form data', e);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrs: any = {};
    if (!form.name.trim()) newErrs.name = 'Pflichtfeld';
    if (!form.categoryId) newErrs.categoryId = 'Bitte wählen';
    if (!form.durationMin || form.durationMin <= 0) newErrs.durationMin = 'Ungültig';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) newErrs.price = 'Gültigen Preis eingeben';
    
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setHttpError('');
    
    try {
      const token = await tokenStorage.getAccessToken();
      
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        description: form.description.trim() || undefined,
        durationMin: Number(form.durationMin),
        priceType: form.priceType,
        price: Number(form.price),
        isActive: form.isActive
      };

      const url = isNew ? `${API}/providers/me/services` : `${API}/providers/me/services/${id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Speichern fehlgeschlagen. Bitte überprüfen.');
      }
      
      router.back();
    } catch (error: any) {
      setHttpError(error.message || 'Netzwerkfehler');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Service hinzufügen' : 'Service bearbeiten'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {httpError ? (
          <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{httpError}</Text></View>
        ) : null}

        <Text style={styles.label}>Kategorie <Text style={styles.required}>*</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.sm }}>
          {categories.map(c => (
            <TouchableOpacity 
              key={c.id} 
              style={[styles.chip, form.categoryId === c.id && styles.chipActive]}
              onPress={() => setForm(f => ({ ...f, categoryId: c.id }))}
            >
              <Text style={[styles.chipText, form.categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}

        <Text style={styles.label}>Service-Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={form.name}
          onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
          maxLength={100}
          placeholder="z.B. Knotless Braids"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={styles.label}>Beschreibung (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
          maxLength={500}
          multiline
          numberOfLines={4}
          placeholder="Infos für den Kunden"
        />

        <Text style={styles.label}>Dauer (Minuten) <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.durationMin && styles.inputError]}
          value={form.durationMin.toString()}
          onChangeText={(v) => setForm(f => ({ ...f, durationMin: parseInt(v) || 0 }))}
          keyboardType="number-pad"
        />
        <Text style={styles.helperText}>≈ {Math.floor(form.durationMin / 60)} Std. {form.durationMin % 60 ? `${form.durationMin % 60} Min.` : ''}</Text>

        <Text style={styles.label}>Preis-Typ <Text style={styles.required}>*</Text></Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segment, form.priceType === 'fixed' && styles.segmentActive]}
            onPress={() => setForm(f => ({ ...f, priceType: 'fixed' }))}
          ><Text style={[styles.segmentText, form.priceType === 'fixed' && styles.segmentTextActive]}>Festpreis</Text></TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, form.priceType === 'from' && styles.segmentActive]}
            onPress={() => setForm(f => ({ ...f, priceType: 'from' }))}
          ><Text style={[styles.segmentText, form.priceType === 'from' && styles.segmentTextActive]}>Ab-Preis</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>Preis (€) <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.price && styles.inputError]}
          value={form.price}
          onChangeText={(v) => setForm(f => ({ ...f, price: v.replace(/[^0-9.]/g, '') }))}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Aktiv</Text>
            <Text style={styles.toggleHelper}>Kunden können diesen Service buchen</Text>
          </View>
          <Switch
            value={form.isActive}
            onValueChange={(v) => setForm(f => ({ ...f, isActive: v }))}
            trackColor={{ false: colors.borderStrong, true: '#2E7D32' }}
            thumbColor="#fff"
          />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <View style={{ width: '100%' }}>
          <PrimaryButton 
            label={saving ? 'Speichert...' : 'Speichern'} 
            onPress={handleSave} 
            disabled={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  errorBanner: { backgroundColor: '#FFEBEE', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  errorBannerText: { color: colors.error, fontFamily: fonts.bodyMedium },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8, marginTop: spacing.md },
  required: { color: colors.error },
  inputContainer: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: borderRadius.md, backgroundColor: '#FAFAFA' },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: borderRadius.md, padding: spacing.md, backgroundColor: '#FAFAFA', fontFamily: fonts.body, fontSize: 16 },
  inputError: { borderColor: colors.error, backgroundColor: '#FFEBEE' },
  errorText: { color: colors.error, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  textArea: { height: 100, textAlignVertical: 'top' },
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 4 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: borderRadius.md, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: borderRadius.md - 2 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  segmentText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
  toggleHelper: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: colors.coralLight, borderColor: colors.coral },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  chipTextActive: { color: colors.coral },
});
