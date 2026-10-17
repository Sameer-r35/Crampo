import { DeadlineType } from './types';
import { COURSES, Course } from './courses';

export interface Extracted {
  course?: string;
  type?: DeadlineType;
  dueDate?: Date; // end of the due day
  details: string;
  notes: string[]; // things the user should double-check
}

// ---------- word lists ----------

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, 'জানুয়ারি': 0, 'জানুয়ারী': 0,
  feb: 1, february: 1, 'ফেব্রুয়ারি': 1, 'ফেব্রুয়ারী': 1,
  mar: 2, march: 2, 'মার্চ': 2,
  apr: 3, april: 3, 'এপ্রিল': 3,
  may: 4, 'মে': 4,
  jun: 5, june: 5, 'জুন': 5,
  jul: 6, july: 6, 'জুলাই': 6,
  aug: 7, august: 7, 'আগস্ট': 7,
  sep: 8, sept: 8, september: 8, 'সেপ্টেম্বর': 8,
  oct: 9, october: 9, 'অক্টোবর': 9,
  nov: 10, november: 10, 'নভেম্বর': 10,
  dec: 11, december: 11, 'ডিসেম্বর': 11,
};

// 0 = Sunday ... 6 = Saturday
const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, 'রবিবার': 0, robibar: 0,
  monday: 1, mon: 1, 'সোমবার': 1, sombar: 1, shombar: 1,
  tuesday: 2, tue: 2, tues: 2, 'মঙ্গলবার': 2, mongolbar: 2, mongalbar: 2,
  wednesday: 3, wed: 3, 'বুধবার': 3, budhbar: 3, budbar: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, 'বৃহস্পতিবার': 4,
  brihospotibar: 4, brihoshpotibar: 4, brihaspotibar: 4, brishpotibar: 4,
  friday: 5, fri: 5, 'শুক্রবার': 5, shukrobar: 5, sukrobar: 5,
  saturday: 6, sat: 6, 'শনিবার': 6, shonibar: 6, sonibar: 6,
};

const TYPE_WORDS: Record<DeadlineType, string[]> = {
  quiz: ['quiz', 'ct', 'class\\s+test', 'কুইজ', 'ক্লাস\\s*টেস্ট'],
  exam: [
    'exam', 'exams', 'midterm', 'mid\\s*term', 'mid', 'final', 'finals',
    'viva', 'porikkha', 'pariksha', 'পরীক্ষা', 'মিড', 'ফাইনাল',
  ],
  assignment: [
    'assignment', 'assign', 'asgn', 'homework', 'hw', 'submission',
    'অ্যাসাইনমেন্ট', 'এসাইনমেন্ট',
  ],
  presentation: [
    'presentation', 'presentations', 'ppt', 'pptx',
    'প্রেজেন্টেশন', 'প্রেজেনটেশন',
  ],
  project: ['project', 'proposal', 'প্রজেক্ট'],
  lab: ['lab', 'labs', 'laboratory', 'ল্যাব'],
  other: [],
};

const LABELS: Record<string, string> = {
  quiz: 'Quiz',
  ct: 'CT',
  assignment: 'Assignment',
  presentation: 'Presentation',
  lab: 'Lab',
  project: 'Project',
  exam: 'Exam',
};

// Words that look like a course code (letters + digits) but are not
const NOT_COURSE = new Set([
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept',
  'oct', 'nov', 'dec', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs',
  'fri', 'sat', 'sun', 'room', 'sec', 'page', 'week', 'day', 'quiz', 'exam',
  'test', 'lab', 'mid', 'proj',
]);

// ---------- helpers ----------

// A "word" starts after a space/punctuation and ends before one.
// This avoids matching "কাল" inside "সকাল", or "sun" inside "sunny".
const PRE = '(^|[\\s,.;:!?()\\-"\'/])';
const POST = '(?=$|[\\s,.;:!?()\\-"\'/])';

function wordRegex(words: string[], flags = 'gi'): RegExp {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return new RegExp(PRE + '(' + sorted.join('|') + ')' + POST, flags);
}

// Same length as the original text, so positions line up with the raw notice
function normalize(text: string): string {
  return text
    .replace(/[০-৯]/g, (c) => String(BN_DIGITS.indexOf(c)))
    .toLowerCase();
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 0, 0);
  return x;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return endOfDay(d);
}

function makeDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(y, m, d, 23, 59, 0, 0);
  const ok = dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
  return ok ? dt : null;
}

// No year given: use this year, unless that date is more than 60 days
// in the past, then assume next year.
function resolveDate(
  day: number,
  month: number,
  year: number | undefined,
  now: Date
): Date | null {
  if (year !== undefined) {
    return makeDate(year < 100 ? 2000 + year : year, month, day);
  }
  const thisYear = makeDate(now.getFullYear(), month, day);
  if (!thisYear) return null;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 60);
  if (thisYear < cutoff) return makeDate(now.getFullYear() + 1, month, day);
  return thisYear;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ---------- course catalog matching ----------

