/**
 * SoundGuard — UI primitives
 * ─────────────────────────────────────────────────────────────────────────────
 * The small, boring building blocks every screen composes from. Keeping them
 * here is what makes both colour schemes consistent: a screen never hard-codes
 * a colour, it picks a primitive.
 */

import React, { memo, type PropsWithChildren, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { alpha, elevation, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { makeStyles, useColors } from '@/providers/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

// ─── Card ────────────────────────────────────────────────────────────────────

const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    overflow: 'hidden',
    ...elevation(1, c.shadow),
  },
  padded: { padding: space.lg },
}));

export function Card({
  children,
  padded = true,
  style,
}: PropsWithChildren<{ padded?: boolean; style?: StyleProp<ViewStyle> }>) {
  const styles = useCardStyles();
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

// ─── Section label ───────────────────────────────────────────────────────────

const useSectionStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xxl,
    marginBottom: space.md,
    paddingHorizontal: space.xs,
  },
  label: {
    ...typeScale.overline,
    color: c.textMuted,
    textTransform: 'uppercase',
  },
}));

export function SectionLabel({ children, icon }: PropsWithChildren<{ icon?: IconName }>) {
  const styles = useSectionStyles();
  const c = useColors();
  return (
    <View style={styles.wrap}>
      {icon ? <Ionicons name={icon} size={13} color={c.textMuted} /> : null}
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

// ─── Screen header ───────────────────────────────────────────────────────────

const useHeaderStyles = makeStyles((c) => ({
  wrap: { paddingBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titles: { flex: 1, paddingRight: space.md },
  title: { ...typeScale.display, color: c.text },
  subtitle: { ...typeScale.body, color: c.textSecondary, marginTop: space.xs },
}));

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const styles = useHeaderStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const useButtonStyles = makeStyles((c) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  md: { paddingVertical: 12, paddingHorizontal: space.lg, minHeight: 44 },
  lg: { paddingVertical: 16, paddingHorizontal: space.xl, minHeight: 54 },

  primary: { backgroundColor: c.primary, borderColor: c.primary },
  secondary: { backgroundColor: c.surfaceAlt, borderColor: c.border },
  ghost: { backgroundColor: 'transparent', borderColor: c.border },
  danger: { backgroundColor: c.criticalSoft, borderColor: alpha(c.critical, 0.4) },

  label: { ...typeScale.bodyStrong },
  labelPrimary: { color: c.onPrimary },
  labelSecondary: { color: c.text },
  labelGhost: { color: c.textSecondary },
  labelDanger: { color: c.critical },

  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  block: { alignSelf: 'stretch' },
}));

export function AppButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  disabled = false,
  block = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useButtonStyles();
  const c = useColors();

  const iconColor =
    variant === 'primary'
      ? c.onPrimary
      : variant === 'danger'
        ? c.critical
        : variant === 'ghost'
          ? c.textSecondary
          : c.text;

  const labelStyle =
    variant === 'primary'
      ? styles.labelPrimary
      : variant === 'danger'
        ? styles.labelDanger
        : variant === 'ghost'
          ? styles.labelGhost
          : styles.labelSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: alpha(c.text, 0.08), borderless: false }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        block && styles.block,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={iconColor} /> : null}
      <Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Icon badge ──────────────────────────────────────────────────────────────

const useBadgeStyles = makeStyles(() => ({
  badge: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
}));

export function IconBadge({
  icon,
  color,
  background,
  size = 38,
}: {
  icon: IconName;
  color: string;
  background: string;
  size?: number;
}) {
  const styles = useBadgeStyles();
  return (
    <View style={[styles.badge, { width: size, height: size, backgroundColor: background }]}>
      <Ionicons name={icon} size={Math.round(size * 0.52)} color={color} />
    </View>
  );
}

// ─── Pill / tag ──────────────────────────────────────────────────────────────

const usePillStyles = makeStyles((c) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...typeScale.captionStrong, color: c.textSecondary },
}));

export function Pill({
  label,
  color,
  background,
  showDot = false,
}: {
  label: string;
  color?: string;
  background?: string;
  showDot?: boolean;
}) {
  const styles = usePillStyles();
  return (
    <View
      style={[
        styles.pill,
        background ? { backgroundColor: background, borderColor: alpha(color ?? '#000', 0.3) } : null,
      ]}
    >
      {showDot && color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.text, color ? { color } : null]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

const useDividerStyles = makeStyles((c) => ({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
}));

export function Divider({ inset = 0 }: { inset?: number }) {
  const styles = useDividerStyles();
  return <View style={[styles.line, inset ? { marginLeft: inset } : null]} />;
}

// ─── Setting row (toggle) ────────────────────────────────────────────────────

const useRowStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  info: { flex: 1 },
  label: { ...typeScale.subtitle, color: c.text },
  desc: { ...typeScale.caption, color: c.textMuted, marginTop: 2, lineHeight: 18 },
  pressed: { backgroundColor: c.surfaceHover },
  value: { ...typeScale.captionStrong, color: c.textSecondary },
}));

export const SettingRow = memo(function SettingRow({
  icon,
  tint,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  icon: IconName;
  tint: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useRowStyles();
  const c = useColors();

  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <IconBadge icon={icon} color={tint} background={alpha(tint, 0.14)} />
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: c.borderStrong, true: alpha(c.primary, 0.55) }}
        thumbColor={value ? c.primary : c.surface}
        ios_backgroundColor={c.borderStrong}
      />
    </View>
  );
});

// ─── Setting row (navigational / action) ─────────────────────────────────────

export function ActionRow({
  icon,
  tint,
  label,
  description,
  value,
  onPress,
  destructive = false,
}: {
  icon: IconName;
  tint: string;
  label: string;
  description?: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const styles = useRowStyles();
  const c = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: alpha(c.text, 0.07) }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconBadge icon={icon} color={tint} background={alpha(tint, 0.14)} />
      <View style={styles.info}>
        <Text style={[styles.label, destructive && { color: c.critical }]}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

// ─── Segmented control ───────────────────────────────────────────────────────

const useSegmentStyles = makeStyles((c) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  active: { backgroundColor: c.surface, ...elevation(1, c.shadow) },
  label: { ...typeScale.captionStrong, color: c.textMuted },
  labelActive: { color: c.text },
}));

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const styles = useSegmentStyles();
  const c = useColors();
  const { isNarrow } = useResponsive();

  // On narrow screens the icon and the label compete for the same ~90 dp and
  // the label loses. The label carries the meaning, so the icon goes.
  const showIcons = !isNarrow;

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.active,
              pressed && !active && { opacity: 0.6 },
            ]}
          >
            {showIcons && option.icon ? (
              <Ionicons name={option.icon} size={14} color={active ? c.text : c.textMuted} />
            ) : null}
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

const useEmptyStyles = makeStyles((c) => ({
  wrap: { alignItems: 'center', paddingVertical: space.xxxl * 1.5, paddingHorizontal: space.xxl },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    marginBottom: space.lg,
  },
  title: { ...typeScale.heading, color: c.text, textAlign: 'center' },
  body: {
    ...typeScale.caption,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
}));

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const styles = useEmptyStyles();
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.ring}>
        <Ionicons name={icon} size={30} color={c.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

export type { IconName };
export const textStyles = typeScale;
