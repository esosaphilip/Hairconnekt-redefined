import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProviderServiceEditScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const serviceId = Array.isArray(id) ? id[0] : id;

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
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [errorAction, setErrorAction] = useState<'load' | 'save'>('load');
  const nameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const durationRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorVisible(false);
      const catRes = await apiJson<any>('/services/categories', { timeoutMs: 20000, retryCount: 1 });
      const fetchedCategories = Array.isArray(catRes?.data ?? catRes) ? (catRes?.data ?? catRes) : [];
      setCategories(fetchedCategories);

      if (!isNew && serviceId) {
        const allServices = await apiJson<any>('/providers/me/services', { auth: true, timeoutMs: 20000, retryCount: 1 });
        const svcList = Array.isArray(allServices?.data ?? allServices) ? (allServices?.data ?? allServices) : [];
        const target = svcList.find((s: any) => s.id === serviceId);
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
      } else if (fetchedCategories.length > 0) {
        setForm(f => ({ ...f, categoryId: fetchedCategories[0].id }));
      }
    } catch (e) {
      setErrorAction('load');
      setErrorStatus((e as any)?.status ?? (e as any)?.response?.status);
      setErrorMessage((e as any)?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrs: any = {};
    if (!form.name.trim()) newErrs.name = t('fieldRequired');
    if (!form.categoryId) newErrs.categoryId = t('selectPlease');
    if (!form.durationMin || form.durationMin <= 0) newErrs.durationMin = t('invalidValue');
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) newErrs.price = t('enterValidPrice');
    
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setSaving(true);
    setErrorVisible(false);
    
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        description: form.description.trim() || undefined,
        durationMin: Number(form.durationMin),
        priceType: form.priceType,
        price: Number(form.price),
        isActive: form.isActive
      };

      const url = isNew ? `/providers/me/services` : `/providers/me/services/${serviceId}`;
      const method = isNew ? 'POST' : 'PATCH';

      await apiJson<any>(url, {
        method,
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 20000,
      });
      
      router.back();
    } catch (error: any) {
      setErrorAction('save');
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
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
        <Text style={styles.headerTitle}>{isNew ? t('servicesAdd') : t('servicesEdit')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GermanErrorBanner
            visible={errorVisible}
            statusCode={errorStatus}
            message={errorMessage}
            actionLabel={t('appointmentsRetry')}
            onAction={errorAction === 'save' ? handleSave : loadData}
          />

          <Text style={styles.label}>
            {t('serviceCategory')} <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.sm }}
          >
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, form.categoryId === c.id && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, categoryId: c.id }))}
              >
                <Text style={[styles.chipText, form.categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}

          <Text style={styles.label}>
            {t('serviceName')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            ref={nameRef}
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            maxLength={100}
            placeholder={t('serviceNamePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>{t('serviceDescriptionOptional')}</Text>
          <TextInput
            ref={descriptionRef}
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            maxLength={500}
            multiline
            numberOfLines={4}
            placeholder={t('serviceDescriptionPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => durationRef.current?.focus()}
          />

          <Text style={styles.label}>
            {t('serviceDurationMinutes')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            ref={durationRef}
            style={[styles.input, errors.durationMin && styles.inputError]}
            value={form.durationMin.toString()}
            onChangeText={(v) => setForm((f) => ({ ...f, durationMin: parseInt(v) || 0 }))}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => priceRef.current?.focus()}
          />
          <Text style={styles.helperText}>
            ≈ {Math.floor(form.durationMin / 60)} {t('hoursShort')}{' '}
            {form.durationMin % 60 ? `${form.durationMin % 60} ${t('minutesShort')}` : ''}
          </Text>

          <Text style={styles.label}>
            {t('servicePriceType')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, form.priceType === 'fixed' && styles.segmentActive]}
              onPress={() => setForm((f) => ({ ...f, priceType: 'fixed' }))}
            >
              <Text style={[styles.segmentText, form.priceType === 'fixed' && styles.segmentTextActive]}>
                {t('servicePriceTypeFixed')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, form.priceType === 'from' && styles.segmentActive]}
              onPress={() => setForm((f) => ({ ...f, priceType: 'from' }))}
            >
              <Text style={[styles.segmentText, form.priceType === 'from' && styles.segmentTextActive]}>
                {t('servicePriceTypeFrom')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {t('servicePriceEuro')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            ref={priceRef}
            style={[styles.input, errors.price && styles.inputError]}
            value={form.price}
            onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9.]/g, '') }))}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>{t('active')}</Text>
              <Text style={styles.toggleHelper}>{t('serviceActiveHelper')}</Text>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              trackColor={{ false: colors.borderStrong, true: colors.green }}
              thumbColor={colors.background}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={{ width: '100%' }}>
            <PrimaryButton label={saving ? t('saving') : t('save')} onPress={handleSave} disabled={saving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
  required: { color: colors.error },
  inputContainer: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: borderRadius.md, backgroundColor: colors.surfaceCard },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: borderRadius.md, padding: spacing.md, backgroundColor: colors.surfaceCard, fontFamily: fonts.body, fontSize: fontSizes.md },
  inputError: { borderColor: colors.error, backgroundColor: colors.errorLightSolid },
  errorText: { color: colors.error, fontFamily: fonts.body, fontSize: fontSizes.xs, marginTop: spacing.xxs },
  textArea: { height: layout.textAreaHeight, textAlignVertical: 'top' },
  helperText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.xxs },
  segmentedControl: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.md, padding: spacing.xxs },
  segment: { flex: 1, paddingVertical: spacing.s, alignItems: 'center', borderRadius: borderRadius.md - 2 },
  segmentActive: { backgroundColor: colors.background, shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  segmentText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxs },
  toggleHelper: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.pill, backgroundColor: colors.surfaceAlt, marginRight: spacing.xs, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: colors.coralLight, borderColor: colors.coral },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  chipTextActive: { color: colors.coral },
});
