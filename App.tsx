import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Deadline,
  DeadlineType,
  DEADLINE_TYPES,
  TYPE_LABELS,
} from './src/types';
import { loadDeadlines, saveDeadlines } from './src/storage';
import { extractNotice, resolveCourse, Extracted } from './src/extract';
import {
  setupNotifications,
  scheduleForDeadline,
  cancelForDeadline,
  sendTestNotification,
  countScheduled,
  remindersAvailable,
} from './src/reminders';

type TabKey = 'all' | DeadlineType;

// Crampo looks like a Bangladeshi student's khata: ruled paper, a red margin,
// ballpoint-blue ink, a red pen for what is urgent, a highlighter for what is selected.
const C = {
  paper: '#F5F8FC',
  sheet: '#FCFDFF',
  ink: '#14213D',
  inkSoft: '#5A6A88',
  line: '#CBD7EA',
  margin: '#E5707A',
  pen: '#2447D6',
  red: '#D62839',
  highlighter: '#FFE066',
};

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// ---------- date helpers ----------

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Due time is the end of the chosen day
function endOfDay(base: Date, plusDays = 0): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + plusDays);
  d.setHours(23, 59, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Whole calendar days from today to the due day (0 = today, -1 = yesterday)
function daysLeft(iso: string): number {
  const today = startOfDay(new Date()).getTime();
  const due = startOfDay(new Date(iso)).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function summaryLine(deadlines: Deadline[]): string {
  const pending = deadlines
    .filter((d) => !d.done)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  if (pending.length === 0) {
    return 'Nothing due. Add a deadline when a notice comes in.';
  }
  const soon = pending.filter((d) => daysLeft(d.dueAt) <= 7).length;
  const head =
    soon === 0
      ? 'Nothing due within a week.'
      : soon === 1
      ? '1 deadline within a week.'
      : `${soon} deadlines within a week.`;
  const next = pending[0];
  const left = daysLeft(next.dueAt);
  const when =
    left < 0
      ? left === -1
        ? 'is 1 day late'
        : `is ${-left} days late`
      : left === 0
      ? 'is today'
      : left === 1
      ? 'is tomorrow'
      : `is in ${left} days`;
  return `${head} Next: ${next.course} ${TYPE_LABELS[
    next.type
  ].toLowerCase()} ${when}.`;
}

// What the red-margin column shows for a deadline
function marginInfo(d: Deadline): {
  main: string;
  sub: string;
  color: string;
  circled: boolean;
  small: boolean;
} {
  if (d.done) {
    return { main: '✓', sub: 'done', color: C.pen, circled: false, small: false };
  }
  const left = daysLeft(d.dueAt);
  if (left < 0) {
    const n = -left;
    return {
      main: String(n),
      sub: n === 1 ? 'day late' : 'days late',
      color: C.red,
      circled: true,
      small: false,
    };
  }
  if (left === 0) {
    return { main: 'Today', sub: '', color: C.red, circled: true, small: true };
  }
  return {
    main: String(left),
    sub: left === 1 ? 'day left' : 'days left',
    color: left <= 3 ? C.red : C.ink,
    circled: left <= 1,
    small: false,
  };
}

// ---------- app ----------

export default function App() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notifOk, setNotifOk] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // add sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState<Extracted | null>(null);
  const [course, setCourse] = useState('');
  const [type, setType] = useState<DeadlineType>('quiz');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await setupNotifications();
      setNotifOk(ok);
      const list = await loadDeadlines();
      setDeadlines(list);
      setLoaded(true);
      // Re-schedule everything on launch (safe, it replaces old reminders)
      if (ok) list.forEach((d) => scheduleForDeadline(d));
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveDeadlines(deadlines);
  }, [deadlines, loaded]);

  // ----- add sheet -----

  const openSheet = () => {
    setPasteText('');
    setResult(null);
    setCourse('');
    setType('quiz');
    setTitle('');
    setDueDate(null);
    setShowPicker(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setShowPicker(false);
    setSheetOpen(false);
  };

  const onPickDate = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selected) {
      setDueDate(endOfDay(selected));
    }
  };

  // Reads a notice and fills the fields below with whatever it found
  const runExtract = (text: string) => {
    if (!text.trim()) {
      Alert.alert('Nothing to read', 'Paste a notice first.');
      return;
    }
    const r = extractNotice(text, new Date());
    setCourse(r.course ?? '');
    if (r.type) setType(r.type);
    setDueDate(r.dueDate ?? null);
    setTitle(r.details);
    setResult(r);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        Alert.alert('Clipboard is empty', 'Copy a notice first.');
        return;
      }
      setPasteText(text);
      runExtract(text);
    } catch {
      Alert.alert(
        'Could not read the clipboard',
        'Paste the notice into the box instead.'
      );
    }
  };

  const saveDeadline = () => {
    if (!course.trim()) {
      Alert.alert('Course is missing', 'Add a course code, like CSE 4107.');
      return;
    }
    if (!dueDate) {
      Alert.alert('Date is missing', 'Choose a due date.');
      return;
    }
    const item: Deadline = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      course: resolveCourse(course) ?? course.trim(),
      type,
      title: title.trim(),
      dueAt: dueDate.toISOString(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    setDeadlines((prev) => [...prev, item]);
    scheduleForDeadline(item);
    // Show the new deadline: jump to its tab if another tab is open
    if (activeTab !== 'all' && activeTab !== type) setActiveTab(type);
    closeSheet();
  };

  // ----- list actions -----

  const toggleDone = (id: string) => {
    const target = deadlines.find((d) => d.id === id);
    if (!target) return;
    const updated: Deadline = { ...target, done: !target.done };
    setDeadlines((prev) => prev.map((d) => (d.id === id ? updated : d)));
    scheduleForDeadline(updated); // cancels the reminders when marked done
  };

  const removeDeadline = (id: string) => {
    Alert.alert('Delete this deadline?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDeadlines((prev) => prev.filter((d) => d.id !== id));
          cancelForDeadline(id);
        },
      },
    ]);
  };

  const onTestReminder = async () => {
    if (!remindersAvailable()) {
      Alert.alert(
        'Reminders need the Crampo app',
        'They do not run inside Expo Go.'
      );
      return;
    }
    if (!notifOk) {
      const ok = await setupNotifications();
      setNotifOk(ok);
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Allow notifications for Crampo in your phone settings.'
        );
        return;
      }
    }
    await sendTestNotification();
    Alert.alert(
      'Test reminder scheduled',
      'Press the Home button now. It should arrive in about 5 seconds.'
    );
  };

  const onCheckScheduled = async () => {
    if (!remindersAvailable()) {
      Alert.alert(
        'Reminders are off in Expo Go',
        'They work in the Crampo app.'
      );
      return;
    }
    const n = await countScheduled();
    Alert.alert('Scheduled reminders', `${n} reminder(s) are waiting to fire.`);
  };

  // What the typed course will be saved as ("ml" becomes "Machine Learning")
  const resolvedCourse = resolveCourse(course);

  // ----- tabs and list -----

  const pending: Record<string, number> = {};
  const total: Record<string, number> = {};
  for (const t of DEADLINE_TYPES) {
    pending[t] = 0;
    total[t] = 0;
  }
  for (const d of deadlines) {
    total[d.type] += 1;
    if (!d.done) pending[d.type] += 1;
  }
  const allPending = deadlines.filter((d) => !d.done).length;

  // A type tab shows up once it has at least one deadline
  const tabs: TabKey[] = [
    'all',
    ...DEADLINE_TYPES.filter((t) => total[t] > 0 || t === activeTab),
  ];

  const sorted = [...deadlines]
    .filter((d) => activeTab === 'all' || d.type === activeTab)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Crampo</Text>
        <Text style={styles.tagline}>Beat the deadline rush.</Text>

        {!notifOk && (
          <Text style={styles.warn}>
            Notifications are off, so reminders will not show. Allow them in your
            phone settings.
          </Text>
        )}

        <Text style={styles.summary}>{summaryLine(deadlines)}</Text>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab;
            const count = tab === 'all' ? allPending : pending[tab];
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab === 'all' ? 'All' : TYPE_LABELS[tab]}
                  {count > 0 ? `  ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* The ruled page */}
        <View style={styles.list}>
          <View style={styles.marginLine} pointerEvents="none" />
          {sorted.length === 0 && (
            <Text style={styles.empty}>
              {deadlines.length === 0
                ? 'No deadlines yet. Tap Add deadline and paste a notice.'
                : 'Nothing in this tab yet.'}
            </Text>
          )}
          {sorted.map((d) => {
            const m = marginInfo(d);
            return (
              <Pressable
                key={d.id}
                onPress={() => toggleDone(d.id)}
                onLongPress={() => removeDeadline(d.id)}
                accessibilityRole="button"
                accessibilityLabel={`${d.course} ${TYPE_LABELS[d.type]}, due ${formatDate(
                  new Date(d.dueAt)
                )}`}
                style={[styles.row, d.done && styles.rowDone]}
              >
                <View style={styles.marginCol}>
                  <View
                    style={[
                      styles.mark,
                      m.circled && { borderColor: C.red },
                    ]}
                  >
                    <Text
                      style={[
                        styles.markMain,
                        { color: m.color },
                        m.small && styles.markMainSmall,
                      ]}
                    >
                      {m.main}
                    </Text>
                  </View>
                  {m.sub ? <Text style={styles.markSub}>{m.sub}</Text> : null}
                </View>
                <View style={styles.body}>
                  <Text style={[styles.course, d.done && styles.strike]}>
                    {d.course}
                    <Text style={styles.typeWord}>
                      {'  '}
                      {TYPE_LABELS[d.type]}
                    </Text>
                  </Text>
                  {d.title ? (
                    <Text style={styles.detail}>{d.title}</Text>
                  ) : null}
                  <Text style={styles.dateLine}>
                    {formatDate(new Date(d.dueAt))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Tap to mark done. Press and hold to delete.</Text>

        {/* Reminders */}
        <Text style={styles.sectionTitle}>Reminders</Text>
        <Text style={styles.sectionText}>
          Crampo reminds you at 8 PM the day before and 8 AM on the due day. Exams
          also get one 3 days before.
        </Text>
        <View style={styles.linkRow}>
          <Pressable onPress={onTestReminder}>
            <Text style={styles.link}>Send a test reminder</Text>
          </Pressable>
          <Pressable onPress={onCheckScheduled}>
            <Text style={styles.link}>Check scheduled</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add deadline button */}
      <Pressable style={styles.fab} onPress={openSheet}>
        <Text style={styles.fabText}>+ Add deadline</Text>
      </Pressable>

      {/* Add deadline sheet */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add a deadline</Text>
              <Pressable onPress={closeSheet} hitSlop={12}>
                <Text style={styles.link}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetBody}
            >
              <Text style={styles.fieldLabel}>Paste the notice</Text>
              <TextInput
                style={styles.pasteBox}
                placeholder="CSE 4107 Quiz 2 on Sunday, chapters 4-5"
                placeholderTextColor={C.inkSoft}
                value={pasteText}
                onChangeText={setPasteText}
                multiline
              />
              <View style={styles.pasteActions}>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={pasteFromClipboard}
                >
                  <Text style={styles.outlineBtnText}>Paste from clipboard</Text>
                </Pressable>
                <Pressable
                  style={styles.penBtn}
                  onPress={() => runExtract(pasteText)}
                >
                  <Text style={styles.penBtnText}>Read notice</Text>
                </Pressable>
              </View>

              {result && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteTitle}>
                    {result.notes.length > 0
                      ? 'Check these'
                      : 'Notice read. Check the fields below.'}
                  </Text>
                  {result.notes.map((n) => (
                    <Text key={n} style={styles.noteText}>
                      {n}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Course</Text>
              <TextInput
                style={styles.lineInput}
                placeholder="Machine Learning, DBMS or CSE 3521"
                placeholderTextColor={C.inkSoft}
                value={course}
                onChangeText={setCourse}
                autoCapitalize="words"
              />
              {resolvedCourse &&
              resolvedCourse.toLowerCase() !== course.trim().toLowerCase() ? (
                <Text style={styles.courseHint}>
                  Will be saved as {resolvedCourse}
                </Text>
              ) : null}

              <Text style={styles.fieldLabel}>Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeRow}
                keyboardShouldPersistTaps="handled"
              >
                {DEADLINE_TYPES.map((t) => {
                  const active = type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {TYPE_LABELS[t]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Due date</Text>
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowPicker(true)}
              >
                <Text
                  style={[styles.dateText, !dueDate && styles.datePlaceholder]}
                >
                  {dueDate ? formatDate(dueDate) : 'Choose a date'}
                </Text>
                <Text style={styles.dateAction}>
                  {dueDate ? 'Change' : 'Choose'}
                </Text>
              </Pressable>

              {showPicker && (
                <DateTimePicker
                  value={dueDate ?? endOfDay(new Date(), 1)}
                  mode="date"
                  onChange={onPickDate}
                />
              )}

              <Text style={styles.fieldLabel}>Details (optional)</Text>
              <TextInput
                style={styles.lineInput}
                placeholder="chapters 4-5"
                placeholderTextColor={C.inkSoft}
                value={title}
                onChangeText={setTitle}
              />

              <Pressable style={styles.saveBtn} onPress={saveDeadline}>
                <Text style={styles.saveBtnText}>Save deadline</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  container: {
    paddingTop: (RNStatusBar.currentHeight ?? 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 130,
  },

  // header
  brand: {
    color: C.ink,
    fontFamily: SERIF,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: { color: C.inkSoft, fontSize: 15, marginTop: 2, marginBottom: 18 },
  warn: {
    color: C.ink,
    backgroundColor: C.highlighter,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    fontSize: 13,
  },
  summary: {
    color: C.ink,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 18,
  },

  // tabs
  tabScroll: { flexGrow: 0, marginBottom: 14 },
  tabRow: { paddingRight: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 4,
  },
  tabActive: { backgroundColor: C.highlighter },
  tabText: { color: C.inkSoft, fontSize: 15 },
  tabTextActive: { color: C.ink, fontWeight: '700' },

  // ruled page
  list: {
    minHeight: 140,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 72,
    width: 1.5,
    backgroundColor: C.margin,
    opacity: 0.7,
  },
  empty: {
    color: C.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 20,
    paddingLeft: 90,
    paddingRight: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowDone: { opacity: 0.5 },
  marginCol: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  mark: {
    minWidth: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markMain: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: '700',
  },
  markMainSmall: { fontSize: 14, fontFamily: SANS },
  markSub: { color: C.inkSoft, fontSize: 11, marginTop: 2 },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 4,
    justifyContent: 'center',
  },
  course: {
    color: C.ink,
    fontFamily: SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  typeWord: {
    color: C.inkSoft,
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: '400',
  },
  detail: { color: C.ink, fontSize: 14, marginTop: 3 },
  dateLine: { color: C.inkSoft, fontSize: 13, marginTop: 3 },
  strike: { textDecorationLine: 'line-through' },
  hint: {
    color: C.inkSoft,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 32,
  },

  // reminders
  sectionTitle: {
    color: C.ink,
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    color: C.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  linkRow: { flexDirection: 'row', gap: 24 },
  link: {
    color: C.pen,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // add button
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: C.pen,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 15,
    elevation: 5,
  },
  fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // sheet
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 33, 61, 0.5)',
  },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    backgroundColor: C.sheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetTitle: {
    color: C.ink,
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: '700',
  },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 32 },
  fieldLabel: {
    color: C.inkSoft,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  pasteBox: {
    minHeight: 84,
    color: C.ink,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 12,
  },
  pasteActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  outlineBtnText: { color: C.ink, fontSize: 14, fontWeight: '700' },
  penBtn: {
    flex: 1,
    backgroundColor: C.ink,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  penBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  noteBox: {
    backgroundColor: C.highlighter,
    borderRadius: 6,
    padding: 12,
    marginTop: 14,
  },
  noteTitle: { color: C.ink, fontSize: 14, fontWeight: '700' },
  noteText: { color: C.ink, fontSize: 13, lineHeight: 19, marginTop: 4 },
  lineInput: {
    color: C.ink,
    fontSize: 17,
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  courseHint: { color: C.pen, fontSize: 13, fontWeight: '600', marginTop: 6 },
  typeRow: { paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.ink, fontSize: 14 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink,
    paddingVertical: 10,
  },
  dateText: { color: C.ink, fontSize: 17 },
  datePlaceholder: { color: C.inkSoft },
  dateAction: { color: C.pen, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    backgroundColor: C.pen,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
