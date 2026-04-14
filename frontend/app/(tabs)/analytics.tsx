import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import apiClient from '@/services/api-client';
import { AppColors, AppRadii } from '@/styles/tokens';

interface AttendeeStats {
  assisting: number;
  not_assisting: number;
  pending: number;
}

interface CalendarStat {
  id: number;
  name: string;
  privacy: string;
  subscribers: number;
  likes: number;
  comments: number;
  events_count: number;
}

interface EventStat {
  id: number;
  title: string;
  date: string;
  calendars: string[];
  likes: number;
  saves: number;
  comments: number;
  attendees: AttendeeStats;
}

interface AnalyticsSummary {
  total_calendars: number;
  total_events: number;
  total_likes_calendars: number;
  total_likes_events: number;
  total_subscribers: number;
  total_comments: number;
  total_attendees: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  calendars: CalendarStat[];
  events: EventStat[];
}

const SUMMARY_CARDS: {
  key: keyof AnalyticsSummary;
  label: string;
  icon: any;
  color: string;
  bg: string;
}[] = [
  { key: 'total_subscribers',      label: 'Suscriptores',        icon: 'people',        color: '#2563eb', bg: '#eff6ff' },
  { key: 'total_attendees',        label: 'Asistentes',          icon: 'checkmark-circle', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'total_likes_calendars',  label: 'Likes calendarios',   icon: 'heart',         color: '#db2777', bg: '#fdf2f8' },
  { key: 'total_likes_events',     label: 'Likes eventos',       icon: 'heart-outline', color: '#ea580c', bg: '#fff7ed' },
  { key: 'total_comments',         label: 'Comentarios',         icon: 'chatbubble',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'total_calendars',        label: 'Calendarios',         icon: 'calendar',      color: '#0891b2', bg: '#ecfeff' },
  { key: 'total_events',           label: 'Eventos',             icon: 'flash',         color: '#ca8a04', bg: '#fefce8' },
];

