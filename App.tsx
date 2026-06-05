import 'react-native-reanimated';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, useColorScheme, Pressable,
} from 'react-native';
import {
  PaperProvider, Appbar, Surface, Text, Button, Dialog, Portal,
  IconButton, MD3LightTheme, MD3DarkTheme, useTheme,
} from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor,
} from 'react-native-reanimated';

// ─── Theme ───────────────────────────────────────────────────────────────────

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1B9E75',
    primaryContainer: '#C8F0DF',
    onPrimaryContainer: '#00382A',
    background: '#F8FAF8',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F4F0',
    onSurface: '#1A1C1A',
    onSurfaceVariant: '#424942',
    outline: '#72796F',
    outlineVariant: '#C2C9BD',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6DDCB0',
    primaryContainer: '#00513D',
    onPrimaryContainer: '#89F8CB',
    background: '#101410',
    surface: '#1A1C1A',
    surfaceVariant: '#2A2E2A',
    onSurface: '#E2E3DC',
    onSurfaceVariant: '#C2C9BD',
    outline: '#8C9389',
    outlineVariant: '#424942',
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

type CamKey = 'a' | 'b' | 'ronin';

const CAM_COLS = [
  { key: 'a' as CamKey,     label: 'A Cam',  color: '#1B9E75' },
  { key: 'b' as CamKey,     label: 'B Cam',  color: '#1A6BC4' },
  { key: 'ronin' as CamKey, label: 'Ronin',  color: '#D4541E' },
];

const CAM_ITEMS = [
  { id: 'battery',      label: 'Battery Charged' },
  { id: 'sdcard',       label: 'SD Card Installed' },
  { id: 'format',       label: 'Card Formatted' },
  { id: 'resolution',   label: 'Resolution Matches' },
  { id: 'framerate',    label: 'Frame Rate Matches' },
  { id: 'shutter',      label: 'Shutter Matches' },
  { id: 'profile',      label: 'Picture Profile Matches' },
  { id: 'wb',           label: 'White Balance Matches' },
  { id: 'lens',         label: 'Lens Clean' },
  { id: 'exposure',     label: 'Exposure Checked' },
  { id: 'focus',        label: 'Focus Confirmed' },
  { id: 'monitor',      label: 'Reviewed on Large Monitor' },
  { id: 'recindicator', label: 'Recording Indicator Visible' },
];