type MatchKind = 'safe' | 'strict' | 'guess';

interface Matcher {
  course: Course;
  re: RegExp;
  kind: MatchKind;
  lab: boolean; // matched through a lab code, or a lab-only course
}

interface Pick {
  course: Course;
  lab: boolean;
  guess: boolean;
  text: string; // what the notice actually said
  start: number;
  end: number;
}

function aliasSource(alias: string): string {
  return alias
    .replace(/[.*+^${}()|[\]\\]/g, '\\$&') // escape specials, "?" is kept on purpose
    .replace(/ /g, '[\\s\\-]*');
}

// "CSE 3521" matches cse3521, cse-3521 and CSE 3521
function codeSource(code: string): string {
  const m = /^([A-Z]+)\s(\d+)$/.exec(code);
  if (!m) return aliasSource(code.toLowerCase());
  return `${m[1].toLowerCase()}[\\s\\-]*${m[2]}`;
}

function buildMatchers(): Matcher[] {
  const list: Matcher[] = [];
  const add = (course: Course, source: string, kind: MatchKind, lab: boolean) => {
    list.push({
      course,
      re: new RegExp(PRE + '(' + source + ')' + POST, 'gi'),
      kind,
      lab,
    });
  };
  for (const c of COURSES) {
    const labOnly = !!c.labOnly;
    add(c, codeSource(c.code), 'safe', labOnly);
    if (c.labCode) add(c, codeSource(c.labCode), 'safe', true);
    for (const a of c.aliases) add(c, aliasSource(a), 'safe', labOnly);
    for (const a of c.strict ?? []) add(c, aliasSource(a), 'strict', labOnly);
    for (const a of c.guess ?? []) add(c, aliasSource(a), 'guess', labOnly);
  }
  return list;
}

const MATCHERS = buildMatchers();

// Words that show a short form really is a course: "OS lab", "se ct", "ai er quiz"
const ASSESS = new Set([
  'quiz', 'ct', 'test', 'exam', 'exams', 'mid', 'midterm', 'final', 'finals',
  'viva', 'lab', 'labs', 'laboratory', 'assignment', 'assign', 'asgn', 'hw',
  'presentation', 'ppt', 'project', 'class', 'কুইজ', 'পরীক্ষা', 'ল্যাব',
  'প্রেজেন্টেশন',
]);
const LINKERS = new Set(['er', 'r', 'ar', 'এর']);
const PREV_WORD = /([a-z\u0980-\u09FF]+)[\s\-]*$/;
const NEXT_WORD = /^[\s\-]*([a-z\u0980-\u09FF]+)/;

function nearAssessment(lower: string, start: number, end: number): boolean {
  const prev = PREV_WORD.exec(lower.slice(0, start));
  if (prev && ASSESS.has(prev[1])) return true;
  const rest = lower.slice(end);
  const n1 = NEXT_WORD.exec(rest);
  if (!n1) return false;
  if (ASSESS.has(n1[1])) return true;
  if (LINKERS.has(n1[1])) {
    const n2 = NEXT_WORD.exec(rest.slice(n1[0].length));
    if (n2 && ASSESS.has(n2[1])) return true;
  }
  return false;
}

function strictOk(raw: string, lower: string, start: number, end: number): boolean {
  if (raw.length === lower.length) {
    const said = raw.slice(start, end);
    if (/[A-Z]/.test(said) && said === said.toUpperCase()) return true;
  }
  return nearAssessment(lower, start, end);
}

// Finds every course in the notice. `lenient` accepts short forms with no context
// (used when someone types just "os" into the course box).
function findCourses(
  raw: string,
  lower: string,
  lenient: boolean
): { picks: Pick[]; masked: string } {
  const hits: Pick[] = [];
  for (const mt of MATCHERS) {
    mt.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = mt.re.exec(lower)) !== null) {
      const lead = m[1] ? m[1].length : 0;
      const start = m.index + lead;
      const end = m.index + m[0].length;
      if (mt.kind === 'strict' && !lenient && !strictOk(raw, lower, start, end)) {
        continue;
      }
      hits.push({
        course: mt.course,
        lab: mt.lab,
        guess: mt.kind === 'guess',
        text: (raw.length === lower.length ? raw : lower).slice(start, end),
        start,
        end,
      });
    }
  }

  // Earliest first, longest first at the same spot. A shorter hit inside a
  // longer one is dropped ("AI" inside "AI literacy").
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const picks: Pick[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start < lastEnd) continue;
    picks.push(h);
    lastEnd = h.end;
  }

  // Blank out the course words so "Project Management" is not read as a project,
  // and the digits in "DSA 2" are not read as a date.
  let masked = lower;
  for (const p of picks) {
    masked = masked.slice(0, p.start) + ' '.repeat(p.end - p.start) + masked.slice(p.end);
  }
  return { picks, masked };
}

