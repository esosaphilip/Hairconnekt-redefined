import React, { createContext, useContext, useState } from 'react';

interface RegistrationForm {
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
}

const DEFAULTS: RegistrationForm = {
  providerType: '', firstName: '', lastName: '',
  email: '', phone: '', password: '', acceptedTerms: false,
  businessName: '', street: '', houseNumber: '', city: '',
  postalCode: '', serviceRadius: 10, serviceIds: [],
  experienceYears: 1, languages: ['de'], cancellationPolicy: '24h',
  bio: '', profilePhotoUri: '', idDocumentUri: '', portfolioUris: [],
};

const RegistrationContext = createContext<{
  form: RegistrationForm;
  update: (f: Partial<RegistrationForm>) => void;
  reset: () => void;
}>({ form: DEFAULTS, update: () => {}, reset: () => {} });

export function RegistrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [form, setForm] = useState<RegistrationForm>(DEFAULTS);
  const update = (f: Partial<RegistrationForm>) =>
    setForm(prev => ({ ...prev, ...f }));
  const reset = () => setForm(DEFAULTS);
  return (
    <RegistrationContext.Provider value={{ form, update, reset }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export const useRegistration = () => useContext(RegistrationContext);
