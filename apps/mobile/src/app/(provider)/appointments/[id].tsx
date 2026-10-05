import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { formatAmount, formatBookingTime, calculatePayout } from '../../../utils/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';
import { ApiError, apiJson } from '@/services/apiClient';
import { mapHttpError } from '@/utils/error-messages';
import { openPhoneCall } from '@/utils/phone-call';
import { getBookingLocation } from '@/utils/bookingLocation';
import { openDirections } from '@/utils/openDirections';
import { cancellationWindowHours, isInsideCancellationWindow } from '@/utils/cancellationWindow';
import { sheetKeyboardProps } from '@/utils/sheetKeyboard';

type BackendCancelReason = 'Krank' | 'Notfall' | 'Sonstiges';

const PROVIDER_CANCEL_REASONS: {
  labelKey: 'cancelReasonSick' | 'cancelReasonEmergency' | 'cancelReasonMisc';
  apiValue: BackendCancelReason;
}[] = [
  { labelKey: 'cancelReasonSick', apiValue: 'Krank' },
  { labelKey: 'cancelReasonEmergency', apiValue: 'Notfall' },
  { labelKey: 'cancelReasonMisc', apiValue: 'Sonstiges' },
];

type BookingClient = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
};

type BookingServiceItem = {
  id: string;
  name: string;
};

