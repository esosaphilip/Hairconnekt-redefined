import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius } from '../../theme';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';
import { bookingStatusLabel } from '../../utils/booking-status';

interface BookingItem {
  id: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: string;
  totalPrice: number;
  client: { firstName: string; lastName: string };
  services: { name: string; durationMin: number; price: number }[];
}

interface BlockItem {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string | null; // HH:mm or null
  endTime: string | null;   // HH:mm or null
  isAllDay: boolean;
  reason: string;
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function ProviderCalendarScreen() {
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await tokenStorage.getAccessToken();
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const [bookingsRes, blocksRes] = await Promise.all([
        fetch(`${API}/bookings?month=${monthStr}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        fetch(`${API}/providers/me/blocks`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
      ]);

      if (bookingsRes?.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.data || []);
      } else {
        setBookings([]);
      }

      if (blocksRes?.ok) {
        const blocksData = await blocksRes.json();
        setBlocks(Array.isArray(blocksData) ? blocksData : (blocksData.data || []));
      } else {
        setBlocks([]);
      }
    } catch (error) {
      console.log('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust so Monday is 0
  };

  /** Format YYYY-MM-DD from a Date or return the date string */
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /** Check if a date string falls within a block's date range */
  const dateInBlockRange = (dateStr: string, block: BlockItem) => {
    return dateStr >= block.startDate && dateStr <= block.endDate;
  };

  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const today = new Date();
    const todayStr = toDateStr(today);
    const selectedStr = toDateStr(selectedDate);

    const grid = [];
    let dayCount = 1;
    let cellKey = 0;

    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < firstDay) {
          week.push(<View key={`cell-${cellKey++}`} style={styles.dayCell} />);
        } else if (dayCount > daysInMonth) {
          week.push(<View key={`cell-${cellKey++}`} style={styles.dayCell} />);
        } else {
          const date = new Date(year, month, dayCount);
          const dateStr = toDateStr(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          // Check for dots — match by scheduledDate (YYYY-MM-DD string)
          const hasBooking = bookings.some(b => b.scheduledDate === dateStr);
          const hasBlock = blocks.some(b => dateInBlockRange(dateStr, b));

          week.push(
            <TouchableOpacity 
              key={`cell-${cellKey++}`} 
              style={styles.dayCell}
              onPress={() => setSelectedDate(date)}
            >
              <View style={[
                styles.dayCircle,
                isToday && styles.todayCircle,
                isSelected && !isToday && styles.selectedCircle
              ]}>
                <Text style={[
                  styles.dayText,
                  isPast && styles.pastDayText,
                  (isToday || isSelected) && styles.activeDayText
                ]}>
                  {dayCount}
                </Text>
              </View>
              <View style={styles.dotsRow}>
                {hasBooking && <View style={[styles.dot, { backgroundColor: colors.green }]} />}
                {hasBlock && <View style={[styles.dot, { backgroundColor: '#BF6000' }]} />}
              </View>
            </TouchableOpacity>
          );
          dayCount++;
        }
      }
      grid.push(<View key={`row-${row}`} style={styles.weekRow}>{week}</View>);
      if (dayCount > daysInMonth) break;
    }
    return grid;
  };

  const getSelectedDayItems = () => {
    const dateStr = toDateStr(selectedDate);

    const dayBookings = bookings.filter(b => b.scheduledDate === dateStr);
    const dayBlocks = blocks.filter(b => dateInBlockRange(dateStr, b));

    return { dayBookings, dayBlocks };
  };

  const { dayBookings, dayBlocks } = getSelectedDayItems();
  
  const potentialEarnings = dayBookings
    .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.status === 'IN_PROGRESS')
    .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terminkalender</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(provider)/block-time')}>
          <Feather name="plus" size={24} color={colors.coral} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.chevronBtn}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
        <View style={styles.monthRightRow}>
          <TouchableOpacity onPress={handleJumpToToday} style={styles.todayPill}>
            <Text style={styles.todayPillText}>Heute</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth} style={styles.chevronBtn}>
            <Feather name="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daysHeaderRow}>
        {DAYS.map((d, i) => <Text key={i} style={styles.dayHeaderText}>{d}</Text>)}
      </View>

      <View style={styles.calendarGrid}>
        {isLoading ? (
          <View style={styles.calendarLoader}><ActivityIndicator color={colors.coral} /></View>
        ) : (
          renderCalendarGrid()
        )}
      </View>

      <ScrollView style={styles.agendaContainer} contentContainerStyle={styles.agendaContent}>
        <Text style={styles.agendaDateHeading}>
          {selectedDate.getDate()}. {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </Text>

        <Text style={styles.earningsText}>Gewinnpotenzial heute: €{potentialEarnings.toFixed(0)}</Text>

        {dayBookings.length === 0 && dayBlocks.length === 0 ? (
          <Text style={styles.emptyText}>Keine Termine für diesen Tag</Text>
        ) : (
          <>
            {dayBlocks.map(block => (
              <View key={block.id} style={styles.blockCard}>
                <Text style={styles.blockTitle}>🚫 Blockiert: {block.reason || 'Kein Grund angegeben'}</Text>
                <Text style={styles.blockTime}>
                  {block.isAllDay ? 'Ganztägig' : `${block.startTime || ''} – ${block.endTime || ''}`}
                </Text>
              </View>
            ))}

            {dayBookings.map(booking => (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.bookingCard}
                onPress={() =>
                  router.push({
                    pathname:
                      booking.status === 'PENDING'
                        ? ('/(provider)/booking-request/[id]' as any)
                        : ('/(provider)/appointments/[id]' as any),
                    params: { id: booking.id },
                  })
                }
              >
                <View style={styles.bookingCardInner}>
                  <View style={styles.bookingHeaderRow}>
                    <Text style={styles.bookingTime}>{booking.scheduledTime || '—'}</Text>
                    <View style={[
                      styles.statusBadge, 
                      booking.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusPending
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        booking.status === 'CONFIRMED' ? styles.statusConfirmedText : styles.statusPendingText
                      ]}>
                        {bookingStatusLabel(booking.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingClient}>{booking.client?.firstName} {booking.client?.lastName}</Text>
                  <View style={styles.bookingServiceRow}>
                    <View style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{booking.services?.[0]?.name || 'Service'}</Text>
                    </View>
                    <Text style={styles.bookingPrice}>€{Number(booking.totalPrice).toFixed(0)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(provider)/block-time')}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  addButton: { padding: spacing.xs },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  monthText: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.primary },
  chevronBtn: { padding: spacing.xs },
  monthRightRow: { flexDirection: 'row', alignItems: 'center' },
  todayPill: {
    backgroundColor: colors.tealLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  todayPillText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.teal },

  daysHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  calendarGrid: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  calendarLoader: { height: 200, justifyContent: 'center', alignItems: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  dayCell: { flex: 1, alignItems: 'center', height: 44 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  todayCircle: { backgroundColor: colors.coral },
  selectedCircle: { backgroundColor: colors.primary },
  dayText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  pastDayText: { color: colors.textTertiary },
  activeDayText: { color: colors.background, fontFamily: fonts.bodyBold },
  
  dotsRow: { flexDirection: 'row', marginTop: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },

  agendaContainer: { flex: 1, backgroundColor: colors.surfaceCard },
  agendaContent: { padding: spacing.lg, paddingBottom: 80 },
  agendaDateHeading: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary, marginBottom: 4 },
  earningsText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.teal, marginBottom: spacing.lg },

  emptyText: { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: spacing.xl },

  blockCard: {
    backgroundColor: colors.orangeLight,
    borderWidth: 1,
    borderColor: '#BF6000',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#BF6000', marginBottom: 4 },
  blockTime: { fontFamily: fonts.body, fontSize: 14, color: '#BF6000' },

  bookingCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: spacing.md,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.green,
  },
  bookingCardInner: { padding: spacing.md },
  bookingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookingTime: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  bookingClient: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  bookingServiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceChip: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  serviceChipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  bookingPrice: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusConfirmed: { backgroundColor: colors.greenLight },
  statusPending: { backgroundColor: colors.orangeLight },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 10 },
  statusConfirmedText: { color: colors.green },
  statusPendingText: { color: colors.orange },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
    elevation: 6,
  },
});
