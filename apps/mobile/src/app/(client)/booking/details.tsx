import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

export default function BookingDetails() {
  const router = useRouter();
  const { providerId, serviceIds, totalPrice, scheduledDate, scheduledTime } = useLocalSearchParams();
  
  const [ids, setIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  
  const [providerName, setProviderName] = useState('Lade Anbieter...');
  const [serviceNames, setServiceNames] = useState('Lade Services...');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (serviceIds) {
      try {
        setIds(JSON.parse(serviceIds as string));
      } catch (e) {
        setIds([serviceIds as string]);
      }
    }
    
    // Fetch names for UI gracefully
    const fetchNames = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const [providerRes, servicesRes] = await Promise.all([
          axios.get(`${API_URL}/providers/${providerId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/providers/${providerId}/services`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const provData = providerRes.data.data || providerRes.data;
        const servData = servicesRes.data.data || servicesRes.data;
        
        if (provData && provData.businessName) {
          setProviderName(provData.businessName);
        } else if (provData && provData.user) {
          setProviderName(`${provData.user.firstName} ${provData.user.lastName}`);
        } else {
          setProviderName('Anbieter');
        }
        
        const activeIds = typeof serviceIds === 'string' ? JSON.parse(serviceIds) : [];
        const matchedServices = servData.filter((s: any) => activeIds.includes(s.id));
        if (matchedServices.length > 0) {
          setServiceNames(matchedServices.map((s: any) => s.name).join(', '));
        } else {
          setServiceNames('Gewählte Services');
        }
      } catch (err) {
        setProviderName('Anbieter');
        setServiceNames('Gewählte Services');
      }
    };
    
    fetchNames();
  }, [providerId, serviceIds]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleBookNow = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/bookings`, {
        providerId,
        serviceIds: ids,
        scheduledDate,
        scheduledTime,
        isMobile,
        clientNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resData = response.data.data || response.data;
      const bookingData = resData.booking || resData;
      
      router.replace({ 
        pathname: '/(client)/booking/confirmation', 
        params: { booking: JSON.stringify(bookingData) }
      });
      
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setErrorMessage('Dieser Zeitslot ist leider nicht mehr verfügbar. Bitte wähle eine andere Zeit.');
      } else if (status === 400) {
        setErrorMessage('Ungültige Eingabe. Bitte prüfe deine Daten.');
      } else {
        setErrorMessage(mapHttpError(status));
      }
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Buchungsdetails</Text>
          <Text style={styles.headerSubtitle}>Schritt 3 von 4</Text>
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Booking Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardProviderTitle}>{providerName}</Text>
          <Text style={styles.cardServicesText}>{serviceNames}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Feather name="calendar" size={18} color={colors.textSecondary} />
            <Text style={styles.summaryText}>{formatDate(scheduledDate as string)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Feather name="clock" size={18} color={colors.textSecondary} />
            <Text style={styles.summaryText}>{scheduledTime} Uhr</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={[styles.summaryRow, { justifyContent: 'space-between', marginTop: 0 }]}>
            <Text style={styles.totalLabel}>Gesamt</Text>
            <Text style={styles.totalValue}>€{totalPrice},00</Text>
          </View>
        </View>

        {/* Mobile Service Toggle Row */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Mobiler Service gewünscht</Text>
              <Text style={styles.toggleSubtitle}>Der Braider kommt zu dir nach Hause</Text>
            </View>
            <Switch
              value={isMobile}
              onValueChange={setIsMobile}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.notesContainer}>
          <Text style={styles.inputLabel}>Notizen für den Braider</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Besondere Wünsche, Haartyp, Allergien..."
            placeholderTextColor={colors.textTertiary}
            value={clientNotes}
            onChangeText={setClientNotes}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>{clientNotes.length}/500</Text>
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Feather name="lock" size={18} color={colors.textPrimary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.cardProviderTitle}>Zahlung</Text>
          </View>
          <Text style={styles.paymentText}>Vor Ort bar zahlen</Text>
          <Text style={styles.toggleSubtitle}>Bezahle direkt beim Termin</Text>
        </View>
        
        {/* Extra Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleBookNow}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Jetzt buchen</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backButton: { marginRight: spacing.md },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary },
  headerSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  stepContainer: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  stepActive: { backgroundColor: colors.coral },
  
  content: { padding: spacing.lg },
  
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
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 10 },
  summaryText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  
  notesContainer: { marginBottom: spacing.lg },
  inputLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    height: 120,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCounter: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },
  
  paymentText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.coral,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
