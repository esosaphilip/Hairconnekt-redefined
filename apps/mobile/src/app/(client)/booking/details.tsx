import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { ApiError, apiJson } from '@/services/apiClient';
import { tokenStorage } from '@/utils/token-storage';

type SavedAddress = {
  id: string;
  label?: string | null;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  isDefault?: boolean;
};

type ProviderProfile = {
  businessName?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type ProviderService = {
  id: string;
  name: string;
};

type ProviderResponse = ProviderProfile | { data?: ProviderProfile | null };
type ProviderServicesResponse = ProviderService[] | { data?: ProviderService[] | null };

type BookingResult = {
  id: string;
  bookingNumber?: string;
};

type BookingCreateResponse =
  | BookingResult
  | {
      booking?: BookingResult | null;
      data?: BookingResult | { booking?: BookingResult | null } | null;
    };

const normalizeParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

const isProviderProfile = (value: unknown): value is ProviderProfile =>
  typeof value === 'object' && value !== null;

const isBookingResult = (value: unknown): value is BookingResult =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string';

const extractProvider = (payload: ProviderResponse): ProviderProfile | null => {
  if ('data' in payload) {
    return isProviderProfile(payload.data) ? payload.data : null;
  }
  return isProviderProfile(payload) ? payload : null;
};

const extractServices = (payload: ProviderServicesResponse): ProviderService[] =>
  Array.isArray(payload) ? payload : payload.data ?? [];

const extractBookingResult = (
  payload: BookingCreateResponse,
): BookingResult | null => {
  if ('booking' in payload && payload.booking) {
    return payload.booking;
  }
  if ('data' in payload) {
    const data = payload.data;
    if (!data) {
      return null;
    }
    if ('booking' in data && data.booking) {
      return data.booking;
    }
    return isBookingResult(data) ? data : null;
  }
  return isBookingResult(payload) ? payload : null;
};

export default function BookingDetails() {
  const router = useRouter();
  const { providerId, selectedServiceIds, totalPrice, date, time } = useLocalSearchParams();
  const { t, lang } = useLanguage();

  const providerIdValue = normalizeParam(providerId);
  const selectedServiceIdsValue = normalizeParam(selectedServiceIds);
  const dateValue = normalizeParam(date);
  const timeValue = normalizeParam(time);
  const totalPriceValue = normalizeParam(totalPrice);
  
  const [ids, setIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  
  const [providerName, setProviderName] = useState('');
  const [serviceNames, setServiceNames] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mobile address state
  const [hasLoadedAddresses, setHasLoadedAddresses] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isEnteringNewAddress, setIsEnteringNewAddress] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // New address form fields
  const [newStreet, setNewStreet] = useState('');
  const [newHouseNumber, setNewHouseNumber] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newCity, setNewCity] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  const streetRef = useRef<TextInput>(null);
  const houseNumberRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const loadSavedAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const res: any = await apiJson('/users/me/addresses', { auth: true });
      const list: SavedAddress[] = res?.data ?? res ?? [];
      const validList = Array.isArray(list) ? list : [];
      setSavedAddresses(validList);
      setHasLoadedAddresses(true);
      if (validList.length > 0) {
        const defaultAddr = validList.find((a) => a.isDefault) || validList[0];
        setSelectedAddressId(defaultAddr.id);
        setIsEnteringNewAddress(false);
      } else {
        setIsEnteringNewAddress(true);
      }
    } catch {
      setSavedAddresses([]);
      setHasLoadedAddresses(true);
      setIsEnteringNewAddress(true);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleToggleMobile = (value: boolean) => {
    setIsMobile(value);
    if (value && !hasLoadedAddresses) {
      loadSavedAddresses();
    }
  };

  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];

  useEffect(() => {
    if (selectedServiceIdsValue) {
      const parsed = selectedServiceIdsValue
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      setIds(parsed);
    }
    
    // Fetch names for UI gracefully
    const fetchNames = async () => {
      try {
        const [providerPayload, servicesPayload] = await Promise.all([
          apiJson<ProviderResponse>(`/providers/${providerIdValue}`, {
            auth: true,
            retryCount: 1,
          }),
          apiJson<ProviderServicesResponse>(
            `/providers/${providerIdValue}/services`,
            {
              auth: true,
              retryCount: 1,
            },
          ),
        ]);

        const provData = extractProvider(providerPayload);
        const servData = extractServices(servicesPayload);
        
        if (provData?.businessName) {
          setProviderName(provData.businessName);
        } else if (provData?.user) {
          const firstName = provData.user.firstName ?? '';
          const lastName = provData.user.lastName ?? '';
          const fullName = `${firstName} ${lastName}`.trim();
          setProviderName(fullName || t('providerGeneric'));
        } else {
          setProviderName(t('providerGeneric'));
        }
        
        const activeIds = typeof selectedServiceIdsValue === 'string'
          ? selectedServiceIdsValue.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const matchedServices = servData.filter((service) =>
          activeIds.includes(service.id),
        );
        if (matchedServices.length > 0) {
          setServiceNames(matchedServices.map((service) => service.name).join(', '));
        } else {
          setServiceNames(t('selectedServicesGeneric'));
        }
      } catch (err) {
        setProviderName(t('providerGeneric'));
        setServiceNames(t('selectedServicesGeneric'));
      }
    };
    
    fetchNames();
  }, [providerIdValue, selectedServiceIdsValue]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleBookNow = async () => {
    Keyboard.dismiss();
    try {
      setIsLoading(true);
      setErrorVisible(false);

      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        const params = new URLSearchParams();
        if (providerIdValue) params.set('providerId', providerIdValue);
        if (selectedServiceIdsValue) params.set('selectedServiceIds', selectedServiceIdsValue);
        if (totalPriceValue) params.set('totalPrice', totalPriceValue);
        if (dateValue) params.set('date', dateValue);
        if (timeValue) params.set('time', timeValue);
        const destination = `/(client)/booking/details${params.toString() ? '?' + params.toString() : ''}`;
        router.replace(`/(auth)/login?returnTo=${encodeURIComponent(destination)}` as any);
        return;
      }

      let resolvedAddressId = selectedAddressId;

      if (isMobile) {
        if (isEnteringNewAddress || !resolvedAddressId) {
          const s = newStreet.trim();
          const hn = newHouseNumber.trim();
          const pc = newPostalCode.trim();
          const c = newCity.trim();

          const errs: Record<string, string> = {};
          if (!s) errs.street = t('addressesStreet');
          if (!hn) errs.houseNumber = t('addressesHouseNumber');
          if (!pc) errs.postalCode = t('addressesPostalCode');
          if (!c) errs.city = t('addressesCity');

          if (Object.keys(errs).length > 0) {
            setAddressErrors(errs);
            setErrorMessage(t('bookingAddressRequired'));
            setErrorVisible(true);
            setIsLoading(false);
            return;
          }

          // Call existing POST /users/me/addresses
          const created: any = await apiJson('/users/me/addresses', {
            auth: true,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              street: s,
              houseNumber: hn,
              postalCode: pc,
              city: c,
              isDefault: saveAsDefault || savedAddresses.length === 0,
            }),
          });

          resolvedAddressId = created?.data?.id ?? created?.id;
          if (!resolvedAddressId) {
            setErrorMessage(t('addressesSaveError'));
            setErrorVisible(true);
            setIsLoading(false);
            return;
          }
        }

        if (!resolvedAddressId) {
          setErrorMessage(t('bookingAddressRequired'));
          setErrorVisible(true);
          setIsLoading(false);
          return;
        }
      }

      const bookingData: {
        providerId: string;
        serviceIds: string[];
        scheduledDate: string;
        scheduledTime: string;
        isMobile: boolean;
        clientNotes?: string;
        addressId?: string;
      } = {
        providerId: providerIdValue,
        serviceIds: ids,
        scheduledDate: dateValue,
        scheduledTime: timeValue,
        isMobile,
        clientNotes,
      };

      if (isMobile && resolvedAddressId) {
        bookingData.addressId = resolvedAddressId;
      }

      const payload = await apiJson<BookingCreateResponse>('/bookings', {
        auth: true,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const bookingResult = extractBookingResult(payload);
      if (!bookingResult) {
        throw new ApiError('Booking response invalid', 500, payload);
      }
      
      router.replace({ 
        pathname: '/(client)/booking/confirmation', 
        params: { booking: JSON.stringify(bookingResult) }
      });
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const status = error instanceof ApiError ? error.status : undefined;
      if (msg.includes('No authentication token') || status === 401) {
        const params = new URLSearchParams();
        if (providerIdValue) params.set('providerId', providerIdValue);
        if (selectedServiceIdsValue) params.set('selectedServiceIds', selectedServiceIdsValue);
        if (totalPriceValue) params.set('totalPrice', totalPriceValue);
        if (dateValue) params.set('date', dateValue);
        if (timeValue) params.set('time', timeValue);
        const destination = `/(client)/booking/details${params.toString() ? '?' + params.toString() : ''}`;
        router.replace(`/(auth)/login?returnTo=${encodeURIComponent(destination)}` as any);
        return;
      }
      if (status === 409) {
        setErrorMessage(t('bookingSlotTaken'));
      } else if (status === 400) {
        const backendMessage =
          error instanceof ApiError &&
          error.body &&
          typeof error.body === 'object' &&
          'message' in error.body
            ? (error.body as { message?: string | string[] }).message
            : undefined;
        setErrorMessage(
          Array.isArray(backendMessage)
            ? backendMessage[0]
            : backendMessage ??
                t('bookingInvalidSlot')
        );
      } else {
        setErrorMessage(mapHttpError(status, error instanceof Error ? error.message : undefined, lang));
      }
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('bookingDetails')}</Text>
          <Text style={styles.headerSubtitle}>{t('bookingStep')} 3 {t('bookingOf')} 4</Text>
        </View>
      </View>
      
      {/* 4 Segment Step Indicator */}
      <View style={styles.stepContainer}>
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={styles.stepBar} />
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardProviderTitle}>{providerName || t('loading')}</Text>
            <Text style={styles.cardServicesText}>{serviceNames || t('loading')}</Text>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Feather name="calendar" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryText}>{formatDate(dateValue)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Feather name="clock" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryText}>
                {timeValue}
                {t('timeSuffix')}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.summaryRow, { justifyContent: 'space-between', marginTop: spacing.none }]}>
              <Text style={styles.totalLabel}>{t('bookingTotal')}</Text>
              <Text style={styles.totalValue}>€{formatAmount(totalPriceValue, lang)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{t('bookingMobileService')}</Text>
                <Text style={styles.toggleSubtitle}>{t('bookingMobileSub')}</Text>
              </View>
              <Switch
                value={isMobile}
                onValueChange={handleToggleMobile}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {isMobile && (
              <>
                <View style={styles.divider} />

                {isLoadingAddresses ? (
                  <View style={styles.addressLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : !isEnteringNewAddress && selectedAddress ? (
                  <View style={styles.addressContainer}>
                    <View style={styles.addressCard}>
                      <View style={styles.addressCardHeader}>
                        <View style={styles.addressCardIcon}>
                          <Feather name="map-pin" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.addressCardTitleRow}>
                            <Text style={styles.addressCardTitle}>
                              {selectedAddress.label || t('bookingAddressSelectSaved')}
                            </Text>
                            {selectedAddress.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>{t('addressesDefault')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressCardText}>
                            {selectedAddress.street} {selectedAddress.houseNumber}
                          </Text>
                          <Text style={styles.addressCardText}>
                            {selectedAddress.postalCode} {selectedAddress.city}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.addressActions}>
                        {savedAddresses.length > 1 && (
                          <TouchableOpacity
                            style={styles.addressActionBtn}
                            onPress={() => setShowAddressPicker(!showAddressPicker)}
                          >
                            <Text style={styles.addressActionBtnText}>
                              {showAddressPicker ? t('close') : t('bookingAddressChooseOther')}
                            </Text>
                            <Feather name={showAddressPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.addressActionBtn}
                          onPress={() => {
                            setIsEnteringNewAddress(true);
                            setShowAddressPicker(false);
                          }}
                        >
                          <Text style={styles.addressActionBtnText}>{t('bookingAddressEnterNew')}</Text>
                        </TouchableOpacity>
                      </View>

                      {showAddressPicker && (
                        <View style={styles.addressPickerDropdown}>
                          {savedAddresses.map((addr) => (
                            <TouchableOpacity
                              key={addr.id}
                              style={[
                                styles.addressPickerOption,
                                selectedAddressId === addr.id && styles.addressPickerOptionActive,
                              ]}
                              onPress={() => {
                                setSelectedAddressId(addr.id);
                                setShowAddressPicker(false);
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.addressPickerOptionTitle}>
                                  {addr.label ? `${addr.label}: ` : ''}{addr.street} {addr.houseNumber}, {addr.postalCode} {addr.city}
                                </Text>
                              </View>
                              {selectedAddressId === addr.id && (
                                <Feather name="check" size={16} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.addressContainer}>
                    {savedAddresses.length > 0 && (
                      <TouchableOpacity
                        style={styles.backToSavedBtn}
                        onPress={() => {
                          setIsEnteringNewAddress(false);
                          setAddressErrors({});
                        }}
                      >
                        <Feather name="arrow-left" size={14} color={colors.primary} style={{ marginRight: spacing.xs }} />
                        <Text style={styles.backToSavedBtnText}>{t('bookingAddressUseSaved')}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.addressFormRow}>
                      <View style={[styles.addressFormCol, { flex: 2, marginRight: spacing.sm }]}>
                        <Text style={styles.addressFieldLabel}>{t('addressesStreet')}</Text>
                        <TextInput
                          ref={streetRef}
                          style={[styles.addressInput, addressErrors.street && styles.addressInputError]}
                          value={newStreet}
                          onChangeText={(val) => {
                            setNewStreet(val);
                            setAddressErrors((prev) => ({ ...prev, street: '' }));
                          }}
                          placeholder={t('addressesStreet')}
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => houseNumberRef.current?.focus()}
                        />
                      </View>
                      <View style={[styles.addressFormCol, { flex: 1 }]}>
                        <Text style={styles.addressFieldLabel}>{t('addressesHouseNumber')}</Text>
                        <TextInput
                          ref={houseNumberRef}
                          style={[styles.addressInput, addressErrors.houseNumber && styles.addressInputError]}
                          value={newHouseNumber}
                          onChangeText={(val) => {
                            setNewHouseNumber(val);
                            setAddressErrors((prev) => ({ ...prev, houseNumber: '' }));
                          }}
                          placeholder="12a"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => postalCodeRef.current?.focus()}
                        />
                      </View>
                    </View>

                    <View style={styles.addressFormRow}>
                      <View style={[styles.addressFormCol, { flex: 1, marginRight: spacing.sm }]}>
                        <Text style={styles.addressFieldLabel}>{t('addressesPostalCode')}</Text>
                        <TextInput
                          ref={postalCodeRef}
                          style={[styles.addressInput, addressErrors.postalCode && styles.addressInputError]}
                          value={newPostalCode}
                          onChangeText={(val) => {
                            setNewPostalCode(val);
                            setAddressErrors((prev) => ({ ...prev, postalCode: '' }));
                          }}
                          placeholder="10115"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="number-pad"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => cityRef.current?.focus()}
                        />
                      </View>
                      <View style={[styles.addressFormCol, { flex: 2 }]}>
                        <Text style={styles.addressFieldLabel}>{t('addressesCity')}</Text>
                        <TextInput
                          ref={cityRef}
                          style={[styles.addressInput, addressErrors.city && styles.addressInputError]}
                          value={newCity}
                          onChangeText={(val) => {
                            setNewCity(val);
                            setAddressErrors((prev) => ({ ...prev, city: '' }));
                          }}
                          placeholder={t('addressesCity')}
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                      </View>
                    </View>

                    <View style={styles.saveDefaultRow}>
                      <Text style={styles.saveDefaultText}>{t('bookingAddressSaveAsDefault')}</Text>
                      <Switch
                        value={saveAsDefault}
                        onValueChange={setSaveAsDefault}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                      />
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.notesContainer}>
            <Text style={styles.inputLabel}>{t('bookingNotes')}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={t('bookingNotesPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={clientNotes}
              onChangeText={setClientNotes}
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCounter}>{clientNotes.length}/500</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Feather name="lock" size={18} color={colors.textPrimary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.cardProviderTitle}>{t('bookingPayment')}</Text>
            </View>
            <Text style={styles.paymentText}>{t('bookingPaymentMethod')}</Text>
            <Text style={styles.toggleSubtitle}>{t('bookingPaymentSub')}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBookNow} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('bookingBookNow')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backButton: { marginRight: spacing.md },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary },
  headerSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  stepContainer: { flexDirection: 'row', gap: spacing.xxs + spacing.xxxs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepBar: { flex: 1, height: spacing.xxs, backgroundColor: colors.border, borderRadius: borderRadius.xs },
  stepActive: { backgroundColor: colors.coral },
  
  keyboardContainer: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    elevation: 3,
  },
  cardProviderTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xs },
  cardServicesText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.sm },
  divider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.s },
  summaryText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xxxs },
  
  notesContainer: { marginBottom: spacing.lg },
  inputLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    height: layout.textAreaHeight,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCounter: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },
  
  paymentText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: spacing.unit, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg },
  primaryButton: {
    backgroundColor: colors.coral,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
  
  addressLoadingContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    marginTop: spacing.xs,
  },
  addressCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressCardIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  addressCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxxs,
  },
  addressCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  defaultBadge: {
    backgroundColor: colors.coralLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.coral,
  },
  addressCardText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: spacing.unit,
    borderTopColor: colors.border,
  },
  addressActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  addressActionBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.primary,
    marginRight: spacing.xxs,
  },
  addressPickerDropdown: {
    marginTop: spacing.sm,
    borderTopWidth: spacing.unit,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  addressPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  addressPickerOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  addressPickerOptionTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  backToSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backToSavedBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  addressFormRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  addressFormCol: {},
  addressFieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  addressInput: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    height: layout.inputHeight,
    paddingHorizontal: spacing.sm,
  },
  addressInputError: {
    borderColor: colors.error,
  },
  saveDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  saveDefaultText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