// Turns whatever was typed in the course box ("ml", "dbms", "cse 3521")
// into the proper course name. Returns undefined when it is not in the catalog.
export function resolveCourse(text: string): string | undefined {
  if (!text.trim()) return undefined;
  const lower = normalize(text);
  const { picks } = findCourses(text, lower, true);
  return picks.length > 0 ? picks[0].course.name : undefined;
}

// ---------- main function ----------

export function extractNotice(raw: string, now: Date = new Date()): Extracted {
  const lower = normalize(raw);
  const notes: string[] = [];

  // ===== 0. COURSE (first, so course words do not confuse the date and type) =====
  const { picks, masked } = findCourses(raw, lower, false);

  // ===== 1. DATE =====
  let work = masked; // dates already used get blanked out so they are not read twice
  const candidates: { index: number; date: Date }[] = [];

  const blank = (start: number, len: number) => {
    work = work.slice(0, start) + ' '.repeat(len) + work.slice(start + len);
  };

  // Runs one pattern over the text. Every pattern starts with the PRE group,
  // so m[1] is always the leading separator.
  const run = (re: RegExp, build: (m: RegExpExecArray) => Date | null) => {
    const source = work;
    const hits: { start: number; len: number }[] = [];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const lead = m[1] ? m[1].length : 0;
      const start = m.index + lead;
      const len = m[0].length - lead;
      const date = build(m);
      if (date) {
        candidates.push({ index: start, date });
        hits.push({ start, len });
      }
    }
    for (const h of hits) blank(h.start, h.len);
  };

  const monthKeys = Object.keys(MONTHS)
    .sort((a, b) => b.length - a.length)
    .join('|');

  // "12 Oct", "12th October 2026"
  run(
    new RegExp(
      `${PRE}(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${monthKeys})(?![a-z])(?:[,\\s]+(\\d{4}))?`,
      'gi'
    ),
    (m) =>
      resolveDate(
        parseInt(m[2], 10),
        MONTHS[m[3].toLowerCase()],
        m[4] ? parseInt(m[4], 10) : undefined,
        now
      )
  );

  // "Oct 12", "October 12th, 2026"
  run(
    new RegExp(
      `${PRE}(${monthKeys})\\s*(\\d{1,2})(?:\\s*(?:st|nd|rd|th))?(?![\\d:])(?:[,\\s]+(\\d{4}))?`,
      'gi'
    ),
    (m) =>
      resolveDate(
        parseInt(m[3], 10),
        MONTHS[m[2].toLowerCase()],
        m[4] ? parseInt(m[4], 10) : undefined,
        now
      )
  );

  // "12/11/2026" or "12/11" (day first, like in Bangladesh)
  run(
    new RegExp(`${PRE}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?(?![\\d/])`, 'g'),
    (m) => {
      const month = parseInt(m[3], 10);
      if (month < 1 || month > 12) return null;
      return resolveDate(
        parseInt(m[2], 10),
        month - 1,
        m[4] ? parseInt(m[4], 10) : undefined,
        now
      );
    }
  );

  // "12-11-2026" or "12.11.2026" (year is required, so "4-5" is never a date)
  run(
    new RegExp(`${PRE}(\\d{1,2})[-.](\\d{1,2})[-.](\\d{2,4})(?![\\d])`, 'g'),
    (m) => {
      const month = parseInt(m[3], 10);
      if (month < 1 || month > 12) return null;
      return resolveDate(parseInt(m[2], 10), month - 1, parseInt(m[4], 10), now);
    }
  );

  // day after tomorrow
  run(
    wordRegex(['day\\s+after\\s+tomorrow', 'porshu', 'parshu', 'পরশু', 'পরশুদিন']),
    () => addDays(now, 2)
  );

  // tomorrow (clear words)
  run(
    wordRegex([
      'tomorrow', 'tomorow', 'tmrw', 'tmr', 'agamikal', 'agami\\s+kal',
      'আগামীকাল', 'আগামী\\s+কাল',
    ]),
    () => addDays(now, 1)
  );

  // "kal" / "কাল" can mean yesterday or tomorrow, so we read it as tomorrow and warn
  let kalWarned = false;
  run(wordRegex(['kal', 'kalke', 'কাল', 'কালকে']), () => {
    if (!kalWarned) {
      notes.push('"kal" can mean yesterday or tomorrow. I read it as tomorrow.');
      kalWarned = true;
    }
    return addDays(now, 1);
  });

  // today
  run(
    wordRegex(['today', 'tonight', 'aj', 'ajke', 'আজ', 'আজকে']),
    () => endOfDay(now)
  );

  // "in 3 days", "after 3 days"
  run(
    new RegExp(`${PRE}(?:in|after)\\s+(\\d{1,2})\\s+days?`, 'gi'),
    (m) => addDays(now, parseInt(m[2], 10))
  );

  // "3 দিন পর", "3 din por"
  run(
    new RegExp(`${PRE}(\\d{1,2})\\s*(?:দিন|din)\\s*(?:পর|por)`, 'gi'),
    (m) => addDays(now, parseInt(m[2], 10))
  );

  // next week
  run(wordRegex(['next\\s+week', 'আগামী\\s+সপ্তাহ']), () => {
    notes.push('"Next week" is vague. I used 7 days from today.');
    return addDays(now, 7);
  });

  // weekdays: the next one coming up, never today
  run(wordRegex(Object.keys(WEEKDAYS)), (m) => {
    const target = WEEKDAYS[m[2].toLowerCase()];
    let delta = (target - now.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    const start = m.index + (m[1] ? m[1].length : 0);
    if (/(next|agami|আগামী)\s*$/.test(masked.slice(0, start))) {
      notes.push('"Next <day>" can mean two dates. I used the nearest one.');
    }
    return addDays(now, delta);
  });

  candidates.sort((a, b) => a.index - b.index);
  let dueDate: Date | undefined;
  if (candidates.length === 0) {
    notes.push('No date found. Pick one below.');
  } else {
    dueDate = candidates[0].date;
    const others = candidates.filter((c) => !sameDay(c.date, dueDate as Date));
    if (others.length > 0) {
      notes.push('Found more than one date. I used the first one, please check.');
    }
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    if (dueDate < todayStart) notes.push('That date is in the past.');
  }

  // ===== 2. COURSE (name) =====
  let course: string | undefined;
  let labHint = false;
  if (picks.length > 0) {
    const first = picks[0];
    course = first.course.name;
    labHint = first.lab;
    const names: string[] = [];
    for (const p of picks) {
      if (!names.includes(p.course.name)) names.push(p.course.name);
    }
    if (names.length > 1) {
      notes.push(`Found ${names.length} courses: ${names.join(', ')}. I used ${course}.`);
    }
    if (first.guess) {
      notes.push(`"${first.text.trim()}" could mean more than one course. I used ${course}.`);
    }
  } else {
    // Not in the catalog: fall back to a plain code like "CSE 4107"
    const courseRe = /(^|[^a-z0-9])([a-z]{2,4})[\s-]?(\d{3,4})(?![0-9])/g;
    const found: string[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = courseRe.exec(masked)) !== null) {
      if (NOT_COURSE.has(cm[2])) continue;
      const code = `${cm[2].toUpperCase()} ${cm[3]}`;
      if (!found.includes(code)) found.push(code);
    }
    if (found.length > 0) {
      course = found[0];
      if (found.length > 1) {
        notes.push(`Found ${found.length} course codes. I used ${course}.`);
      }
    } else {
      notes.push('No course found. Type it below.');
    }
  }

  // ===== 3. TYPE (the keyword that appears first wins) =====
  let type: DeadlineType | undefined;
  let bestIdx = Infinity;
  for (const t of Object.keys(TYPE_WORDS) as DeadlineType[]) {
    const words = TYPE_WORDS[t];
    if (words.length === 0) continue;
    const m = wordRegex(words, 'i').exec(masked);
    if (m) {
      const idx = m.index + (m[1] ? m[1].length : 0);
      if (idx < bestIdx) {
        bestIdx = idx;
        type = t;
      }
    }
  }
  if (!type && labHint) type = 'lab'; // matched a lab code like CSE 3522
  if (!type) notes.push('Type not found. Pick one below.');

  // ===== 4. DETAILS ("Quiz 2 · chapters 4-5") =====
  // Read from `work`, where dates are already blanked, so "12th Nov" is not "Presentation 12"
  const parts: string[] = [];

  const numMatch = new RegExp(
    `${PRE}(quiz|ct|assignment|presentation|lab|project|exam)[\\s\\-]*(?:no\\.?|#)?[\\s\\-]*(\\d{1,2})(?![\\d/.\\-])`,
    'i'
  ).exec(work);
  if (numMatch) {
    parts.push(`${LABELS[numMatch[2].toLowerCase()]} ${numMatch[3]}`);
  }

  const chapMatch = new RegExp(
    `${PRE}(chapters?|chap|ch|lectures?|lec|topics?)\\.?\\s*:?\\s*(\\d{1,2}(?:\\s*(?:-|–|to|,|&|and)\\s*\\d{1,2})*)`,
    'i'
  ).exec(work);
  if (chapMatch) {
    parts.push(`${chapMatch[2]} ${chapMatch[3]}`);
  }

  return { course, type, dueDate, details: parts.join(' · '), notes };
}
