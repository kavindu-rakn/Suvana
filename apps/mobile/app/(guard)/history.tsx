/**
 * SoundGuard — Detection history
 * ─────────────────────────────────────────────────────────────────────────────
 * A grouped, filterable log of everything the engine has recorded.
 *
 * The list re-reads storage on focus rather than on an interval, and the
 * flattened section structure is memoised, so returning to the tab is cheap
 * even with the full 300-event backlog.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, ScreenHeader, type IconName } from '@/components/ui';
import { alpha, radius, space, threatColors, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import { useSettings } from '@/providers/SettingsProvider';
import {
  SOUND_ICONS,
  clearDetectionLog,
  getDetectionLog,
  isSoundLabel,
  type DetectionEvent,
} from '@/utils/storage';

type Filter = 'all' | 'critical' | 'warning' | 'safe';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Attention' },
  { value: 'safe', label: 'Routine' },
];

type Row =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'event'; key: string; event: DetectionEvent };

function dayLabel(timestamp: number): string {
  const then = new Date(timestamp);
  const now = new Date();

  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';

  return then.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function clockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  header: { paddingTop: space.md },

  stats: { flexDirection: 'row', marginBottom: space.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typeScale.title, color: c.text, fontVariant: ['tabular-nums'] },
  statLabel: {
    ...typeScale.overline,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 4 },

  filters: { flexDirection: 'row', paddingBottom: space.md },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipText: { ...typeScale.caption, color: c.textSecondary },

  list: {},

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xl, paddingBottom: space.sm },
  sectionText: { ...typeScale.overline, color: c.textSecondary, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  sectionCount: { ...typeScale.caption, color: c.textMuted, fontVariant: ['tabular-nums'] },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  cardIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { ...typeScale.bodyStrong, color: c.text },
  cardMeta: { ...typeScale.caption, color: c.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardTime: { ...typeScale.captionStrong, color: c.textSecondary, fontVariant: ['tabular-nums'] },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

  loading: { paddingTop: space.xxxl * 2, alignItems: 'center' },
  footer: { alignItems: 'center', paddingVertical: space.xxl },
  footerText: { ...typeScale.caption, color: c.textMuted },
  privacy: { marginTop: space.md },
  privacyText: { ...typeScale.caption, color: c.textMuted, lineHeight: 18, flex: 1 },
  privacyRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
}));

export default function HistoryScreen() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { settings } = useSettings();

  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const log = await getDetectionLog();
        if (cancelled) return;
        setEvents(log);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const counts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    for (const event of events) {
      if (event.threatLevel === 'critical') critical += 1;
      else if (event.threatLevel === 'warning') warning += 1;
    }
    return { total: events.length, critical, warning };
  }, [events]);

  const rows = useMemo<Row[]>(() => {
    const filtered = filter === 'all' ? events : events.filter((e) => e.threatLevel === filter);

    // Pre-count each day so the section header can show a total.
    const perDay = new Map<string, number>();
    for (const event of filtered) {
      const label = dayLabel(event.timestamp);
      perDay.set(label, (perDay.get(label) ?? 0) + 1);
    }

    const out: Row[] = [];
    let current = '';
    for (const event of filtered) {
      const label = dayLabel(event.timestamp);
      if (label !== current) {
        current = label;
        out.push({ kind: 'header', key: `h-${label}`, label, count: perDay.get(label) ?? 0 });
      }
      out.push({ kind: 'event', key: event.id, event });
    }
    return out;
  }, [events, filter]);

  const confirmClear = useCallback(() => {
    Alert.alert('Clear history', 'Delete every recorded detection? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearDetectionLog();
          setEvents([]);
        },
      },
    ]);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionText}>{item.label}</Text>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionCount}>{item.count}</Text>
          </View>
        );
      }

      const event = item.event;
      const tone = threatColors(c, event.threatLevel);
      const icon = (isSoundLabel(event.rawLabel)
        ? SOUND_ICONS[event.rawLabel]
        : 'volume-high-outline') as IconName;

      return (
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: tone.bg }]}>
            <Ionicons name={icon} size={19} color={tone.fg} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {event.soundName}
            </Text>
            <Text style={styles.cardMeta}>
              {Math.round(event.confidence * 100)}% confidence
              {event.simulated ? ' · simulated' : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardTime}>{clockTime(event.timestamp)}</Text>
            <View style={[styles.tag, { backgroundColor: tone.bg, borderColor: alpha(tone.fg, 0.3) }]}>
              <Text style={[styles.tagText, { color: tone.fg }]}>{tone.label}</Text>
            </View>
          </View>
        </View>
      );
    },
    [c, styles],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: r.hPadding }]}>
        <ScreenHeader
          title="History"
          subtitle="Every sound Suvana has recognised"
          right={
            events.length > 0 ? (
              <AppButton label="Clear" icon="trash-outline" variant="danger" onPress={confirmClear} />
            ) : undefined
          }
        />
      </View>

      <Card style={[styles.stats, { marginHorizontal: r.hPadding }]}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{counts.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: c.critical }]}>{counts.critical}</Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: c.warning }]}>{counts.warning}</Text>
          <Text style={styles.statLabel}>Attention</Text>
        </View>
      </Card>

      <View style={[styles.filters, { paddingHorizontal: r.hPadding, gap: r.gap }]}>
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${option.label}`}
              onPress={() => setFilter(option.value)}
              style={({ pressed }) => [
                styles.chip,
                active && {
                  backgroundColor: c.primarySoft,
                  borderColor: alpha(c.primary, 0.35),
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[styles.chipText, active && { color: c.primary, fontWeight: '700' }]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: r.hPadding, paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={9}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title={filter === 'all' ? 'No detections yet' : 'Nothing in this filter'}
              body={
                filter === 'all'
                  ? 'Start monitoring on the Listen tab. Recognised sounds are recorded here automatically.'
                  : 'Try a different filter to see the rest of your history.'
              }
              action={
                filter !== 'all' ? (
                  <AppButton label="Show all" variant="secondary" onPress={() => setFilter('all')} />
                ) : undefined
              }
            />
          }
          ListFooterComponent={
            rows.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {settings.logSafeEvents
                    ? 'Routine sounds are being logged.'
                    : 'Routine sounds are not logged — enable it in Settings.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