type ProviderAppointment = {
  id: string;
  status: string;
  bookingNumber?: string;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
  platformFeeAmount?: number;
  platformFeePercent?: number;
  providerPayout?: number;
  clientNotes?: string;
  isMobile?: boolean;
  address?: {
    street?: string | null;
    houseNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  client?: BookingClient;
  services?: BookingServiceItem[];
  provider?: {
    cancellationPolicy?: unknown;
    street?: string | null;
    houseNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
};

type ProviderAppointmentResponse = ProviderAppointment | { data?: ProviderAppointment };
type ConversationResponse = { id?: string; data?: { id?: string } };

export default function ProviderAppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const bookingId = String(id ?? '');
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<ProviderAppointment | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<BackendCancelReason>('Krank');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useFocusEffect(
    React.useCallback(() => {
      if (bookingId) fetchBookingDetails();
      setNow(new Date());
    }, [bookingId]),
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const canStartAppointment = useCallback((b: ProviderAppointment | null): boolean => {
    if (!b?.scheduledDate || !b?.scheduledTime) return false;
    const [yearStr, monthStr, dayStr] = b.scheduledDate.split('-');
    const [hourStr, minuteStr] = b.scheduledTime.split(':');
    const scheduledDateObj = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
      Number(hourStr),
      Number(minuteStr),
    );
    const earliestStartMs = scheduledDateObj.getTime() - 30 * 60 * 1000;
    return now.getTime() >= earliestStartMs;
  }, [now]);

  const extractBooking = (
    payload: ProviderAppointmentResponse,
  ): ProviderAppointment | null =>
    'data' in payload ? payload.data ?? null : (payload as ProviderAppointment);

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
      const body = error.body;
      if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      return mapHttpError(error.status, fallback, lang);
    }
    return fallback;
  };

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const payload = await apiJson<ProviderAppointmentResponse>(`/bookings/${bookingId}`, {
        auth: true,
      });
      setBooking(extractBooking(payload));
    } catch (error) {
      debugError('Provider appointment detail load failed', error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async () => {
    const recipientId = booking?.client?.id as string | undefined;
    if (!recipientId) return;
    try {
      const payload = await apiJson<ConversationResponse>('/chat/conversations', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const conversationId = payload.data?.id ?? payload.id;
      if (conversationId) {
        router.push(('/(shared)/chat/' + conversationId) as any);
      }
    } catch (error) {
      debugError('Provider appointment chat open failed', error);
      Alert.alert(t('error'), getErrorMessage(error, t('errorUnknown')));
    }
  };

  const updateBookingStatus = async (action: 'start' | 'complete') => {
    try {
      await apiJson<unknown>(`/bookings/${bookingId}/${action}`, {
        auth: true,
        method: 'PATCH',
      });
      fetchBookingDetails();
    } catch (error) {
      debugError(`Provider booking status update failed action=${action}`, error);
      const bodyMessage =
        error instanceof ApiError &&
        error.body &&
        typeof error.body === 'object' &&
        'message' in error.body &&
        typeof (error.body as { message?: unknown }).message === 'string'
          ? (error.body as { message: string }).message
          : null;
      const isTooEarly =
        action === 'start' &&
        error instanceof ApiError &&
        error.status === 400 &&
        bodyMessage === 'Der Termin kann erst 30 Minuten vor der geplanten Zeit gestartet werden.';
      const title = isTooEarly ? t('appointmentTooEarlyTitle') : t('error');
      Alert.alert(title, getErrorMessage(error, t('errorUnknown')));
    }
  };

  const acceptBooking = async () => {
    try {
      setIsAccepting(true);
      await apiJson<unknown>(`/bookings/${bookingId}/accept`, {
        auth: true,
        method: 'PATCH',
      });
      fetchBookingDetails();
    } catch (error) {
      debugError('Provider appointment accept failed', error);
      Alert.alert(t('error'), getErrorMessage(error, t('providerBookingAcceptError')));
      fetchBookingDetails();
    } finally {
      setIsAccepting(false);
    }
  };

  const declineBooking = () => {
    Alert.alert(
      t('bookingRequestDeclineTitle'),
      t('bookingRequestDeclineBody'),
      [
        { text: t('back'), style: 'cancel' },
        {
          text: t('bookingRequestDecline'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeclining(true);
              await apiJson<unknown>(`/bookings/${bookingId}/decline`, {
                auth: true,
                method: 'PATCH',
              });
              fetchBookingDetails();
            } catch (error) {
              debugError('Provider appointment decline failed', error);
              Alert.alert(t('error'), getErrorMessage(error, t('providerBookingDeclineError')));
              fetchBookingDetails();
            } finally {
              setIsDeclining(false);
            }
          },
        },
      ],
    );
  };

  const confirmCancel = (reason: BackendCancelReason, notes?: string) => {
    Alert.alert(
      t('cancelConfirmTitle'),
      t('cancelConfirmBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('cancelConfirmBtn'),
          style: 'destructive',
          onPress: () => performCancel(reason, notes),
        },
      ],
    );
  };

  const performCancel = async (reason: BackendCancelReason, notes?: string) => {
    try {
      setIsCancelling(true);
      await apiJson<unknown>(`/bookings/${bookingId}/cancel`, {
        auth: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          notes: notes?.trim() || undefined,
        }),
      });
      setShowCancelModal(false);
      setCancelNotes('');
      fetchBookingDetails();
    } catch (error) {
      debugError('Provider appointment cancel failed', error);
      Alert.alert(t('error'), getErrorMessage(error, t('errorBookingCannotCancel') || t('errorUnknown')));
      fetchBookingDetails();
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusText = (status: string) => {
    const s = bookingStatus(status);
    return bookingStatusLabel(s, lang);
  };

  const getStatusColor = (status: string) => {
    // Provider view uses BLUE for status
    if (bookingStatus(status) === 'pending') return colors.orange;
    if (bookingStatus(status) === 'confirmed' || bookingStatus(status) === 'in_progress') return colors.blue;
    if (bookingStatus(status) === 'completed') return colors.green;
    if (bookingStatus(status) === 'cancelled') return colors.error;
    return colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
          <View style={{ width: layout.iconButton }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontFamily: fonts.body, color: colors.textSecondary }}>{t('providerAppointmentNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Status & Booking Number */}
        <View style={styles.topInfo}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusChipText}>{getStatusText(booking.status)}</Text>
          </View>
          <Text style={styles.bookingNumber}>
            {t('providerBookingNumberLabel')}: {booking.bookingNumber || ('HC-' + booking.id.substring(0, 4).toUpperCase())}
          </Text>
        </View>

        {/* Client Card */}
        <View style={styles.card}>
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatarRing}>
              {booking.client?.avatarUrl ? (
                <Image source={{ uri: booking.client.avatarUrl }} style={styles.clientAvatar} />
              ) : (
                <Feather name="user" size={32} color={colors.gold} />
              )}
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {booking.client?.firstName} {booking.client?.lastName}
              </Text>
              {(() => {
                const location = getBookingLocation(booking, 'provider', {
                  tNote: t('bookingLocationAfterAccepting'),
                  tNotProvided: t('bookingLocationNoAddress'),
                  tAtYourStudio: t('bookingLocationAtProviderStudio'),
                });
                return (
                  <View style={{ marginTop: spacing.xxs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Feather name="map-pin" size={fontSizes.sm} color={colors.textSecondary} style={{ marginTop: 2, marginRight: spacing.xxs }} />
                      <View style={{ flex: 1 }}>
                        {location.displayLines.map((line, idx) => (
                          <Text key={idx} style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary }}>
                            {line}
                          </Text>
                        ))}
                      </View>
                      {location.routeAddress !== null && (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm }}
                          onPress={() => {
                            void openDirections(location.routeAddress!, {
                              platform: Platform.OS,
                              canOpenURL: Linking.canOpenURL.bind(Linking),
                              openURL: Linking.openURL.bind(Linking),
                              showActionSheet: (opts) => new Promise<number>(r => ActionSheetIOS.showActionSheetWithOptions(opts, r)),
                              alert: (title, msg) => Alert.alert(title, msg),
                              strings: {
                                appleMaps: t('directionsAppleMaps'),
                                googleMaps: t('directionsGoogleMaps'),
                                cancel: t('directionsCancel'),
                                errorTitle: t('directionsErrorTitle'),
                                errorMessage: t('directionsErrorBody'),
                              },
                            });
                          }}
                        >
                          <Feather name="map-pin" size={fontSizes.sm} color={colors.primary} style={{ marginRight: spacing.xxxs }} />
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary }}>{t('appointmentsRoute')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>

          <View style={styles.clientActions}>
            <TouchableOpacity style={styles.greyButton} onPress={openChat}>
              <Text style={styles.greyButtonText}>{t('message')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.greyButton, !booking.client?.phone && { opacity: 0.4 }]} 
              disabled={!booking.client?.phone}
              onPress={() => {
                if (booking.client?.phone) {
                  void openPhoneCall(booking.client.phone, lang);
                }
              }}
            >
              <Text style={styles.greyButtonText}>{t('call')}</Text>
            </TouchableOpacity>
          </View>

          {booking.clientNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>"{booking.clientNotes}"</Text>
            </View>
          )}
        </View>

        {/* Appointment Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('appointmentsInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('service')}</Text>
            <Text style={styles.infoValue}>
              {booking.services?.map((service) => service.name).join(', ') || 'Service'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="calendar" size={14} color={colors.textSecondary} /> {t('date')}
            </Text>
            <Text style={styles.infoValue}>
              {new Date(booking.scheduledDate).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="clock" size={14} color={colors.textSecondary} /> {t('time')}
            </Text>
            <Text style={styles.infoValue}>
              {formatBookingTime(booking.scheduledTime, lang)}
              {lang === 'de' ? ' ' + t('timeSuffix') : ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingServicePrice')}</Text>
            <Text style={styles.infoValue}>€{formatAmount(booking.totalPrice, lang)}</Text>
          </View>

          {((booking.platformFeeAmount ?? 0) > 0) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('bookingPlatformFee')} ({booking.platformFeePercent}%)
              </Text>
              <Text style={styles.infoValue}>-€{formatAmount(booking.platformFeeAmount, lang)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.boldGreenText]}>
              <Feather name="briefcase" size={16} color={colors.green} /> {t('providerPayout')}
            </Text>
            <Text style={[styles.infoValue, styles.boldGreenText]}>€{formatAmount(calculatePayout(booking.totalPrice, booking.platformFeeAmount), lang)}</Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <View style={styles.orangeDot} />
            <Text style={styles.paymentMethodText}>{t('providerPaymentOnCompletion')}</Text>
          </View>

        </View>

      </ScrollView>

      {/* Action Buttons Footer */}
      {bookingStatus(booking.status) === 'pending' && (
        <View style={styles.footer}>
          <PrimaryButton
            label={t('providerBookingAccept')}
            onPress={acceptBooking}
            loading={isAccepting}
            disabled={isDeclining}
            variant="filled"
          />
          <View style={{ height: spacing.sm }} />
          <TouchableOpacity
            style={styles.declineButton}
            onPress={declineBooking}
            disabled={isAccepting || isDeclining}
          >
            {isDeclining ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.declineButtonText}>{t('bookingRequestDecline')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {bookingStatus(booking.status) === 'confirmed' && (
        <View style={styles.footer}>
          <PrimaryButton 
            label={t('providerStartAppointment')} 
            onPress={() => updateBookingStatus('start')}
            variant="filled"
            disabled={!canStartAppointment(booking)}
          />
          <View style={{ height: spacing.sm }} />
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => setShowCancelModal(true)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.declineButtonText}>{t('cancelTitle')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {bookingStatus(booking.status) === 'in_progress' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.green }]} 
            onPress={() => updateBookingStatus('complete')}
          >
            <Text style={styles.actionButtonText}>{t('apptComplete')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={styles.cancelBottomSheet}
              {...sheetKeyboardProps({ platform: Platform.OS, topInset: insets.top })}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cancelSheetScrollContent}
              >
                <Text style={styles.modalTitle}>{t('cancelTitle')}</Text>

                <View style={styles.warningBanner}>
                  <Text style={styles.warningBannerText}>
                    {(
                      isInsideCancellationWindow({
                        scheduledDate: booking?.scheduledDate,
                        scheduledTime: booking?.scheduledTime,
                        policy: booking?.provider?.cancellationPolicy,
                        now: new Date(),
                      })
                        ? t('cancelProviderNoteUrgent')
                        : t('cancelProviderNote')
                    ).replace(/\{hours\}/g, String(cancellationWindowHours(booking?.provider?.cancellationPolicy)))}
                  </Text>
                </View>

                <Text style={styles.modalSectionLabel}>{t('cancelReason')}</Text>
                <View style={styles.presetReasonsRow}>
                  {PROVIDER_CANCEL_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.apiValue}
                      style={[
                        styles.reasonChip,
                        cancelReason === r.apiValue && styles.reasonChipActive,
                      ]}
                      onPress={() => setCancelReason(r.apiValue)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          cancelReason === r.apiValue && styles.reasonChipTextActive,
                        ]}
                      >
                        {t(r.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalSectionLabel}>{t('cancelNotes')}</Text>
                <TextInput
                  style={styles.cancelNotesInput}
                  value={cancelNotes}
                  onChangeText={setCancelNotes}
                  placeholder={t('cancelNotesPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowCancelModal(false)}
                    disabled={isCancelling}
                  >
                    <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSubmitBtn,
                      (!cancelReason || isCancelling) && styles.modalSubmitBtnDisabled,
                    ]}
                    disabled={!cancelReason || isCancelling}
                    onPress={() => confirmCancel(cancelReason, cancelNotes)}
                  >
                    {isCancelling ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>{t('cancelConfirmBtn')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },

  topInfo: { alignItems: 'center', marginBottom: spacing.xl },
  statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxs + spacing.xxxs, borderRadius: borderRadius.pill, marginBottom: spacing.sm },
  statusChipText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.background },
  bookingNumber: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },

  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  clientAvatarRing: { width: layout.avatarMd, height: layout.avatarMd, borderRadius: layout.iconButton - spacing.xxxs, borderWidth: spacing.xxxs, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  clientAvatar: { width: layout.headerHeight, height: layout.headerHeight, borderRadius: layout.iconButton - spacing.unit, },
  clientInfo: { flex: 1 },
  clientName: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxs },

  clientActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  greyButton: { flex: 1, backgroundColor: colors.surface, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center' },
  greyButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },

  notesBox: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.md },
  notesText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  infoLabel: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  divider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md },
  
  boldGreenText: { fontFamily: fonts.bodyBold, color: colors.green },
  
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  orangeDot: { width: spacing.xs, height: spacing.xs, borderRadius: borderRadius.sm - spacing.xxs, backgroundColor: colors.orange, marginRight: spacing.xs },
  paymentMethodText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: spacing.unit, borderTopColor: colors.border },
  actionButton: { height: layout.buttonHeight, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },

  declineButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.unit,
    borderColor: colors.error,
  },
  declineButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cancelBottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
  },
  cancelSheetScrollContent: { paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  warningBanner: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: spacing.unit,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  warningBannerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.warningIcon,
    lineHeight: 18,
  },
  modalSectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  presetReasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reasonChip: {
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
  },
  reasonChipActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coralLight,
  },
  reasonChipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  reasonChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.coral,
  },
  cancelNotesInput: {
    borderWidth: spacing.unit,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    borderWidth: spacing.unit,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: colors.borderStrong,
  },
  modalSubmitBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.background,
  },
});
