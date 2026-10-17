// UIU CSE course catalog.
// `name` is what Crampo shows in the list, so a lab and its theory course share one name
// (the deadline type says whether it is a Lab).
//
// aliases: safe to match anywhere in a notice (full names, common short forms)
// strict:  short forms that are also ordinary words or letters ("se", "os", "ai").
//          They only match in CAPITALS ("OS") or right next to quiz/ct/lab/exam/etc.
// guess:   ambiguous names. Crampo picks the likely course and tells you to check.
//
// Spaces inside an alias also match a hyphen or nothing ("dsa 1" matches DSA-1 and dsa1).
// A "?" makes the letter before it optional ("systems?" matches system and systems).

export interface Course {
  code: string;
  labCode?: string;
  labOnly?: boolean; // a lab with no theory course, so the type defaults to Lab
  name: string;
  aliases: string[];
  strict?: string[];
  guess?: string[];
}

export const COURSES: Course[] = [
  // ---------- Language ----------
  {
    code: 'ENG 1011',
    name: 'English I',
    aliases: ['english i', 'english 1', 'english one', 'eng i', 'eng 1'],
  },
  {
    code: 'ENG 1013',
    name: 'English II',
    aliases: ['english ii', 'english 2', 'english two', 'eng ii', 'eng 2'],
  },

  // ---------- General education ----------
  {
    code: 'SOC 2101',
    name: 'Engineering Ethics',
    aliases: [
      'engineering ethics',
      'society environment and engineering ethics',
      'society environment',
      'ethics',
      'seee',
    ],
  },
  {
    code: 'PMG 4101',
    name: 'Project Management',
    aliases: ['project management', 'pmg'],
  },
  {
    code: 'BDS 1201',
    name: 'History of Bangladesh',
    aliases: [
      'history of the emergence of bangladesh',
      'history of bangladesh',
      'emergence of bangladesh',
      'bangladesh history',
      'history',
    ],
  },
  {
    code: 'ECO 4101',
    name: 'Economics',
    aliases: ['economics', 'eco'],
  },
  {
    code: 'SOC 4101',
    name: 'Sociology',
    aliases: ['introduction to sociology', 'intro to sociology', 'sociology'],
  },
  {
    code: 'ACT 2111',
    name: 'Accounting',
    aliases: [
      'financial and managerial accounting',
      'financial accounting',
      'managerial accounting',
      'accounting',
      'fma',
    ],
  },
  {
    code: 'IPE 3401',
    name: 'Industrial Management',
    aliases: [
      'industrial and operational management',
      'industrial management',
      'operational management',
      'iom',
      'ipe',
    ],
  },
  {
    code: 'GED 4003',
    name: 'Tech Entrepreneurship',
    aliases: [
      'technology entrepreneurship',
      'tech entrepreneurship',
      'entrepreneurship',
    ],
  },
  {
    code: 'PSY 2101',
    name: 'Psychology',
    aliases: ['psychology', 'psy'],
  },
  {
    code: 'BDS 2201',
    name: 'Bangladesh Studies',
    aliases: ['bangladesh studies'],
  },
  {
    code: 'BAN 2501',
    name: 'Bangla',
    aliases: [],
    strict: ['bangla', 'বাংলা'],
  },
  {
    code: 'SOC 4301',
    name: 'Anthropology',
    aliases: ['introduction to anthropology', 'intro to anthropology', 'anthropology'],
  },
  {
    code: 'FLN 1101',
    name: 'Foreign Language',
    aliases: ['introduction to a foreign language', 'foreign language', 'fln'],
  },
  {
    code: 'SWL 4101',
    name: 'Software and Law',
    aliases: ['software and law', 'software law', 'swl'],
  },
  {
    code: 'BHV 2101',
    name: 'Behavioral Science',
    aliases: [
      'introduction to behavioral science',
      'behavioral science',
      'behavioural science',
      'behavior science',
      'bhv',
    ],
  },
  {
    code: 'URC 1101',
    name: 'Life Skill',
    aliases: ['life skill for success', 'life skills?', 'urc'],
  },
  {
    code: 'GED 1005',
    name: 'AI Literacy',
    aliases: ['ai literacy and prompt engineering', 'ai literacy', 'prompt engineering'],
  },

  // ---------- Basic sciences ----------
  {
    code: 'PHY 2105',
    labCode: 'PHY 2106',
    name: 'Physics',
    aliases: ['physics', 'phy'],
  },
  {
    code: 'BIO 3105',
    name: 'Biology',
    aliases: ['biology for engineers', 'biology', 'bio'],
  },

  // ---------- Mathematics ----------
  {
    code: 'MATH 1151',
    name: 'Fundamental Calculus',
    aliases: ['fundamental calculus', 'calculus i', 'calculus 1', 'calc i', 'calc 1'],
    guess: ['calculus', 'calc'],
  },
  {
    code: 'MATH 2183',
    name: 'Calculus and Linear Algebra',
    aliases: [
      'calculus and linear algebra',
      'linear algebra',
      'calculus ii',
      'calculus 2',
      'calc ii',
      'calc 2',
      'cla',
    ],
  },
  {
    code: 'MATH 2201',
    name: 'Coordinate Geometry',
    aliases: [
      'coordinate geometry and vector analysis',
      'coordinate geometry',
      'vector analysis',
      'geometry',
      'cgva',
    ],
  },
  {
    code: 'MATH 2205',
    name: 'Probability and Statistics',
    aliases: [
      'probability and statistics',
      'prob and stat',
      'probability',
      'statistics',
      'stats?',
    ],
  },

  // ---------- Other engineering ----------
  {
    code: 'EEE 2113',
    name: 'Electrical Circuits',
    aliases: ['electrical circuits?', 'circuits?'],
    strict: ['ec'],
  },
  {
    code: 'EEE 2123',
    labCode: 'EEE 2124',
    name: 'Electronics',
    aliases: ['electronics?'],
  },
  {
    code: 'EEE 4261',
    name: 'Green Computing',
    aliases: ['green computing'],
    strict: ['gc'],
  },

  // ---------- Programming ----------
  {
    code: 'CSE 1110',
    name: 'Intro to Computer Systems',
    aliases: [
      'introduction to computer systems',
      'intro to computer systems',
      'computer systems',
      'ics',
    ],
  },
  {
    code: 'CSE 1111',
    labCode: 'CSE 1112',
    name: 'Structured Programming',
    aliases: [
      'structured programming language',
      'structured programming',
      'c programming',
      'c language',
      'spl',
    ],
  },
  {
    code: 'CSE 1115',
    labCode: 'CSE 1116',
    name: 'Object Oriented Programming',
    aliases: ['object oriented programming', 'object oriented', 'oop'],
  },
  {
    code: 'CSE 2118',
    labOnly: true,
    name: 'Advanced OOP',
    aliases: ['advanced object oriented programming', 'advanced oop', 'aoop'],
  },
  {
    code: 'CSE 4165',
    name: 'Web Programming',
    aliases: ['web programming', 'web prog'],
    strict: ['web', 'wp'],
  },

  // ---------- Hardware ----------
  {
    code: 'CSE 1325',
    labCode: 'CSE 1326',
    name: 'Digital Logic Design',
    aliases: ['digital logic design', 'digital logic', 'dld'],
  },
  {
    code: 'CSE 3313',
    name: 'Computer Architecture',
    aliases: [
      'computer organization and architecture',
      'computer organization',
      'computer architecture',
      'architecture',
      'coa',
    ],
  },
  {
    code: 'CSE 4325',
    labCode: 'CSE 4326',
    name: 'Microprocessors',
    aliases: [
      'microprocessors? and microcontrollers?',
      'microprocessors?',
      'microcontrollers?',
      'mpmc',
    ],
  },

  // ---------- Logics and algorithms ----------
  {
    code: 'CSE 2213',
    name: 'Discrete Mathematics',
    aliases: ['discrete mathematics', 'discrete maths?', 'discrete'],
    strict: ['dm'],
  },
  {
    code: 'CSE 2215',
    labCode: 'CSE 2216',
    name: 'DSA I',
    aliases: [
      'data structures? and algorithms? i',
      'data structures? and algorithms? 1',
      'dsa i',
      'dsa 1',
    ],
    strict: ['ds'],
    guess: ['data structures? and algorithms?', 'data structures?', 'dsa'],
  },
  {
    code: 'CSE 2217',
    labCode: 'CSE 2218',
    name: 'DSA II',
    aliases: [
      'data structures? and algorithms? ii',
      'data structures? and algorithms? 2',
      'dsa ii',
      'dsa 2',
    ],
    guess: ['algorithms?', 'algos?'],
  },
  {
    code: 'CSE 2233',
    name: 'Theory of Computation',
    aliases: ['theory of computation', 'toc', 'automata'],
  },

  // ---------- Software ----------
  {
    code: 'CSE 3411',
    labCode: 'CSE 3412',
    name: 'System Analysis and Design',
    aliases: [
      'systems? analysis and design',
      'systems? analysis',
    ],
    strict: ['sad'],
  },
  {
    code: 'CSE 3421',
    labCode: 'CSE 3422',
    name: 'Software Engineering',
    aliases: ['software engineering', 'software engg', 'swe'],
    strict: ['se'],
  },

  // ---------- Systems ----------
  {
    code: 'CSE 4531',
    name: 'Computer Security',
    aliases: ['computer security', 'cyber security', 'cybersecurity', 'security'],
  },
  {
    code: 'CSE 3521',
    labCode: 'CSE 3522',
    name: 'Database Management Systems',
    aliases: ['database management systems?', 'databases?', 'dbms'],
    strict: ['db'],
  },
  {
    code: 'CSE 4509',
    labCode: 'CSE 4510',
    name: 'Operating Systems',
    aliases: ['operating systems?'],
    strict: ['os'],
  },
  {
    code: 'CSE 3711',
    labCode: 'CSE 3712',
    name: 'Computer Networks',
    aliases: ['computer networks?', 'computer networking', 'networking', 'networks?'],
    strict: ['cn'],
  },
  {
    code: 'CSE 3811',
    labCode: 'CSE 3812',
    name: 'Artificial Intelligence',
    aliases: ['artificial intelligence'],
    strict: ['ai'],
  },
  {
    code: 'CSE 4889',
    name: 'Machine Learning',
    aliases: ['machine learning', 'ml'],
  },
];