const SIMPLE_SECTIONS = [
  {
    id: 'audio', title: 'Audio', subtitle: 'DJI Mic Mini 2', accent: undefined,
    items: [
      { id: 'tx_on',      label: 'Transmitters On' },
      { id: 'rx_on',      label: 'Receiver On' },
      { id: 'batteries',  label: 'Batteries Checked' },
      { id: 'stereo',     label: 'Stereo Output Enabled' },
      { id: 'signal',     label: 'Signal Confirmed' },
      { id: 'levels',     label: 'Levels ~−12 dB' },
      { id: 'headphones', label: 'Headphone Check Done' },
      { id: 'test_rec',   label: 'Test Recording Reviewed' },
    ],
  },
  {
    id: 'talent', title: 'Talent & Set', subtitle: undefined, accent: undefined,
    items: [
      { id: 'hair',         label: 'Hair Checked' },
      { id: 'clothing',     label: 'Clothing Checked' },
      { id: 'mic_place',    label: 'Mic Placement Checked' },
      { id: 'reflections',  label: 'Reflections Checked' },
      { id: 'background',   label: 'Background Approved' },
      { id: 'distractions', label: 'Distractions Removed' },
    ],
  },
  {
    id: 'test', title: '30-Second Test Recording', subtitle: undefined, accent: undefined,
    items: [
      { id: 'rec_clip',     label: 'Record Test Clip' },
      { id: 'rev_focus',    label: 'Review Focus' },
      { id: 'rev_exposure', label: 'Review Exposure' },
      { id: 'rev_audio',    label: 'Review Audio' },
      { id: 'approval',     label: 'Team Approval' },
    ],
  },
  {
    id: 'take', title: 'Before Every Take', subtitle: undefined, accent: '#1B9E75',
    items: [
      { id: 'take_focus',     label: 'Focus' },
      { id: 'take_exp',       label: 'Exposure' },
      { id: 'take_audio',     label: 'Audio' },
      { id: 'take_reclights', label: 'Rec Lights On' },
      { id: 'take_talent',    label: 'Talent Ready' },
      { id: 'take_roll',      label: 'Roll Cameras' },
    ],
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'preflight_v1';

type CamState = Record<string, Record<CamKey, boolean>>;
type SimpleState = Record<string, boolean>;
type AppState = { cam: CamState; simple: SimpleState; project: string; date: string; res: string; fps: string; shutter: string; profile: string; wb: string };

function defaultAppState(): AppState {
  const cam: CamState = {};
  CAM_ITEMS.forEach(i => { cam[i.id] = { a: false, b: false, ronin: false }; });
  const simple: SimpleState = {};
  SIMPLE_SECTIONS.forEach(s => s.items.forEach(i => { simple[i.id] = false; }));
  return { cam, simple, project: '', date: new Date().toISOString().split('T')[0], res: '', fps: '', shutter: '', profile: '', wb: '' };
}

function countProgress(state: AppState) {
  const total = CAM_ITEMS.length * 3 + SIMPLE_SECTIONS.reduce((a, s) => a + s.items.length, 0);
  let done = 0;
  CAM_ITEMS.forEach(i => { done += Object.values(state.cam[i.id] || {}).filter(Boolean).length; });
  SIMPLE_SECTIONS.forEach(s => s.items.forEach(i => { if (state.simple[i.id]) done++; }));
  return { done, total };
}

// ─── Animated Checkbox ────────────────────────────────────────────────────────

function CamCb({ checked, color, onToggle }: { checked: boolean; color: string; onToggle: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const prog = useSharedValue(checked ? 1 : 0);
  useEffect(() => { prog.value = withTiming(checked ? 1 : 0, { duration: 180 }); }, [checked]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(prog.value, [0, 1], [theme.colors.surfaceVariant, color]),
    borderColor: interpolateColor(prog.value, [0, 1], [theme.colors.outline, color]),
  }));
  return (
    <Pressable onPress={() => {
      scale.value = withSpring(0.8, { damping: 10, stiffness: 300 }, () => { scale.value = withSpring(1); });
      onToggle();
    }} hitSlop={8}>
      <Animated.View style={[cbStyles.circle, aStyle]}>
        {checked && <Text style={cbStyles.tick}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

function SqCb({ checked, onToggle, color }: { checked: boolean; onToggle: () => void; color: string }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const prog = useSharedValue(checked ? 1 : 0);
  useEffect(() => { prog.value = withTiming(checked ? 1 : 0, { duration: 180 }); }, [checked]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(prog.value, [0, 1], ['transparent', color]),
    borderColor: interpolateColor(prog.value, [0, 1], [theme.colors.outline, color]),
  }));
  return (
    <Pressable onPress={() => {
      scale.value = withSpring(0.78, { damping: 10, stiffness: 350 }, () => { scale.value = withSpring(1); });
      onToggle();
    }} hitSlop={10}>
      <Animated.View style={[cbStyles.square, aStyle]}>
        {checked && <Text style={cbStyles.tick}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

const cbStyles = StyleSheet.create({
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  square: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16, includeFontPadding: false },
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  const pct = total > 0 ? done / total : 0;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(pct, { duration: 400 }); }, [pct]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return (
    <View style={[pbStyles.row]}>
      <View style={[pbStyles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View style={[pbStyles.fill, { backgroundColor: pct >= 1 ? '#1B9E75' : theme.colors.primary }, fillStyle]} />
      </View>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 44, textAlign: 'right' }}>{done}/{total}</Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

// ─── Cam Row ──────────────────────────────────────────────────────────────────

function CamRow({ label, rowState, isLast, onToggle }: {
  label: string;
  rowState: Record<CamKey, boolean>;
  isLast: boolean;
  onToggle: (col: CamKey) => void;
}) {
  const theme = useTheme();
  const allDone = CAM_COLS.every(c => rowState[c.key]);
  const prog = useSharedValue(allDone ? 1 : 0);
  useEffect(() => { prog.value = withTiming(allDone ? 1 : 0, { duration: 250 }); }, [allDone]);
  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(prog.value, [0, 1], [theme.colors.surface, theme.colors.primaryContainer]),
  }));
  return (
    <Animated.View style={[camStyles.row, !isLast && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.outlineVariant }, rowStyle]}>
      <Text variant="bodyMedium" style={{ flex: 1, color: allDone ? theme.colors.onPrimaryContainer : theme.colors.onSurface }} numberOfLines={1}>{label}</Text>
      <View style={camStyles.cams}>
        {CAM_COLS.map(col => (
          <View key={col.key} style={camStyles.cell}>
            <CamCb checked={rowState[col.key]} color={col.color} onToggle={() => onToggle(col.key)} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const camStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 16, minHeight: 48 },
  cams: { flexDirection: 'row' },
  cell: { width: 56, alignItems: 'center', justifyContent: 'center' },
});

// ─── Simple Row ───────────────────────────────────────────────────────────────

function SimpleRow({ label, checked, onToggle, accent, isLast, isRight }: {
  label: string; checked: boolean; onToggle: () => void;
  accent: string; isLast: boolean; isRight: boolean;
}) {
  const theme = useTheme();
  const prog = useSharedValue(checked ? 1 : 0);
  useEffect(() => { prog.value = withTiming(checked ? 1 : 0, { duration: 200 }); }, [checked]);
  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(prog.value, [0, 1], [theme.colors.surface, theme.colors.primaryContainer]),
  }));
  return (
    <Animated.View style={[
      sqStyles.item,
      !isLast && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.outlineVariant },
      !isRight && { borderRightWidth: 0.5, borderRightColor: theme.colors.outlineVariant },
      rowStyle,
    ]}>
      <Pressable style={sqStyles.inner} onPress={onToggle}>
        <SqCb checked={checked} onToggle={onToggle} color={accent} />
        <Text variant="bodyMedium" style={{ flex: 1, color: checked ? theme.colors.onPrimaryContainer : theme.colors.onSurface }} numberOfLines={2}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const sqStyles = StyleSheet.create({
  item: { width: '50%', minHeight: 48 },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 48 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

function ChecklistScreen({ onToggleTheme, isDark }: { onToggleTheme: () => void; isDark: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<AppState>(defaultAppState());
  const [loaded, setLoaded] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) { try { setState(JSON.parse(raw)); } catch {} }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const toggleCam = useCallback((itemId: string, col: CamKey) => {
    setState(prev => ({
      ...prev,
      cam: { ...prev.cam, [itemId]: { ...prev.cam[itemId], [col]: !prev.cam[itemId][col] } },
    }));
  }, []);

  const toggleSimple = useCallback((itemId: string) => {
    setState(prev => ({ ...prev, simple: { ...prev.simple, [itemId]: !prev.simple[itemId] } }));
  }, []);

  const setField = (key: keyof AppState) => (val: string) => setState(prev => ({ ...prev, [key]: val }));

  const { done, total } = countProgress(state);
  if (!loaded) return null;

  return (
    <View style={[scStyles.root, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[scStyles.appbar, { backgroundColor: theme.colors.surface, paddingTop: insets.top }]} elevated>
        <Appbar.Content title="Pre-Flight" titleStyle={{ fontSize: 18, fontWeight: '700' }} />
        <IconButton icon={isDark ? 'weather-sunny' : 'weather-night'} onPress={onToggleTheme} iconColor={theme.colors.onSurface} />
        <IconButton icon="refresh" onPress={() => setResetDialog(true)} iconColor={theme.colors.error} />
      </Appbar.Header>

      <ScrollView style={scStyles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>

        {/* Settings Card */}
        <Surface style={[scStyles.settingsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <SettingsRow state={state} setField={setField} theme={theme} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <ProgressBar done={done} total={total} />
          </View>
        </Surface>

        <View style={{ height: 16 }} />

        {/* Camera Section */}
        <Surface style={scStyles.card} elevation={1}>
          <View style={[scStyles.cardHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
            <View style={{ flex: 1 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Camera Checks</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Sony A7S III (A & B) · DJI Ronin</Text>
            </View>
            <View style={camStyles.cams}>
              {CAM_COLS.map(col => (
                <View key={col.key} style={camStyles.cell}>
                  <Text variant="labelSmall" style={{ color: col.color, fontWeight: '700' }}>{col.label}</Text>
                </View>
              ))}
            </View>
          </View>
          {CAM_ITEMS.map((item, idx) => (
            <CamRow
              key={item.id}
              label={item.label}
              rowState={state.cam[item.id] || { a: false, b: false, ronin: false }}
              isLast={idx === CAM_ITEMS.length - 1}
              onToggle={col => toggleCam(item.id, col)}
            />
          ))}
        </Surface>

        {/* Simple Sections */}
        {SIMPLE_SECTIONS.map(section => {
          const accent = section.accent || theme.colors.primary;
          const allDone = section.items.every(i => state.simple[i.id]);
          const cols = 2;
          return (
            <Surface key={section.id} style={scStyles.card} elevation={1}>
              <View style={[
                scStyles.cardHeader,
                { borderBottomColor: section.accent ? section.accent + '44' : theme.colors.outlineVariant },
                allDone && { backgroundColor: theme.colors.primaryContainer },
              ]}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelLarge" style={{ color: allDone ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>{section.title}</Text>
                  {section.subtitle && <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{section.subtitle}</Text>}
                </View>
                {allDone && <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>All done ✓</Text>}
              </View>
              <View style={scStyles.simpleGrid}>
                {section.items.map((item, idx) => (
                  <SimpleRow
                    key={item.id}
                    label={item.label}
                    checked={!!state.simple[item.id]}
                    onToggle={() => toggleSimple(item.id)}
                    accent={accent}
                    isLast={idx >= section.items.length - cols}
                    isRight={(idx + 1) % cols === 0}
                  />
                ))}
              </View>
            </Surface>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={resetDialog} onDismiss={() => setResetDialog(false)}>
          <Dialog.Title>Reset checklist?</Dialog.Title>
          <Dialog.Content><Text variant="bodyMedium">This will clear all checks and project info.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialog(false)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={() => { setState(defaultAppState()); setResetDialog(false); }}>Reset</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

import { TextInput as RNTextInput } from 'react-native';

function SettingsRow({ state, setField, theme }: { state: AppState; setField: (k: keyof AppState) => (v: string) => void; theme: any }) {
  const inputStyle = [scStyles.settingInput, { borderColor: theme.colors.outlineVariant, color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceVariant }];
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={scStyles.topInputRow}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>PROJECT</Text>
          <RNTextInput
            style={[inputStyle, { fontSize: 15, paddingHorizontal: 10, height: 40, borderRadius: 8 }]}
            placeholder="Project name…"
            placeholderTextColor={theme.colors.outline}
            value={state.project}
            onChangeText={setField('project')}
          />
        </View>
        <View style={{ width: 130 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>DATE</Text>
          <RNTextInput
            style={[inputStyle, { fontSize: 14, paddingHorizontal: 10, height: 40, borderRadius: 8 }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.outline}
            value={state.date}
            onChangeText={setField('date')}
          />
        </View>
      </View>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10, marginBottom: 4 }}>PROJECT SETTINGS</Text>
      <View style={scStyles.settingsRow}>
        {([['res','Resolution','4K'],['fps','FPS','24'],['shutter','Shutter','1/48'],['profile','Profile','S-Log3'],['wb','WB (K)','5600']] as const).map(([key, label, ph]) => (
          <View key={key} style={{ flex: 1, minWidth: 56 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 3, textAlign: 'center', fontSize: 10 }}>{label}</Text>
            <RNTextInput
              style={[inputStyle, { fontSize: 13, paddingHorizontal: 6, height: 36, borderRadius: 7, textAlign: 'center' }]}
              placeholder={ph}
              placeholderTextColor={theme.colors.outline}
              value={state[key as keyof AppState] as string}
              onChangeText={setField(key as keyof AppState)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const scStyles = StyleSheet.create({
  root: { flex: 1 },
  appbar: { elevation: 2 },
  scroll: { flex: 1 },
  settingsCard: { borderRadius: 12, overflow: 'hidden', paddingTop: 12 },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  simpleGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  topInputRow: { flexDirection: 'row', gap: 8 },
  settingsRow: { flexDirection: 'row', gap: 6 },
  settingInput: { borderWidth: 1, borderRadius: 8 },
  inputBox: { borderWidth: 1, borderRadius: 8, height: 40, paddingHorizontal: 10, justifyContent: 'center' },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const systemScheme = useColorScheme();
  const [manualDark, setManualDark] = useState<boolean | null>(null);
  const isDark = manualDark !== null ? manualDark : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ChecklistScreen
          onToggleTheme={() => setManualDark(d => d === null ? !isDark : !d)}
          isDark={isDark}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