function SummaryCard({
  label, value, icon, color, bg,
}: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <View style={[s.summaryCard, { backgroundColor: bg }]}>
      <View style={[s.summaryIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterButton({
  icon, label, active, onPress,
}: { icon: any; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[s.sortButton, active && s.sortButtonActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={11} color={active ? '#fff' : AppColors.brand} />
      <Text style={[s.sortButtonText, active && s.sortButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({
  icon, title, sorted, onToggle, extra,
}: {
  icon: any;
  title: string;
  sorted: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={16} color={AppColors.brand} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionButtons}>
        {extra}
        <FilterButton icon="trophy" label="Top rated" active={sorted} onPress={onToggle} />
      </View>
    </View>
  );
}

function MetricPill({ icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <View style={[s.pill, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[s.pillText, { color }]}>{value} {label}</Text>
    </View>
  );
}

function RsvpBar({ assisting, not_assisting, pending }: AttendeeStats) {
  const total = assisting + not_assisting + pending;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <View style={s.rsvpContainer}>
      <View style={s.rsvpBar}>
        {assisting > 0 && (
          <View style={[s.rsvpSegment, { flex: assisting, backgroundColor: '#16a34a' }]} />
        )}
        {not_assisting > 0 && (
          <View style={[s.rsvpSegment, { flex: not_assisting, backgroundColor: '#dc2626' }]} />
        )}
        {pending > 0 && (
          <View style={[s.rsvpSegment, { flex: pending, backgroundColor: '#d1d5db' }]} />
        )}
      </View>
      <View style={s.rsvpLegend}>
        <View style={s.rsvpLegendItem}>
          <View style={[s.rsvpDot, { backgroundColor: '#16a34a' }]} />
          <Text style={s.rsvpLegendText}>{assisting} asistirán ({pct(assisting)}%)</Text>
        </View>
        <View style={s.rsvpLegendItem}>
          <View style={[s.rsvpDot, { backgroundColor: '#dc2626' }]} />
          <Text style={s.rsvpLegendText}>{not_assisting} no asistirán ({pct(not_assisting)}%)</Text>
        </View>
        {pending > 0 && (
          <View style={s.rsvpLegendItem}>
            <View style={[s.rsvpDot, { backgroundColor: '#d1d5db' }]} />
            <Text style={s.rsvpLegendText}>{pending} pendiente ({pct(pending)}%)</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarTopRated, setCalendarTopRated] = useState(false);
  const [eventTopRated, setEventTopRated] = useState(false);
  const [eventActive, setEventActive] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const result = await apiClient.get<AnalyticsData>('/analytics/');
      setData(result);
      setError(null);
    } catch {
      setError('No se pudieron cargar las analíticas.');
    }
  };

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (user?.plan !== 'BUSINESS') {
    return (
      <View style={s.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={AppColors.brand} />
        <Text style={s.upgradeTitle}>Plan Business requerido</Text>
        <Text style={s.upgradeText}>Las analíticas están disponibles únicamente en el plan Business.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={AppColors.brand} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={AppColors.danger} />
        <Text style={s.errorText}>{error ?? 'Sin datos.'}</Text>
      </View>
    );
  }

  const { summary } = data;

  const calendars = calendarTopRated
    ? [...data.calendars].sort((a, b) => (b.likes + b.subscribers) - (a.likes + a.subscribers))
    : data.calendars;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const events = (() => {
    let list = eventActive
      ? data.events.filter(ev => {
          const d = new Date(ev.date);
          return d >= today && d <= in7Days;
        })
      : data.events;
    if (eventTopRated) list = [...list].sort((a, b) => (b.likes + b.saves) - (a.likes + a.saves));
    return list;
  })();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.brand} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Analytics</Text>
          <Text style={s.headerSub}>Resumen de tu actividad</Text>
        </View>
        <View style={s.businessBadge}>
          <Ionicons name="star" size={11} color="#fff" />
          <Text style={s.businessBadgeText}>Business</Text>
        </View>
      </View>

      {/* Resumen */}
      <View style={s.summaryGrid}>
        {SUMMARY_CARDS.map(({ key, label, icon, color, bg }) => (
          <SummaryCard key={key} label={label} value={summary[key]} icon={icon} color={color} bg={bg} />
        ))}
      </View>

      {/* Por calendario */}
      {calendars.length > 0 && (
        <>
          <SectionHeader icon="calendar-outline" title="Calendarios" sorted={calendarTopRated} onToggle={() => setCalendarTopRated(v => !v)} />
          {calendars.map((cal) => (
            <View key={cal.id} style={s.card}>
              <View style={s.cardAccent} />
              <View style={s.cardBody}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={1}>{cal.name}</Text>
                  <View style={[s.privacyBadge, cal.privacy === 'PUBLIC' ? s.publicBadge : s.privateBadge]}>
                    <Ionicons
                      name={cal.privacy === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
                      size={10}
                      color={cal.privacy === 'PUBLIC' ? '#0891b2' : '#7c3aed'}
                    />
                    <Text style={[s.privacyText, cal.privacy === 'PUBLIC' ? s.publicText : s.privateText]}>
                      {cal.privacy === 'PUBLIC' ? 'Público' : 'Privado'}
                    </Text>
                  </View>
                </View>
                <View style={s.pillRow}>
                  <MetricPill icon="people"       value={cal.subscribers}  label="suscriptores" color="#2563eb" />
                  <MetricPill icon="heart"         value={cal.likes}        label="likes"        color="#db2777" />
                  <MetricPill icon="chatbubble"    value={cal.comments}     label="comentarios"  color="#7c3aed" />
                  <MetricPill icon="flash"         value={cal.events_count} label="eventos"      color="#ca8a04" />
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Por evento */}
      {events.length > 0 && (
        <>
          <SectionHeader
            icon="flash-outline"
            title="Eventos"
            sorted={eventTopRated}
            onToggle={() => setEventTopRated(v => !v)}
            extra={
              <FilterButton
                icon="time-outline"
                label="Activos"
                active={eventActive}
                onPress={() => setEventActive(v => !v)}
              />
            }
          />
          {events.length === 0 && (
            <View style={s.emptyEvents}>
              <Ionicons name="calendar-outline" size={28} color={AppColors.textMuted} />
              <Text style={s.emptyEventsText}>No hay eventos en los próximos 7 días</Text>
            </View>
          )}
          {events.map((ev) => (
            <View key={ev.id} style={s.card}>
              <View style={[s.cardAccent, { backgroundColor: AppColors.accent }]} />
              <View style={s.cardBody}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={s.cardDate}>{ev.date}</Text>
                </View>
                {ev.calendars.length > 0 && (
                  <Text style={s.cardSubtitle} numberOfLines={1}>
                    <Ionicons name="calendar-outline" size={11} color={AppColors.textMuted} /> {ev.calendars.join(', ')}
                  </Text>
                )}
                <View style={s.pillRow}>
                  <MetricPill icon="heart"             value={ev.likes}                label="likes"        color="#db2777" />
                  <MetricPill icon="bookmark"          value={ev.saves}                label="guardados"    color="#ea580c" />
                  <MetricPill icon="chatbubble"        value={ev.comments}             label="comentarios"  color="#7c3aed" />
                  <MetricPill icon="checkmark-circle"  value={ev.attendees.assisting}  label="asistentes"   color="#16a34a" />
                </View>
                <RsvpBar {...ev.attendees} />
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.brand,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 1,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.brand,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppRadii.pill,
  },
  businessBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Summary grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  summaryCard: {
    borderRadius: AppRadii.md,
    padding: 14,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: AppRadii.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Cards
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: AppRadii.lg,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    backgroundColor: AppColors.brand,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginBottom: 8,
  },

  // Badges
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: AppRadii.pill,
  },
  publicBadge:  { backgroundColor: '#ecfeff' },
  privateBadge: { backgroundColor: '#f5f3ff' },
  privacyText:  { fontSize: 10, fontWeight: '600' },
  publicText:   { color: '#0891b2' },
  privateText:  { color: '#7c3aed' },

  // Metric pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppRadii.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // RSVP bar
  rsvpContainer: {
    marginTop: 12,
  },
  rsvpBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: AppRadii.pill,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  rsvpSegment: {
    height: '100%',
  },
  rsvpLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rsvpLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpDot: {
    width: 7,
    height: 7,
    borderRadius: AppRadii.circle,
  },
  rsvpLegendText: {
    fontSize: 10,
    color: AppColors.textMuted,
    fontWeight: '500',
  },

  sectionButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 6,
  },

  // Empty state for filtered events
  emptyEvents: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyEventsText: {
    fontSize: 13,
    color: AppColors.textMuted,
  },

  // Sort button
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppRadii.pill,
    borderWidth: 1.5,
    borderColor: AppColors.brand,
    backgroundColor: 'transparent',
  },
  sortButtonActive: {
    backgroundColor: AppColors.brand,
    borderColor: AppColors.brand,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.brand,
  },
  sortButtonTextActive: {
    color: '#fff',
  },

  // States
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.brand,
  },
  upgradeText: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: AppColors.danger,
    textAlign: 'center',
  },
});
