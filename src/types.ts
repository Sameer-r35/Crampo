export type DeadlineType =
  | 'quiz'
  | 'assignment'
  | 'exam'
  | 'presentation'
  | 'project'
  | 'lab'
  | 'other';

export const DEADLINE_TYPES: DeadlineType[] = [
  'quiz',
  'assignment',
  'exam',
  'presentation',
  'project',
  'lab',
  'other',
];

export const TYPE_LABELS: Record<DeadlineType, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  exam: 'Exam',
  presentation: 'Presentation',
  project: 'Project',
  lab: 'Lab',
  other: 'Other',
};

export const TYPE_COLORS: Record<DeadlineType, string> = {
  quiz: '#7c5cff',
  assignment: '#0ea5e9',
  exam: '#ef4444',
  presentation: '#f59e0b',
  project: '#10b981',
  lab: '#ec4899',
  other: '#6b7280',
};

export interface Deadline {
  id: string;
  course: string;
  type: DeadlineType;
  title: string; // optional detail, can be empty
  dueAt: string; // ISO date string
  done: boolean;
  createdAt: string; // ISO date string
}