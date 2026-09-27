import React, { createContext, useContext, useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme';
import { debugError } from '@/utils/logger';

export interface RegistrationForm {
  providerType: string;
  firstName: string; lastName: string;
  email: string; phone: string; password: string;
  acceptedTerms: boolean;
  businessName: string; street: string; houseNumber: string;
  city: string; postalCode: string; serviceRadius: number;
  serviceIds: string[]; experienceYears: number;
  languages: string[]; cancellationPolicy: '24h' | '48h' | '72h'; bio: string;
  profilePhotoUri: string; idDocumentUri: string;
  portfolioUris: string[];
  portfolioMarketingConsent: boolean;
}

export const DEFAULTS: RegistrationForm = {
  providerType: '', firstName: '', lastName: '',
  email: '', phone: '', password: '', acceptedTerms: false,
  businessName: '', street: '', houseNumber: '', city: '',
  postalCode: '', serviceRadius: 10, serviceIds: [],
  experienceYears: 1, languages: ['de'], cancellationPolicy: '24h',
  bio: '', profilePhotoUri: '', idDocumentUri: '', portfolioUris: [],
  portfolioMarketingConsent: false,
};

const DRAFT_STORAGE_KEY = 'hc_provider_registration_draft';

export async function saveRegistrationDraft(draft: RegistrationForm): Promise<void> {
  try {
    const { password, ...safeDraft } = draft;
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(safeDraft));
  } catch (err) {
    debugError('Failed to save provider registration draft', err);
  }
}

export async function loadRegistrationDraft(): Promise<RegistrationForm | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...DEFAULTS,
      ...parsed,
      password: '',
    };
  } catch (err) {
    debugError('Failed to load provider registration draft', err);
    return null;
  }
}

export async function clearRegistrationDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    debugError('Failed to clear provider registration draft', err);
  }
}

const RegistrationContext = createContext<{
  form: RegistrationForm;
  isRehydrated: boolean;
  update: (f: Partial<RegistrationForm>) => void;
  reset: () => void;
}>({ form: DEFAULTS, isRehydrated: false, update: () => {}, reset: () => {} });

export function RegistrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [form, setForm] = useState<RegistrationForm>(DEFAULTS);
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function rehydrate() {
      try {
        const draft = await loadRegistrationDraft();
        if (draft && !cancelled) {
          setForm(draft);
        }
      } catch (err) {
        debugError('Failed to rehydrate registration draft', err);
      } finally {
        if (!cancelled) {
          setIsRehydrated(true);
        }
      }
    }
    void rehydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (f: Partial<RegistrationForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...f };
      void saveRegistrationDraft(next);
      return next;
    });
  };

  const reset = () => {
    setForm(DEFAULTS);
    void clearRegistrationDraft();
  };

  if (!isRehydrated) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <RegistrationContext.Provider value={{ form, isRehydrated, update, reset }}>
      {children}
    </RegistrationContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const useRegistration = () => useContext(RegistrationContext);
