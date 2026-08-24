/**
 * SoundGuard — Safety Circle
 * ─────────────────────────────────────────────────────────────────────────────
 * The people who receive an SOS. Contacts live in AsyncStorage; the two
 * SOS-related switches shown here are the same shared settings the SOS screen
 * reads at dispatch time, so changing one here changes what actually gets sent.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, Divider, EmptyState, ScreenHeader, SectionLabel, SettingRow } from '@/components/ui';
import { alpha, radius, space, typography as typeScale } from '@/constants/theme';
import { useSettings } from '@/providers/SettingsProvider';
import { useResponsive } from '@/hooks/useResponsive';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import {
  deleteContact,
  getContacts,
  saveContact,
  type EmergencyContact,
} from '@/utils/storage';

const AVATAR_TINTS = ['#5B8CFF', '#34D399', '#F5A524', '#F0475C', '#A78BFA', '#38BDF8', '#F472B6'];

function avatarTint(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length] as string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: {},

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: alpha(c.primary, 0.4),
    backgroundColor: c.primarySoft,
  },
  addIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(c.primary, 0.16),
  },
  addInfo: { flex: 1 },
  addTitle: { ...typeScale.subtitle, color: c.primary },
  addDesc: { ...typeScale.caption, color: c.textSecondary, marginTop: 2 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { ...typeScale.subtitle, color: c.text },
  contactPhone: { ...typeScale.caption, color: c.textMuted, marginTop: 2 },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.criticalSoft,
  },

  info: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginTop: space.lg },
  infoText: { flex: 1, ...typeScale.caption, color: c.textMuted, lineHeight: 19 },

  // Modal
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
  sheet: {
    backgroundColor: c.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: space.md,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderStrong,
    alignSelf: 'center',
    marginBottom: space.xl,
  },
  sheetTitle: { ...typeScale.title, color: c.text },
  sheetDesc: { ...typeScale.caption, color: c.textMuted, marginTop: 6, lineHeight: 19 },
  field: { marginTop: space.xl },
  fieldLabel: { ...typeScale.overline, color: c.textSecondary, textTransform: 'uppercase', marginBottom: space.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  input: { flex: 1, height: 50, ...typeScale.body, color: c.text },
  sheetActions: { flexDirection: 'row', gap: space.md, marginTop: space.xxl },
  flex: { flex: 1 },
  flexWide: { flex: 2 },
}));

export default function CircleScreen() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { settings, update } = useSettings();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const stored = await getContacts();
        if (cancelled) return;
        setContacts(stored);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setName('');
    setPhone('');
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Enter the name of the person you want to alert.');
      return;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 6) {
      Alert.alert('Check the number', 'Enter a phone number that can receive SMS.');
      return;
    }

    setSaving(true);
    const contact: EmergencyContact = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      phone: trimmedPhone,
      createdAt: Date.now(),
    };
    try {
      await saveContact(contact);
      setContacts((prev) => [...prev, contact]);
      closeSheet();
    } catch {
      Alert.alert('Could not save', 'Something went wrong writing to local storage.');
    } finally {
      setSaving(false);
    }
  }, [closeSheet, name, phone]);

  const handleRemove = useCallback((contact: EmergencyContact) => {
    Alert.alert('Remove contact', `Remove ${contact.name} from your Safety Circle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteContact(contact.id);
          setContacts((prev) => prev.filter((x) => x.id !== contact.id));
        },
      },
    ]);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: r.hPadding, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Safety Circle" subtitle="Who gets alerted when you need help" />

        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Add emergency contact"
          android_ripple={{ color: alpha(c.primary, 0.12) }}
          style={({ pressed }) => [styles.addCard, pressed && { opacity: 0.75 }]}
        >
          <View style={styles.addIcon}>
            <Ionicons name="person-add-outline" size={20} color={c.primary} />
          </View>
          <View style={styles.addInfo}>
            <Text style={styles.addTitle}>Add a contact</Text>
            <Text style={styles.addDesc}>They receive an SMS the moment an SOS is dispatched</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.primary} />
        </Pressable>

        <SectionLabel icon="people-outline">
          {`Contacts (${contacts.length})`}
        </SectionLabel>

        {loading ? (
          <Card>
            <ActivityIndicator color={c.primary} />
          </Card>
        ) : contacts.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="No one added yet"
              body="Without a contact, an SOS can still be triggered but there is nobody to notify."
            />
          </Card>
        ) : (
          <Card padded={false}>
            {contacts.map((contact, i) => {
              const tint = avatarTint(contact.name);
              return (
                <View key={contact.id}>
                  {i > 0 ? <Divider inset={space.lg} /> : null}
                  <View style={styles.contactRow}>
                    <View style={[styles.avatar, { backgroundColor: alpha(tint, 0.18) }]}>
                      <Text style={[styles.avatarText, { color: tint }]}>
                        {initials(contact.name)}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {contact.name}
                      </Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemove(contact)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${contact.name}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons name="trash-outline" size={17} color={c.critical} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <SectionLabel icon="send-outline">What gets sent</SectionLabel>
        <Card padded={false}>
          <SettingRow
            icon="location-outline"
            tint={c.primary}
            label="Share location"
            description="Attach a map link to the outgoing SOS message."
            value={settings.shareLocation}
            onValueChange={(v) => update('shareLocation', v)}
          />
          <Divider />
          <SettingRow
            icon="call-outline"
            tint={c.warning}
            label="Offer to call first contact"
            description="Show a one-tap dial after the message is dispatched."
            value={settings.callFirstContact}
            onValueChange={(v) => update('callFirstContact', v)}
          />
        </Card>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={17} color={c.textMuted} />
          <Text style={styles.infoText}>
            SoundGuard opens your messaging app with the alert pre-filled. You confirm the send, so
            an accidental SOS never leaves the device on its own.
          </Text>
        </View>
      </ScrollView>

      {/* ── Add contact sheet ── */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.sheet,
              {
                paddingHorizontal: Math.max(space.lg, r.hPadding),
                paddingBottom: Math.max(insets.bottom, space.lg) + space.xl,
              },
            ]}
          >
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Add a contact</Text>
            <Text style={styles.sheetDesc}>
              This person receives your location and a short alert when an SOS is dispatched.
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={17} color={c.textMuted} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Nimali Perera"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={17} color={c.textMuted} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. +94 71 234 5678"
                  placeholderTextColor={c.textMuted}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSave()}
                />
              </View>
            </View>

            <View style={styles.sheetActions}>
              <AppButton
                label="Cancel"
                variant="secondary"
                size="lg"
                onPress={closeSheet}
                style={styles.flex}
              />
              <AppButton
                label={saving ? 'Saving…' : 'Save contact'}
                icon="checkmark"
                size="lg"
                disabled={saving}
                onPress={() => void handleSave()}
                style={styles.flexWide}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
